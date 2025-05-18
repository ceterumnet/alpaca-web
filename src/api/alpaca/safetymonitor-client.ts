import type { Device } from '@/types/device.types'
import { AlpacaClient } from './base-client'

// Interface for the status object returned by fetchStatus
export interface SafetyMonitorAlpacaStatus {
  IsSafe: boolean
  // Potentially other properties if the standard Alpaca response for safetymonitor/status includes more
}

export class SafetyMonitorClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'safetymonitor', deviceNumber, device)
  }

  /**
   * Fetches the IsSafe status from the device.
   * @returns A Promise resolving to a boolean indicating if it is safe.
   */
  async getIsSafe(): Promise<boolean> {
    // Assuming getProperty is not generic and might return unknown/any
    const value = await this.getProperty('issafe')
    return value as boolean // Cast the result to boolean
  }

  /**
   * Fetches the comprehensive status for the SafetyMonitor.
   * For SafetyMonitor, this primarily involves the 'IsSafe' state.
   * @returns A Promise resolving to an object containing the safety status.
   */
  async fetchStatus(): Promise<SafetyMonitorAlpacaStatus> {
    const isSafeValue = await this.getIsSafe()
    return {
      IsSafe: isSafeValue
      // If other properties like name, description, connected were fetched here:
      // Name: await this.getProperty<string>('name'), // Example
    }
  }

  // The old getSafetyMonitorState can be removed or kept if it serves a different purpose
  // For consistency with domeActions fetching a single "state" object, fetchStatus is preferred.
}
