import { describe, it, expect } from 'vitest'
import { formatSiderealTime, formatRaNumber, formatDecNumber, parseRaString, parseDecString } from '@/utils/astroCoordinates'

describe('astroCoordinates Utilities', () => {
  describe('formatSiderealTime', () => {
    it('should format 0 to 00:00:00', () => {
      expect(formatSiderealTime(0)).toBe('00:00:00')
    })
    it('should format 12 to 12:00:00', () => {
      expect(formatSiderealTime(12)).toBe('12:00:00')
    })
    it('should format 23.999 to 23:59:56', () => {
      expect(formatSiderealTime(23.999)).toBe('23:59:56')
    })
    it('should format fractional values correctly', () => {
      expect(formatSiderealTime(6.5)).toBe('06:30:00') // 6.5 hours = 6h 30m 0s
      expect(formatSiderealTime(18.2575)).toBe('18:15:27') // 18.2575 hours = 18h 15m 27s
    })
    it('should handle undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatSiderealTime(undefined as any)).toBe('00:00:00')
    })
    it('should handle null input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatSiderealTime(null as any)).toBe('00:00:00')
    })
    it('should handle input < 0 using modulo', () => {
      expect(formatSiderealTime(-1)).toBe('23:00:00') // -1 + 24 = 23
      expect(formatSiderealTime(-25)).toBe('23:00:00') // -25 % 24 = -1 => 23
    })
    it('should handle input >= 24 using modulo', () => {
      expect(formatSiderealTime(24)).toBe('00:00:00')
      expect(formatSiderealTime(25.5)).toBe('01:30:00') // 25.5 % 24 = 1.5
    })
  })

  describe('formatRaNumber', () => {
    it('should format 0 to 00:00:00', () => {
      expect(formatRaNumber(0)).toBe('00:00:00')
    })
    it('should format 12.5 to 12:30:00', () => {
      expect(formatRaNumber(12.5)).toBe('12:30:00')
    })
    it('should format 23.999 to 23:59:56', () => {
      expect(formatRaNumber(23.999)).toBe('23:59:56')
    })
    it('should correctly handle rounding of seconds that results in 60', () => {
      // 10h 29m 59.5s = 10.49986111... hours. Rounds to 10:30:00
      expect(formatRaNumber(10.49986112)).toBe('10:30:00')
      // 23h 59m 59.5s = 23.99986111... hours. Rounds to 00:00:00 (carry over)
      expect(formatRaNumber(23.99986112)).toBe('00:00:00')
    })
    it('should handle NaN input', () => {
      expect(formatRaNumber(NaN)).toBe('00:00:00')
    })
    it('should handle undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatRaNumber(undefined as any)).toBe('00:00:00')
    })
    it('should handle null input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatRaNumber(null as any)).toBe('00:00:00')
    })
    it('should apply modulo for out of 0-24 range values', () => {
      expect(formatRaNumber(25.5)).toBe('01:30:00') // (25.5 % 24 + 24) % 24 = 1.5
      expect(formatRaNumber(-1.0)).toBe('23:00:00') // (-1.0 % 24 + 24) % 24 = 23
    })
  })

  describe('formatDecNumber', () => {
    it('should format 0 to +00:00:00', () => {
      expect(formatDecNumber(0)).toBe('+00:00:00')
    })
    it('should format 45.75 to +45:45:00', () => {
      expect(formatDecNumber(45.75)).toBe('+45:45:00')
    })
    it('should format -20.25 to -20:15:00', () => {
      expect(formatDecNumber(-20.25)).toBe('-20:15:00')
    })
    it('should format 90 to +90:00:00', () => {
      expect(formatDecNumber(90)).toBe('+90:00:00')
    })
    it('should format -90 to -90:00:00', () => {
      expect(formatDecNumber(-90)).toBe('-90:00:00')
    })
    it('should round seconds correctly (+89:59:59.5 should be +90:00:00)', () => {
      // 89d 59m 59.5s = 89.99986111...
      expect(formatDecNumber(89.99986112)).toBe('+90:00:00')
    })
    it('should round seconds correctly (-89:59:59.5 should be -90:00:00)', () => {
      expect(formatDecNumber(-89.99986112)).toBe('-90:00:00')
    })
    it('should handle NaN input', () => {
      expect(formatDecNumber(NaN)).toBe('+00:00:00')
    })
    it('should handle undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatDecNumber(undefined as any)).toBe('+00:00:00')
    })
    it('should handle null input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatDecNumber(null as any)).toBe('+00:00:00')
    })
    it('should clamp values outside +/- 90 range before formatting', () => {
      expect(formatDecNumber(95.5)).toBe('+90:00:00') // Clamped to 90
      expect(formatDecNumber(-100.0)).toBe('-90:00:00') // Clamped to -90
    })
  })

  describe('parseRaString', () => {
    it('should parse "HH:MM:SS.ss" format', () => {
      // eslint-disable-next-line no-loss-of-precision
      expect(parseRaString('10:30:15.5')).toBeCloseTo(10.504305555555555)
    })
    it('should parse "HH MM SS.ss" format', () => {
      // eslint-disable-next-line no-loss-of-precision
      expect(parseRaString('10 30 15.5')).toBeCloseTo(10.504305555555555)
    })
    it('should parse "HH:MM" format (seconds default to 0)', () => {
      expect(parseRaString('10:30')).toBeCloseTo(10.5)
    })
    it('should parse "HH MM" format (seconds default to 0)', () => {
      expect(parseRaString('10 30')).toBeCloseTo(10.5)
    })
    it('should trim whitespace', () => {
      // eslint-disable-next-line no-loss-of-precision
      expect(parseRaString('  10:30:15  ')).toBeCloseTo(10.504166666666667)
    })
    it('should throw error for invalid format (too few parts)', () => {
      expect(() => parseRaString('10')).toThrowError('Invalid RA format')
    })
    it('should throw error for invalid format (too many parts)', () => {
      expect(() => parseRaString('10:30:15:05')).toThrowError('Invalid RA format')
    })
    it('should throw error for non-numeric components', () => {
      expect(() => parseRaString('10:AA:15')).toThrowError('Invalid RA components')
    })
    it('should throw error for hours out of range [0, 24)', () => {
      expect(() => parseRaString('24:00:00')).toThrowError(/^Invalid RA: hours \(24\) out of range/)
      expect(() => parseRaString('-1:00:00')).toThrowError(/^Invalid RA: hours \(-1\) out of range/)
    })
    it('should throw error for minutes out of range [0, 60)', () => {
      expect(() => parseRaString('10:60:00')).toThrowError(/^Invalid RA: minutes \(60\) out of range/)
      expect(() => parseRaString('10:-5:00')).toThrowError(/^Invalid RA: minutes \(-5\) out of range/)
    })
    it('should throw error for seconds out of range [0, 60)', () => {
      expect(() => parseRaString('10:30:60')).toThrowError(/^Invalid RA: seconds \(60\) out of range/)
      expect(() => parseRaString('10:30:-1')).toThrowError(/^Invalid RA: seconds \(-1\) out of range/)
    })
    it('should throw error for empty string input', () => {
      expect(() => parseRaString('')).toThrowError('Invalid RA string input')
    })
    it('should throw error for null or undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => parseRaString(null as any)).toThrowError('Invalid RA string input')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => parseRaString(undefined as any)).toThrowError('Invalid RA string input')
    })
  })

  describe('parseDecString', () => {
    it('should parse "+DD:MM:SS.ss" format', () => {
      // eslint-disable-next-line no-loss-of-precision
      expect(parseDecString('+20:45:30.5')).toBeCloseTo(20.758472222222223)
    })
    it('should parse "-DD:MM:SS.ss" format', () => {
      expect(parseDecString('-05:15:10.2')).toBeCloseTo(-5.252833333333333)
    })
    it('should parse "DD:MM:SS.ss" format (defaults to positive)', () => {
      // eslint-disable-next-line no-loss-of-precision
      expect(parseDecString('20:45:30.5')).toBeCloseTo(20.758472222222223)
    })
    it('should parse "+DD MM SS.ss" format', () => {
      // eslint-disable-next-line no-loss-of-precision
      expect(parseDecString('+20 45 30.5')).toBeCloseTo(20.758472222222223)
    })
    it('should parse "-DD MM SS.ss" format', () => {
      expect(parseDecString('-05 15 10.2')).toBeCloseTo(-5.252833333333333)
    })
    it('should parse "DD MM SS.ss" format (defaults to positive)', () => {
      // eslint-disable-next-line no-loss-of-precision
      expect(parseDecString('20 45 30.5')).toBeCloseTo(20.758472222222223)
    })
    it('should parse "+DD:MM" format (seconds default to 0)', () => {
      expect(parseDecString('+20:45')).toBeCloseTo(20.75)
    })
    it('should parse "DD:MM" format (defaults to positive, seconds default to 0)', () => {
      expect(parseDecString('20:45')).toBeCloseTo(20.75)
    })
    it('should trim whitespace', () => {
      expect(parseDecString('  +20:45:30  ')).toBeCloseTo(20.758333333333333)
    })
    it('should throw error for invalid format (too few parts)', () => {
      expect(() => parseDecString('+20')).toThrowError('Invalid Dec format')
    })
    it('should throw error for invalid format (too many parts)', () => {
      expect(() => parseDecString('+20:45:30:10')).toThrowError('Invalid Dec format')
    })
    it('should throw error for non-numeric components', () => {
      expect(() => parseDecString('+20:AA:30')).toThrowError('Invalid Dec components')
    })
    it('should throw error for degrees magnitude out of range [0, 90]', () => {
      expect(() => parseDecString('+91:00:00')).toThrowError(/^Invalid Dec: degrees magnitude \(91\) out of range/)
      expect(() => parseDecString('-90:00:01')).toThrowError('Invalid Dec: value cannot be less than -90:00:00')
      expect(() => parseDecString('+90:00:01')).toThrowError('Invalid Dec: value cannot exceed +90:00:00')
    })
    it('should throw error for minutes out of range [0, 60)', () => {
      expect(() => parseDecString('+20:60:00')).toThrowError(/^Invalid Dec: minutes \(60\) out of range/)
      expect(() => parseDecString('+20:-5:00')).toThrowError(/^Invalid Dec: minutes \(-5\) out of range/)
    })
    it('should throw error for seconds out of range [0, 60)', () => {
      expect(() => parseDecString('+20:45:60')).toThrowError(/^Invalid Dec: seconds \(60\) out of range/)
      expect(() => parseDecString('+20:45:-1')).toThrowError(/^Invalid Dec: seconds \(-1\) out of range/)
    })
    it('should correctly parse +90:00:00 and -90:00:00', () => {
      expect(parseDecString('+90:00:00')).toBeCloseTo(90)
      expect(parseDecString('-90:00:00')).toBeCloseTo(-90)
      expect(parseDecString('90:00:00')).toBeCloseTo(90)
    })
    it('should throw error for empty string input', () => {
      expect(() => parseDecString('')).toThrowError('Invalid Dec string input')
    })
    it('should throw error for null or undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => parseDecString(null as any)).toThrowError('Invalid Dec string input')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => parseDecString(undefined as any)).toThrowError('Invalid Dec string input')
    })
  })
})
