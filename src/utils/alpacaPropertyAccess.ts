// Status: New - Utility
// This utility provides standardized access to Alpaca device properties
// It handles property name mapping and value transformations
// and leverages existing devicestate optimizations

import { fromAscomValue } from '@/types/value-transforms'
import { useUnifiedStore } from '@/stores/UnifiedStore'

// Define store interface for type safety
interface UnifiedStoreExtended {
  getDevicePropertyOptimized: (deviceId: string, property: string) => Promise<unknown>
  getDeviceProperty: (deviceId: string, property: string) => Promise<unknown>
  fetchDeviceState: (deviceId: string, options: { cacheTtlMs: number; forceRefresh: boolean }) => Promise<Record<string, unknown> | null>
  callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
}

/**
 * Converts a camelCase property name to the proper Alpaca case format
 * Example: rightAscension -> RightAscension
 */
export function toAlpacaCase(property: string): string {
  // Convert to PascalCase for Alpaca properties
  return property.charAt(0).toUpperCase() + property.slice(1).replace(/([A-Z])/g, (match) => match)
}

/**
 * Gets a properly formatted Alpaca property from a device
 * Uses devicestate optimization if available
 * Handles case conversion and value transformation
 */
export async function getAlpacaProperty<T = unknown>(deviceId: string, property: string): Promise<T | null> {
  const store = useUnifiedStore() as unknown as UnifiedStoreExtended
  try {
    // API method names are lowercase
    const apiMethod = property.toLowerCase()

    // Use devicestate optimized property access if available
    const value = await store.getDevicePropertyOptimized(deviceId, apiMethod)
    return fromAscomValue(value) as T
  } catch (error) {
    console.error(`Error getting property ${property}:`, error)
    return null
  }
}

/**
 * Sets an Alpaca property with the correct parameter casing
 * Handles value transformation
 */
export async function setAlpacaProperty<T = unknown>(deviceId: string, property: string, value: T): Promise<boolean> {
  const store = useUnifiedStore() as unknown as UnifiedStoreExtended
  try {
    // API method names are lowercase
    const apiMethod = property.toLowerCase()
    // Parameter names need proper casing (PascalCase)
    const paramName = toAlpacaCase(property)
    // Create the parameter object with proper casing
    const param = { [paramName]: value }

    await store.callDeviceMethod(deviceId, apiMethod, [param])
    return true
  } catch (error) {
    console.error(`Error setting property ${property}:`, error)
    return false
  }
}

/**
 * Calls an Alpaca method with properly cased parameters
 */
export async function callAlpacaMethod<T = unknown, P = Record<string, unknown>>(
  deviceId: string,
  method: string,
  params: P = {} as P
): Promise<T | null> {
  const store = useUnifiedStore() as unknown as UnifiedStoreExtended
  try {
    // API method names are lowercase
    const apiMethod = method.toLowerCase()
    // Convert parameter names to proper casing (PascalCase)
    const formattedParams: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      formattedParams[toAlpacaCase(key)] = value
    }

    const result = await store.callDeviceMethod(deviceId, apiMethod, [formattedParams])
    return result as T
  } catch (error) {
    console.error(`Error calling method ${method}:`, error)
    throw error
  }
}

/**
 * Gets multiple Alpaca properties in a single batch
 * Uses devicestate if available for maximum efficiency
 * Returns an object with camelCase property names and transformed values
 */
export async function getAlpacaProperties<T = Record<string, unknown>>(deviceId: string, properties: string[]): Promise<T> {
  const store = useUnifiedStore() as unknown as UnifiedStoreExtended
  const result: Record<string, unknown> = {}

  try {
    // Try to use devicestate for efficient batch property fetching
    const deviceState = await store.fetchDeviceState(deviceId, {
      cacheTtlMs: 500, // Use a short TTL to ensure fresh data
      forceRefresh: false // Use cache if available
    })

    if (deviceState) {
      // We got device state data, extract the properties we want
      for (const property of properties) {
        const normalizedProperty = property.toLowerCase()
        if (deviceState[normalizedProperty] !== undefined) {
          result[property] = fromAscomValue(deviceState[normalizedProperty])
        } else {
          // Fall back to individual property fetch
          const value = await store.getDeviceProperty(deviceId, normalizedProperty)
          result[property] = fromAscomValue(value)
        }
      }
    } else {
      // Device state not available, fall back to individual properties
      for (const property of properties) {
        result[property] = await getAlpacaProperty(deviceId, property)
      }
    }
  } catch (error) {
    console.error(`Error getting properties for device ${deviceId}:`, error)
    // Fall back to individual property fetching if devicestate fails
    for (const property of properties) {
      result[property] = await getAlpacaProperty(deviceId, property)
    }
  }

  return result as T
}

/**
 * Checks if a device supports a specific capability
 * This is useful for conditionally enabling UI elements based on device support
 *
 * @param deviceId - The ID of the device to check
 * @param capability - The capability to check for (e.g., 'cansetccdtemperature')
 * @param defaultValue - The default value to return if the capability check fails
 * @returns A promise that resolves to true if the device supports the capability, false otherwise
 */
export async function checkDeviceCapability(deviceId: string, capability: string, defaultValue = false): Promise<boolean> {
  try {
    const value = await getAlpacaProperty<boolean>(deviceId, capability)

    // Return the capability value if it exists, otherwise return the default
    return value !== null ? value : defaultValue
  } catch (error) {
    console.error(`Error checking device capability ${capability}:`, error)
    return defaultValue
  }
}

/**
 * Gets device capabilities in a batch, more efficient than individual checks
 * Returns an object with capability names as keys and boolean values
 *
 * @param deviceId - The ID of the device to check
 * @param capabilities - Array of capability names to check
 * @returns A promise that resolves to an object with capability results
 */
export async function getDeviceCapabilities(deviceId: string, capabilities: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {}

  try {
    const properties = await getAlpacaProperties<Record<string, unknown>>(deviceId, capabilities)

    // Map the properties to boolean values
    for (const capability of capabilities) {
      const value = properties[capability]
      result[capability] = typeof value === 'boolean' ? value : false
    }
  } catch (error) {
    console.error(`Error getting device capabilities:`, error)

    // Set all capabilities to false on error
    for (const capability of capabilities) {
      result[capability] = false
    }
  }

  return result
}
