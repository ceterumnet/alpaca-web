/**
 * Error types and classes for ALPACA API
 */

// Status: Good - Core Type Definition
// This module provides error handling that:
// - Defines standardized error types for Alpaca API
// - Provides error classification and handling
// - Maintains consistent error reporting
// - Supports error recovery strategies

// HTTP Error types
export enum ErrorType {
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  SERVER = 'SERVER',
  DEVICE = 'DEVICE',
  UNKNOWN = 'UNKNOWN'
}

// API error class with better typing and error information
export class AlpacaError extends Error {
  public type: ErrorType
  public statusCode?: number
  public deviceError?: {
    errorNumber: number
    errorMessage: string
  }
  public requestUrl: string
  public retry?: boolean

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    requestUrl: string,
    statusCode?: number,
    deviceError?: { errorNumber: number; errorMessage: string },
    retry = false
  ) {
    super(message)
    this.name = 'AlpacaError'
    this.type = type
    this.statusCode = statusCode
    this.deviceError = deviceError
    this.requestUrl = requestUrl
    this.retry = retry
  }
}
