const MOTORBIKE = 1
const LICENSE_PLATE_ERROR = 'Biển số xe không đúng định dạng. Ví dụ: 51F-123.45 (Ô tô) hoặc 59A1-123.45 (Xe máy)'

export function compactLicensePlate(value: string) {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export function formatLicensePlateInput(value: string, vehicleType: number) {
  const compact = compactLicensePlate(value)
  if (compact.length <= 2) return compact

  const seriesEnd = getSeriesEnd(compact, vehicleType)
  if (compact.length <= seriesEnd) return compact

  const prefix = compact.slice(0, seriesEnd)
  const number = compact.slice(seriesEnd)

  if (number.length <= 4) {
    return `${prefix}-${number}`
  }

  // 5 or 6 digits: format as 123.45 or 123.456 (matching Backend LicensePlatePolicy format)
  return `${prefix}-${number.slice(0, 3)}.${number.slice(3)}`
}

export function licensePlatePlaceholder(vehicleType: number) {
  return vehicleType === MOTORBIKE ? 'Ví dụ: 59A1-123.45 hoặc 59A1-2345' : 'Ví dụ: 51F-123.45 hoặc 30K-123.45'
}

export function getLicensePlateError(value: string, vehicleType: number, manufactureYear?: number | string | null) {
  const compact = compactLicensePlate(value)
  if (!compact) return 'Vui lòng nhập biển số xe.'

  if (compact.length < 6) {
    return 'Biển số xe quá ngắn. Ví dụ: 51F-123.45 (Ô tô) hoặc 59A1-123.45 (Xe máy)'
  }

  const seriesEnd = getSeriesEnd(compact, vehicleType)
  const prefix = compact.slice(0, seriesEnd)
  const numberPart = compact.slice(seriesEnd)

  if (numberPart.length < 4) {
    return 'Biển số xe chưa đủ chữ số (cần 4 hoặc 5 số). Ví dụ: 59A1-123.45 hoặc 51F-123.45'
  }

  if (numberPart.length > 6) {
    return 'Biển số xe có quá nhiều chữ số (tối đa 5 số). Ví dụ: 59A1-123.45 hoặc 51F-123.45'
  }

  // Với xe máy biển 5 số có kèm số trong seri (ví dụ: 51F1, 59A1): Bắt buộc phải có đủ 5 số
  if (vehicleType === MOTORBIKE && seriesEnd === 4 && /\d/.test(prefix[3]) && numberPart.length !== 5) {
    return 'Biển số xe máy 5 số (ví dụ: 51F1) cần đủ 5 chữ số (Ví dụ: 51F1-123.45).'
  }

  const valid = vehicleType === MOTORBIKE
    ? /^\d{2}[A-Z][A-Z0-9]{0,2}\d{4,6}$/.test(compact)
    : /^\d{2}[A-Z]{1,2}\d{4,6}$/.test(compact)

  if (!valid) return LICENSE_PLATE_ERROR

  // Cross-check: Biển 4 số chỉ được cấp cho xe sản xuất từ 2010 trở về trước
  const isFourDigits = numberPart.length === 4
  const yearNum = manufactureYear ? Number(manufactureYear) : null

  if (isFourDigits && yearNum && yearNum > 2010) {
    return `Biển số 4 số chỉ áp dụng cho xe sản xuất từ năm 2010 trở về trước. Xe sản xuất năm ${yearNum} bắt buộc dùng biển 5 số (Ví dụ: 59A1-123.45 hoặc 51F-123.45).`
  }

  return null
}

function getSeriesEnd(compact: string, vehicleType: number) {
  if (vehicleType === MOTORBIKE) {
    // 59A1... -> seriesEnd is 4 (2 digits province + 1 char series + 1 digit sub-series)
    if (compact.length >= 4 && /[A-Z]/.test(compact[2]) && /\d/.test(compact[3])) {
      return 4
    }
    // 59AA... -> seriesEnd is 4
    if (compact.length >= 4 && /[A-Z]/.test(compact[2]) && /[A-Z]/.test(compact[3])) {
      return 4
    }
    // 59A... -> seriesEnd is 3
    if (compact.length >= 3 && /[A-Z]/.test(compact[2])) {
      return 3
    }
    return Math.min(compact.length, 4)
  }

  // Car/Truck: 51F... -> 3, 51LD... -> 4
  if (compact.length >= 4 && /[A-Z]/.test(compact[2]) && /[A-Z]/.test(compact[3])) {
    return 4
  }
  if (compact.length >= 3 && /[A-Z]/.test(compact[2])) {
    return 3
  }
  return 3
}
