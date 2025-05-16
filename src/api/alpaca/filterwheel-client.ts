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
    // Sets the name of a specific filter slot.
    // Note: The Alpaca spec for FilterWheel does not have a direct 'setname' or 'setnames' method.
    // It usually implies that if filter names are writable, they are written one by one using a method or property
    // that takes an ID (filter number) and the new name. Some devices might expose a PUT /name {Id:number, Name:string}.
    // For ASCOM compatibility, this often maps to ISwitchV2 type access for names if they are settable.
    // Let's assume a PUT to an endpoint like 'name' or a specific method if defined by device.
    // Given the common pattern, we'll model this as if it were a typical Alpaca PUT for a single item in a collection.
    // This might need adjustment based on how `alpacaPropertyAccess.ts` and `AlpacaClient` handle such cases,
    // or if devices implement this via a non-standard named method.
    // For now, we assume `callDeviceMethod` or `setProperty` is flexible enough if the device supports it.
    // A common ASCOM pattern is a writeable indexed Name(number) property.
    // The Alpaca spec for FilterWheel lists Names as string[] GET, doesn't explicitly show a SET for the whole array or individual.
    // However, ASCOM filterwheels often allow setting individual names.
    // We will create a `setFilterName` method that attempts a PUT to a `name` endpoint, which is a common way.
    await this.put('name', { FilterNumber: filterNumber, FilterName: name })
    // If this doesn't work, specific devices might require a different endpoint or method name.
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
