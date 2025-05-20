export function formatSiderealTime(sidTime: number): string {
  if (sidTime === undefined || sidTime === null) return '00:00:00'

  // Ensure value is in range 0-24
  sidTime = sidTime % 24
  if (sidTime < 0) sidTime += 24

  const hours = Math.floor(sidTime)
  const minutes = Math.floor((sidTime - hours) * 60)
  const seconds = Math.floor(((sidTime - hours) * 60 - minutes) * 60)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Parses a Right Ascension string (e.g., "HH:MM:SS.ss" or "HH MM SS.ss") into decimal hours.
 * @param raString The RA string to parse.
 * @returns Decimal hours.
 * @throws Error if the format is invalid or values are out of range.
 */
export function parseRaString(raString: string): number {
  if (!raString || typeof raString !== 'string') {
    throw new Error('Invalid RA string input. Must be a non-empty string.')
  }

  const parts = raString.trim().split(/[:\s]+/)
  if (parts.length < 2 || parts.length > 3) {
    throw new Error('Invalid RA format. Expected HH:MM:SS, HH:MM, HH MM SS, or HH MM.')
  }

  const h = parseFloat(parts[0])
  const m = parseFloat(parts[1])
  const s = parts.length === 3 ? parseFloat(parts[2]) : 0

  if (isNaN(h) || isNaN(m) || isNaN(s)) {
    throw new Error('Invalid RA components. Hours, minutes, and seconds must be numbers.')
  }
  if (h < 0 || h >= 24) {
    throw new Error(`Invalid RA: hours (${h}) out of range [0, 24).`)
  }
  if (m < 0 || m >= 60) {
    throw new Error(`Invalid RA: minutes (${m}) out of range [0, 60).`)
  }
  if (s < 0 || s >= 60) {
    throw new Error(`Invalid RA: seconds (${s}) out of range [0, 60).`)
  }

  return h + m / 60 + s / 3600
}

/**
 * Parses a Declination string (e.g., "+/-DD:MM:SS.ss" or "+/-DD MM SS.ss") into decimal degrees.
 * @param decString The Declination string to parse.
 * @returns Decimal degrees.
 * @throws Error if the format is invalid or values are out of range.
 */
export function parseDecString(decString: string): number {
  if (!decString || typeof decString !== 'string') {
    throw new Error('Invalid Dec string input. Must be a non-empty string.')
  }

  const trimmedDecString = decString.trim()
  let sign = 1
  let decValueString = trimmedDecString

  if (trimmedDecString.startsWith('+') || trimmedDecString.startsWith('-')) {
    sign = trimmedDecString.startsWith('-') ? -1 : 1
    decValueString = trimmedDecString.substring(1)
  }

  const parts = decValueString.trim().split(/[:\s]+/)
  if (parts.length < 2 || parts.length > 3) {
    throw new Error('Invalid Dec format. Expected DD:MM:SS, DD:MM, DD MM SS, or DD MM (with optional sign).')
  }

  const d = parseFloat(parts[0])
  const m = parseFloat(parts[1])
  const s = parts.length === 3 ? parseFloat(parts[2]) : 0

  if (isNaN(d) || isNaN(m) || isNaN(s)) {
    throw new Error('Invalid Dec components. Degrees, minutes, and seconds must be numbers.')
  }
  if (d < 0 || d > 90) {
    // Degrees magnitude check
    throw new Error(`Invalid Dec: degrees magnitude (${d}) out of range [0, 90].`)
  }
  if (m < 0 || m >= 60) {
    throw new Error(`Invalid Dec: minutes (${m}) out of range [0, 60).`)
  }
  if (s < 0 || s >= 60) {
    throw new Error(`Invalid Dec: seconds (${s}) out of range [0, 60).`)
  }
  if (d === 90 && (m > 0 || s > 0) && sign === 1) {
    throw new Error('Invalid Dec: value cannot exceed +90:00:00.')
  }
  if (d === 90 && (m > 0 || s > 0) && sign === -1) {
    throw new Error('Invalid Dec: value cannot be less than -90:00:00.')
  }

  return sign * (d + m / 60 + s / 3600)
}

/**
 * Formats a Right Ascension decimal hours value into an "HH:MM:SS" string.
 * @param raDecimalHours The RA value in decimal hours.
 * @returns Formatted RA string "HH:MM:SS".
 */
export function formatRaNumber(raDecimalHours: number): string {
  if (raDecimalHours === undefined || raDecimalHours === null || isNaN(raDecimalHours)) {
    return '00:00:00' // Or throw error, depending on desired strictness
  }
  // Ensure value is positive and within 0-24 range for safety, though not strictly required by original logic for display
  const value = ((raDecimalHours % 24) + 24) % 24

  const hours = Math.floor(value)
  const minutes = Math.floor((value - hours) * 60)
  // Original logic used Math.round for seconds
  const seconds = Math.round(((value - hours) * 60 - minutes) * 60)

  // Handle case where rounding seconds might make it 60
  if (seconds === 60) {
    const tempDate = new Date(0)
    tempDate.setUTCHours(hours, minutes + 1, 0) // Add a minute, seconds become 0
    return `${String(tempDate.getUTCHours()).padStart(2, '0')}:${String(tempDate.getUTCMinutes()).padStart(2, '0')}:${String(tempDate.getUTCSeconds()).padStart(2, '0')}`
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Formats a Declination decimal degrees value into a "+/-DD:MM:SS" string.
 * @param decDecimalDegrees The Declination value in decimal degrees.
 * @returns Formatted Declination string "+/-DD:MM:SS".
 */
export function formatDecNumber(decDecimalDegrees: number): string {
  if (decDecimalDegrees === undefined || decDecimalDegrees === null || isNaN(decDecimalDegrees)) {
    return '+00:00:00' // Or throw error
  }

  const sign = decDecimalDegrees >= 0 ? '+' : '-'
  const absDec = Math.abs(decDecimalDegrees)

  // Clamp to 90 degrees for safety, though original didn't explicitly do this for display beyond sign logic
  const clampedAbsDec = Math.min(absDec, 90)

  const degrees = Math.floor(clampedAbsDec)
  const minutes = Math.floor((clampedAbsDec - degrees) * 60)
  // Original logic used Math.round for seconds
  const seconds = Math.round(((clampedAbsDec - degrees) * 60 - minutes) * 60)

  // Handle case where rounding seconds might make it 60
  if (seconds === 60) {
    // For Dec, if degrees is 90 (or -90), adding a minute isn't quite right, it should stay 90:00:00.
    // However, the original logic didn't have this specific edge case correction for 90 deg + rounding.
    // For simplicity and matching original, if seconds round to 60, increment minute and reset seconds.
    // If this leads to minute 60, increment degree (if not 90) and reset minute.
    // This can get complex if not handled carefully. A simpler approach is to recalculate if seconds is 60
    // from a slightly adjusted value or simply cap seconds at 59 if rounding made it 60.
    // Given the original uses Math.round directly, we replicate that behavior and then handle the seconds === 60 case.

    let newDegrees = degrees
    let newMinutes = minutes
    let newSeconds = seconds

    if (newSeconds === 60) {
      newSeconds = 0
      newMinutes += 1
    }
    if (newMinutes === 60) {
      newMinutes = 0
      if (newDegrees < 90) {
        // Only increment if not already at pole
        newDegrees += 1
      } else {
        // At 90 degrees, minutes and seconds must be 0 if seconds rounded up
        // This ensures we don't show something like +90:00:60 or +90:01:00
        newMinutes = 0
        newSeconds = 0
      }
    }
    return `${sign}${String(newDegrees).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`
  }

  return `${sign}${String(degrees).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
