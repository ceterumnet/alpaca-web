// Status: Good - Core Component
// This is the base ALPACA client implementation that:
// - Uses the new type system and migration utilities
// - Provides proper error handling, retry logic, and timeout handling
// - Maintains type safety across the system
// - Supports property validation and transformation
// - Integrates with the unified logging service

/**
 * Core ALPACA API client with proper error handling,
 * request/response logging, retry logic, and timeout handling.
 */

import { ErrorType, AlpacaError } from './errors'
import { DEFAULT_OPTIONS, logApiRequests } from './types'
import type { RequestOptions } from './types'
import { toAscomValue, fromAscomValue, validatePropertyValue } from '@/types/value-transforms'
import { toUrlFormat, toParamFormat, toTsFormat } from '@/types/property-mapping'
import type { Device } from '@/types/device.types'

/**
 * Core API client for ALPACA protocol
 */
export class AlpacaClient {
  public readonly baseUrl: string
  public readonly deviceType: string
  public readonly deviceNumber: number
  public readonly clientId: number
  public readonly device: Device

  constructor(baseUrl: string, deviceType: string, deviceNumber: number, device: Device) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    this.deviceType = deviceType
    this.deviceNumber = deviceNumber
    this.clientId = Math.floor(Math.random() * 65535) // Random client ID
    this.device = device
  }

  /**
   * Get the device URL for a specific method
   */
  protected getDeviceUrl(method: string): string {
    // Use property mapping to ensure consistent URL formatting
    const lowercaseMethod = toUrlFormat(method)
    const lowercaseDeviceType = this.deviceType.toLowerCase()

    // This is the target Alpaca path, always lowercase
    const alpacaPath = `/api/v1/${lowercaseDeviceType}/${this.deviceNumber}/${lowercaseMethod}`

    // Check if the baseUrl appears to already contain an /api/v1/... structure (case-insensitive search)
    const apiV1Index = this.baseUrl.toLowerCase().indexOf('/api/v1/')

    if (apiV1Index !== -1) {
      // If baseUrl contains '/api/v1/', assume the part before it is the true base.
      // Take the substring of the original baseUrl to preserve its casing for the host/proxy part.
      const trueBase = this.baseUrl.substring(0, apiV1Index)
      return `${trueBase}${alpacaPath}`
    } else {
      // baseUrl does not contain '/api/v1/', so append the full Alpaca path.
      return `${this.baseUrl}${alpacaPath}`
    }
  }

  /**
   * Build a URL with query parameters
   */
  private buildUrl(url: string, params: Record<string, unknown> = {}): string {
    let urlWithParams: string

    // Always add ClientID to params
    params.ClientID = this.clientId

    // Handle relative URLs (starting with /)
    if (url.startsWith('/')) {
      // For relative URLs, we need to construct the full URL differently
      // We'll create a URLSearchParams object manually and append it
      const searchParams = new URLSearchParams()

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })

      // Append the search params to the URL
      const queryString = searchParams.toString()
      urlWithParams = queryString ? `${url}?${queryString}` : url

      return urlWithParams
    } else {
      // For absolute URLs, we can use the URL object
      const urlObj = new URL(url)

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.append(key, String(value))
        }
      })

      return urlObj.toString()
    }
  }

  /**
   * Log request/response information when enabled
   */
  private logRequest(method: string, url: string, params?: Record<string, unknown>, data?: unknown): void {
    if (logApiRequests.value) {
      console.group(`ALPACA API Request: ${method} ${url}`)
      if (params) console.log('Params:', params)
      if (data) console.log('Data:', data)
      console.groupEnd()
    }
  }

  /**
   * Log response information when enabled
   */
  private logResponse(url: string, response: unknown, error?: Error): void {
    if (logApiRequests.value) {
      console.group(`ALPACA API Response: ${url}`)
      if (error) {
        console.error('Error:', error)
      } else {
        console.log('Response:', response)
      }
      console.groupEnd()
    }
  }

  /**
   * Sleep function for retry delays
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Handle ALPACA HTTP response
   */
  private async handleResponse(response: Response, url: string): Promise<unknown> {
    if (!response.ok) {
      // Handle HTTP errors
      const errorType = response.status >= 500 ? ErrorType.SERVER : ErrorType.DEVICE

      try {
        // Try to parse error details from response
        const errorData = await response.json()
        if (errorData.ErrorNumber !== undefined) {
          // This is an ALPACA-formatted error
          throw new AlpacaError(
            errorData.ErrorMessage || `Error ${errorData.ErrorNumber}`,
            ErrorType.DEVICE,
            url,
            response.status,
            {
              errorNumber: errorData.ErrorNumber,
              errorMessage: errorData.ErrorMessage || ''
            },
            response.status >= 500 // Only retry server errors
          )
        }
      } catch (error) {
        // If we can't parse the error as JSON, use the response status
        if (error instanceof AlpacaError) {
          throw error
        }
        throw new AlpacaError(
          `HTTP error ${response.status}: ${response.statusText}`,
          errorType,
          url,
          response.status,
          undefined,
          response.status >= 500 // Only retry server errors
        )
      }
    }

    // Parse successful response as JSON
    try {
      const data = await response.json()

      // Check for ALPACA-style errors in the response body
      if (data.ErrorNumber && data.ErrorNumber !== 0) {
        throw new AlpacaError(
          data.ErrorMessage || `Error ${data.ErrorNumber}`,
          ErrorType.DEVICE,
          url,
          200, // HTTP status was OK but ALPACA reports an error
          {
            errorNumber: data.ErrorNumber,
            errorMessage: data.ErrorMessage || ''
          },
          false // Don't retry device errors
        )
      }

      // Transform the value from ASCOM format to TypeScript format
      const value = data.Value !== undefined ? data.Value : data
      return fromAscomValue(value)
    } catch (error) {
      if (error instanceof AlpacaError) {
        throw error
      }
      throw new AlpacaError('Failed to parse response as JSON', ErrorType.UNKNOWN, url, response.status)
    }
  }

  /**
   * Execute an HTTP request with retry logic and timeout handling
   */
  private async executeRequest(
    method: string,
    url: string,
    options: RequestOptions = DEFAULT_OPTIONS,
    params: Record<string, unknown> = {},
    body?: Record<string, unknown>
  ): Promise<unknown> {
    // For GET requests, add params to the URL
    // For PUT requests, ALL params should be in body, not in URL
    let fullUrl
    let requestBody: Record<string, unknown> | undefined = undefined

    if (method === 'GET') {
      // For GET, all params go in the URL
      fullUrl = this.buildUrl(url, params)
    } else if (method === 'PUT') {
      // For PUT, NO params in URL, all params in body (including ClientID)
      // Ensure URL doesn't have query params already
      fullUrl = url.split('?')[0] // Strip any existing query parameters

      // Include ClientID in the request body along with all other params
      requestBody = { ...params, ClientID: this.clientId }
      if (body) {
        requestBody = { ...requestBody, ...body }
      }
    } else {
      // Default case
      fullUrl = this.buildUrl(url, params)
      requestBody = body
    }

    const { timeout = DEFAULT_OPTIONS.timeout, retries = DEFAULT_OPTIONS.retries || 0, retryDelay = DEFAULT_OPTIONS.retryDelay || 0 } = options

    this.logRequest(method, fullUrl, params, requestBody)

    // Setup for fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: {
        Accept: 'application/json'
      }
    }

    // Add body for POST/PUT requests
    if (requestBody && ['POST', 'PUT'].includes(method)) {
      // Use form-urlencoded format for PUT requests per Alpaca spec
      if (method === 'PUT') {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        }

        // Convert body to form-urlencoded format
        const formData = new URLSearchParams()
        Object.entries(requestBody).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value))
          }
        })

        fetchOptions.body = formData.toString()

        // Log the form data for debugging
        if (logApiRequests.value) {
          console.log('Form data:', fetchOptions.body)
        }
      } else {
        // For other methods, use JSON
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json'
        }
        fetchOptions.body = JSON.stringify(requestBody)
      }
    }

    // Track retries
    let attemptCount = 0
    let lastError: Error | null = null

    while (attemptCount <= retries) {
      attemptCount++

      try {
        // Create AbortController for timeout handling
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        fetchOptions.signal = controller.signal

        // Execute the fetch request
        const response = await fetch(fullUrl, fetchOptions)
        clearTimeout(timeoutId)

        // Handle the response
        const data = await this.handleResponse(response, fullUrl)
        this.logResponse(fullUrl, data)
        return data
      } catch (error) {
        lastError = error as Error

        // Convert AbortError to our AlpacaError format
        if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new AlpacaError(
            `Request timed out after ${timeout}ms`,
            ErrorType.TIMEOUT,
            fullUrl,
            undefined,
            undefined,
            true // Timeouts can be retried
          )
        } else if (error instanceof TypeError && error.message.includes('NetworkError')) {
          // Convert network errors
          lastError = new AlpacaError(
            'Network error occurred',
            ErrorType.NETWORK,
            fullUrl,
            undefined,
            undefined,
            true // Network errors can be retried
          )
        }

        // Log the error
        this.logResponse(fullUrl, null, lastError)

        // Check if we should retry
        const shouldRetry = attemptCount <= retries && (lastError instanceof AlpacaError ? lastError.retry : true)

        if (shouldRetry) {
          // Wait before retrying
          await this.sleep(retryDelay)
          console.log(`Retrying request (${attemptCount}/${retries})`)
        } else {
          // No more retries, throw the last error
          break
        }
      }
    }

    // If we've exhausted all retries, throw the last error
    throw lastError
  }

  /**
   * GET method for retrieving device properties
   */
  public async get(method: string, params: Record<string, unknown> = {}, options: RequestOptions = {}): Promise<unknown> {
    const url = this.getDeviceUrl(method)
    return this.executeRequest('GET', url, options, params)
  }

  /**
   * PUT method for updating device properties
   */
  public async put(method: string, params: Record<string, unknown> = {}, options: RequestOptions = {}): Promise<unknown> {
    const url = this.getDeviceUrl(method)
    return this.executeRequest('PUT', url, options, params)
  }

  /**
   * Core method to call a device method with parameters
   */
  public async callMethod(method: string, params: unknown[] = [], options: RequestOptions = {}): Promise<unknown> {
    // URL must be lowercase according to Alpaca specification
    const url = this.getDeviceUrl(method.toLowerCase())

    // Convert array parameters to named parameters for ALPACA
    const namedParams: Record<string, unknown> = {}
    params.forEach((value, index) => {
      namedParams[`Parameters[${index}]`] = value
    })

    return this.executeRequest('PUT', url, options, namedParams)
  }

  /**
   * Get a device property value by name with validation
   */
  public async getProperty(propertyName: string, options: RequestOptions = {}): Promise<unknown> {
    // Use property mapping to ensure consistent URL formatting
    const value = await this.get(toUrlFormat(propertyName), {}, options)

    // Only validate if we have both device properties and type information
    if (this.device?.properties?.[propertyName]) {
      const expectedType = typeof this.device.properties[propertyName]
      if (!validatePropertyValue(value, expectedType)) {
        throw new AlpacaError(`Invalid property value type for ${propertyName}`, ErrorType.DEVICE, this.getDeviceUrl(propertyName))
      }
    }

    return value
  }

  /**
   * Set a device property value with validation
   */
  public async setProperty(propertyName: string, value: unknown, options: RequestOptions = {}): Promise<unknown> {
    // Transform the value to ASCOM format before sending
    const ascomValue = toAscomValue(value)

    // Use property mapping to ensure consistent parameter formatting
    const params: Record<string, unknown> = {}
    params[toParamFormat(propertyName)] = ascomValue

    // Use property mapping to ensure consistent URL formatting
    return this.put(toUrlFormat(propertyName), params, options)
  }

  /**
   * Get multiple device properties at once with validation
   */
  public async getProperties(propertyNames: string[], options: RequestOptions = {}): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {}
    // Assign the array of promises to a variable first
    const propertyPromises = propertyNames.map(async (name) => {
      const tsName = toTsFormat(name) // Get the TypeScript-formatted name for the results object key
      try {
        const value = await this.getProperty(name, options)
        results[tsName] = value
      } catch (error) {
        // Log warning and continue with other properties; this promise will resolve as undefined.
        console.warn(`Failed to get property '${name}' (mapped to '${tsName}'): ${(error as Error).message}`)
        // results[tsName] will not be set, so it will be undefined in the final object, which is correct.
      }
    })
    // Wait for all promises to settle (either resolve or be handled by the catch)
    await Promise.all(propertyPromises)
    return results
  }

  /**
   * Get device state
   */
  public async getDeviceState(): Promise<Record<string, unknown> | null> {
    try {
      const result = await this.getProperty('devicestate')
      const stateResult: Record<string, unknown> = {}

      // The devicestate response should be an array of {Name, Value} objects
      if (result && Array.isArray(result)) {
        // Convert the array of {Name, Value} objects to a flat object with lowercase keys
        for (const item of result) {
          if (item && typeof item === 'object' && 'Name' in item && 'Value' in item) {
            // Store with lowercase key for consistency with our property naming
            stateResult[item.Name.toLowerCase()] = item.Value
          }
        }
        return stateResult
      }
      // Handle case where devicestate returns direct object (non-standard but possible)
      else if (result && typeof result === 'object' && !Array.isArray(result)) {
        // Try to extract properties from the object
        for (const [key, value] of Object.entries(result)) {
          stateResult[key.toLowerCase()] = value
        }
        return Object.keys(stateResult).length > 0 ? stateResult : null
      }

      return null
    } catch (error) {
      console.warn(`Error fetching device state for ${this.deviceType} ${this.deviceNumber}:`, error)
      return null
    }
  }
}
