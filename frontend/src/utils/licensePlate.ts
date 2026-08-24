const MOTORBIKE = 1
const LICENSE_PLATE_ERROR = 'Biển số xe không đúng định dạng.'

export function compactLicensePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export function formatLicensePlateInput(value: string, vehicleType: number) {
  const compact = compactLicensePlate(value)
  if (compact.length <= 2) return compact

  const seriesEnd = getSeriesEnd(compact, vehicleType)
  if (compact.length <= seriesEnd) return compact

  return `${compact.slice(0, seriesEnd)}-${compact.slice(seriesEnd)}`
}

export function licensePlatePlaceholder(vehicleType: number) {
  return vehicleType === MOTORBIKE ? 'VD: 59A1-12345' : 'VD: 51F-12345'
}

export function getLicensePlateError(value: string, vehicleType: number) {
  const compact = compactLicensePlate(value)
  if (!compact) return 'Vui lòng nhập biển số xe.'

  const valid = vehicleType === MOTORBIKE
    ? /^\d{2}[A-Z]\d{1,2}\d{4,5}$/.test(compact)
    : /^\d{2}[A-Z]{1,2}\d{4,5}$/.test(compact)

  return valid ? null : LICENSE_PLATE_ERROR
}

function getSeriesEnd(compact: string, vehicleType: number) {
  if (vehicleType === MOTORBIKE) {
    if (compact.length >= 10) return 5
    if (compact.length >= 4) return 4
    return compact.length
  }

  if (compact.length >= 4 && /[A-Z]/.test(compact[3])) return 4
  return 3
}
