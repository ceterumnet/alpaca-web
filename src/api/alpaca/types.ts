// Status: Transitional - To Be Integrated
// This file contains API-related types and temporary logging that will be:
// - Integrated into the unified logging service
// - Enhanced with proper log levels and categories
// - Connected to the new debug panel UI
// - Improved with request/response tracking
// - Enhanced with performance monitoring

/**
 * Common interfaces and types for ALPACA API
 */
import { ref } from 'vue'

// Interface for request options
export interface RequestOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  logResponse?: boolean
}

// Default request options
export const DEFAULT_OPTIONS: RequestOptions = {
  timeout: 10000, // 10 seconds
  retries: 2,
  retryDelay: 1000, // 1 second
  logResponse: false
}

// Global logging state
export const logApiRequests = ref(false)

// JSON value type for ALPACA responses
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]
