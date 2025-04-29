/**
 * Debug utilities for helping diagnose issues during development
 */

export const DEBUG_ENABLED = false

/**
 * Log a message with optional data if debugging is enabled
 * @param message The message to log
 * @param data Optional data to log
 */
export function debugLog(message: string, data?: unknown): void {
  if (DEBUG_ENABLED) {
    if (data !== undefined) {
      console.log(`[DEBUG] ${message}`, data)
    } else {
      console.log(`[DEBUG] ${message}`)
    }
  }
}

/**
 * Log an API request for debugging purposes
 * @param method The HTTP method
 * @param url The URL being requested
 * @param data Optional request data
 */
export function logApiRequest(method: string, url: string, data?: unknown): void {
  if (DEBUG_ENABLED) {
    console.log(`[API ${method}] ${url}`, data || '')
  }
}

/**
 * Helper to log device connection attempts
 * @param deviceId Device ID
 * @param apiUrl API URL
 * @param success Whether the connection succeeded
 */
export function logDeviceConnection(deviceId: string, apiUrl: string, success: boolean): void {
  if (DEBUG_ENABLED) {
    console.log(`[DEVICE ${success ? 'CONNECTED' : 'FAILED'}] ID: ${deviceId}, API: ${apiUrl}`)
  }
}

/**
 * Helper to encode URL paths safely
 * @param url Base URL
 * @param path Path segment to append
 * @returns Properly joined URL
 */
export function joinUrlPaths(url: string, path: string): string {
  // Remove trailing slash from url if present
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url
  // Remove leading slash from path if present
  const pathSegment = path.startsWith('/') ? path.slice(1) : path
  // Join with a slash
  return `${baseUrl}/${pathSegment}`
}
