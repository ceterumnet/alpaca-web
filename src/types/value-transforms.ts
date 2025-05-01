// Status: New - Core Type Definition
// This module provides value transformation utilities that:
// - Transform values between ASCOM Alpaca and TypeScript formats
// - Handle boolean capitalization (True/False vs true/false)
// - Support numeric value validation and transformation
// - Maintain type safety across the system

/**
 * Validates a device property value against its expected type
 */
export function validatePropertyValue(value: unknown, expectedType: string): boolean {
  switch (expectedType) {
    case 'boolean':
      return typeof value === 'boolean'
    case 'number':
      return typeof value === 'number' && !isNaN(value)
    case 'string':
      return typeof value === 'string'
    case 'object':
      return typeof value === 'object' && value !== null
    case 'array':
      return Array.isArray(value)
    default:
      return true // Unknown types are considered valid
  }
}

/**
 * Transforms a value from ASCOM Alpaca format to TypeScript format
 */
export function fromAscomValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Handle ASCOM boolean strings
    if (value === 'True') return true
    if (value === 'False') return false

    // Handle ASCOM numeric strings
    const num = Number(value)
    if (!isNaN(num) && value.trim() !== '') return num

    return value
  }

  return value
}

/**
 * Transforms a value from TypeScript format to ASCOM Alpaca format
 */
export function toAscomValue(value: unknown): unknown {
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False'
  }

  if (typeof value === 'number') {
    // Ensure numbers are within valid range
    if (!isFinite(value)) {
      throw new Error(`Invalid numeric value: ${value}`)
    }
    return value.toString()
  }

  return value
}

/**
 * Validates a value against ASCOM Alpaca requirements
 */
export function validateAscomValue(value: unknown, type: string): boolean {
  switch (type.toLowerCase()) {
    case 'boolean':
      return typeof value === 'boolean' || value === 'True' || value === 'False'

    case 'number':
      if (typeof value === 'number') {
        return isFinite(value)
      }
      if (typeof value === 'string') {
        const num = Number(value)
        return !isNaN(num) && isFinite(num)
      }
      return false

    case 'string':
      return typeof value === 'string'

    case 'array':
      return Array.isArray(value)

    case 'object':
      return typeof value === 'object' && value !== null

    default:
      return true
  }
}

/**
 * Transforms an object's values from ASCOM Alpaca format to TypeScript format
 */
export function transformAscomObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: fromAscomValue(value)
    }),
    {}
  )
}

/**
 * Transforms an object's values from TypeScript format to ASCOM Alpaca format
 */
export function transformToAscomObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: toAscomValue(value)
    }),
    {}
  )
}
