// Status: Legacy - To Be Refactored
// This module provides legacy device class definitions that:
// - Will be replaced by the new device type system
// - Currently used for backward compatibility
// - Should be migrated to use UnifiedDevice interface
// - Will be consolidated with DeviceTypes.ts
// - Will be removed once migration is complete

export abstract class Device {
  deviceType!: string
  connected!: boolean
  // This is the Alpaca server baseURL in the format http[s]//[ip|dns][:][port]/
  // baseURL: string
  // This is the Alpaca device number
  // deviceIdx: number
  idx!: number
  // This is the API base URL for the device
  apiBaseUrl?: string
  // This is the Alpaca server baseURL in the format http[s]//[ip|dns][:][port]/
  // baseURL: string
  // This is the Alpaca device number
  // deviceIdx: number
}

export class DeviceFactory {
  static createDevice<T extends Device>(deviceClass: new () => T): T {
    return new deviceClass()
  }

  // let deviceClassType = type<Device>
  static deviceTypeMap: Map<string, typeof Device> = new Map()
}
