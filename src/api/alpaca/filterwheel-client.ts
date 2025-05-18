import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

export class FilterWheelClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'filterwheel', deviceNumber, device)
  }

  // GET Properties
  async getFocusOffsets(): Promise<number[]> {
    return this.getProperty('focusoffsets') as Promise<number[]>
  }

  async getFilterNames(): Promise<string[]> {
    return this.getProperty('names') as Promise<string[]>
  }

  async getPosition(): Promise<number> {
    // Current filter slot number (0-based). -1 if unknown.
    return this.getProperty('position') as Promise<number>
  }

  // PUT Methods / Property Setters
  async setPosition(filterNumber: number): Promise<void> {
    // Commands the filter wheel to move to a specified filter slot (0-based)
    await this.put('position', { Position: filterNumber })
  }

  async setFilterName(filterNumber: number, name: string): Promise<void> {
    // Sets the name of a specified filter slot (0-based)
    // This is a common custom extension, not a standard Alpaca method.
    // The exact endpoint and payload might vary by device implementation.
    // Assuming a PUT to 'name' with { FilterNumber, Name }
    await this.put('name', { FilterNumber: filterNumber, Name: name })
  }

  // Helper to get all relevant filter wheel properties
  async getFilterWheelState(): Promise<Record<string, unknown>> {
    const properties = [
      'focusoffsets',
      'names',
      'position',
      // Standard properties
      'connected',
      'name',
      'description'
    ]
    return this.getProperties(properties)
  }
}
