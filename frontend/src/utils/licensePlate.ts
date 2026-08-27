const MOTORBIKE = 1
const LICENSE_PLATE_ERROR = 'Biển số xe không đúng định dạng. Ví dụ: 51F-123.45 (Ô tô) hoặc 59A1-123.45 (Xe máy)'

export function compactLicensePlate(value: string) {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9)
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

  // 5 digits: format as 123.45 (e.g. 51F-123.45 or 59A1-123.45)
  return `${prefix}-${number.slice(0, 3)}.${number.slice(3, 5)}`
}

export function getManufactureYearError(manufactureYear?: number | string | null) {
  if (manufactureYear === undefined || manufactureYear === null || manufactureYear === '') {
    return null
  }
  const year = typeof manufactureYear === 'string' ? parseInt(manufactureYear.trim(), 10) : manufactureYear
  const currentYear = new Date().getFullYear()

  if (isNaN(year) || !/^\d{4}$/.test(String(manufactureYear).trim())) {
    return 'Năm sản xuất phải là 4 chữ số (VD: 2020).'
  }

  if (year < 1950 || year > currentYear + 1) {
    return `Năm sản xuất không hợp lệ (hợp lệ từ 1950 đến ${currentYear + 1}).`
  }

  return null
}

export function licensePlatePlaceholder(vehicleType: number, manufactureYear?: number | string | null) {
  const year = typeof manufactureYear === 'string' ? parseInt(manufactureYear, 10) : (manufactureYear ?? undefined)
  const isOldYear = year !== undefined && !isNaN(year) && year <= 2010

  if (vehicleType === MOTORBIKE) {
    return isOldYear ? 'Ví dụ: 59A1-2345 (biển 4 số) hoặc 59A1-123.45' : 'Ví dụ: 59A1-123.45'
  }
  return isOldYear ? 'Ví dụ: 51F-1234 (biển 4 số) hoặc 51F-123.45' : 'Ví dụ: 51F-123.45 hoặc 30K-123.45'
}

export function licensePlateHint(vehicleType: number, manufactureYear?: number | string | null) {
  const year = typeof manufactureYear === 'string' ? parseInt(manufactureYear, 10) : (manufactureYear ?? undefined)
  const isOldYear = year !== undefined && !isNaN(year) && year <= 2010

  if (vehicleType === MOTORBIKE) {
    return isOldYear
      ? '💡 Xe sản xuất ≤ 2010: Có thể dùng biển 4 số (59A1-2345) hoặc biển 5 số (59A1-123.45)'
      : '💡 Xe sản xuất từ 2011 đến nay: Chuẩn biển 5 số (VD: 59A1-123.45)'
  }
  return isOldYear
    ? '💡 Xe sản xuất ≤ 2010: Có thể dùng biển 4 số (51F-1234) hoặc biển 5 số (51F-123.45)'
    : '💡 Xe sản xuất từ 2011 đến nay: Chuẩn biển 5 số (VD: 51F-123.45 hoặc 30K-123.45)'
}

export function getLicensePlateError(value: string, vehicleType: number, manufactureYear?: number | string | null) {
  const compact = compactLicensePlate(value)
  if (!compact) return 'Vui lòng nhập biển số xe.'

  if (compact.length < 6) {
    return 'Biển số xe quá ngắn. Ví dụ: 51F-123.45 (Ô tô) hoặc 59A1-123.45 (Xe máy)'
  }

  const seriesEnd = getSeriesEnd(compact, vehicleType)
  const numberPart = compact.slice(seriesEnd)

  if (numberPart.length < 4) {
    return 'Biển số xe chưa đủ chữ số (cần 4 hoặc 5 số). Ví dụ: 59A1-2345 hoặc 51F-123.45'
  }

  if (numberPart.length > 5) {
    return 'Biển số xe chỉ gồm 4 hoặc 5 chữ số (tối đa 5 số). Ví dụ: 51F-123.45 hoặc 59A1-123.45'
  }

  const valid = vehicleType === MOTORBIKE
    ? /^\d{2}[A-Z][A-Z0-9]{0,2}\d{4,5}$/.test(compact)
    : /^\d{2}[A-Z]{1,2}\d{4,5}$/.test(compact)

  if (!valid) return LICENSE_PLATE_ERROR

  const yearError = getManufactureYearError(manufactureYear)
  if (yearError) return yearError

  const year = typeof manufactureYear === 'string' ? parseInt(manufactureYear, 10) : (manufactureYear ?? undefined)
  if (year !== undefined && !isNaN(year)) {
    if (year >= 2011 && numberPart.length === 4) {
      return vehicleType === MOTORBIKE
        ? 'Xe sản xuất từ năm 2011 bắt buộc sử dụng biển 5 số (VD: 51F1-123.45).'
        : 'Xe sản xuất từ năm 2011 bắt buộc sử dụng biển 5 số (VD: 51F-123.45).'
    }
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
