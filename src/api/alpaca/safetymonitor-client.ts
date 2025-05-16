import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

export class SafetyMonitorClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'safetymonitor', deviceNumber, device)
  }

  // GET Properties
  async isSafe(): Promise<boolean> {
    return this.getProperty('issafe') as Promise<boolean>
  }

  // Helper to get all relevant properties (though IsSafe is the main one)
  async getSafetyMonitorState(): Promise<Record<string, unknown>> {
    const properties = [
      'issafe',
      // Standard properties
      'connected',
      'name',
      'description'
    ]
    return this.getProperties(properties)
  }
}
