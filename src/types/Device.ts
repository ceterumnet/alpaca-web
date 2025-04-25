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
