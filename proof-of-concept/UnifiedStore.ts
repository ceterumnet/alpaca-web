/**
 * Simplified UnifiedStore for the proof-of-concept migration
 * This is a reduced version of the actual store to demonstrate
 * direct store usage without the adapter pattern
 */

export interface Device {
  id: string
  name: string
  type: string
  ipAddress: string
  port: number
  isConnected: boolean
  isConnecting: boolean
  isDisconnecting: boolean
  properties: Record<string, unknown>
}

class UnifiedStore {
  private _devices: Device[] = []
  private _isDiscovering: boolean = false

  // Getters
  get devices(): Device[] {
    return this._devices
  }

  get isDiscovering(): boolean {
    return this._isDiscovering
  }

  // Setters
  set isDiscovering(value: boolean) {
    this._isDiscovering = value
  }

  // Methods
  addDevice(device: Device): void {
    const existingDeviceIndex = this._devices.findIndex((d) => d.id === device.id)

    if (existingDeviceIndex >= 0) {
      // Update existing device
      this._devices[existingDeviceIndex] = { ...device }
    } else {
      // Add new device
      this._devices.push({ ...device })
    }
  }

  updateDevice(deviceId: string, properties: Partial<Device>): void {
    const deviceIndex = this._devices.findIndex((d) => d.id === deviceId)

    if (deviceIndex >= 0) {
      this._devices[deviceIndex] = {
        ...this._devices[deviceIndex],
        ...properties
      }
    }
  }

  getDeviceById(deviceId: string): Device | undefined {
    return this._devices.find((d) => d.id === deviceId)
  }

  startDiscovery(): boolean {
    this._isDiscovering = true
    return true
  }

  stopDiscovery(): boolean {
    this._isDiscovering = false
    return true
  }

  connectDevice(deviceId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const device = this.getDeviceById(deviceId)

      if (device) {
        this.updateDevice(deviceId, {
          isConnected: true,
          isConnecting: false
        })
        resolve(true)
      } else {
        resolve(false)
      }
    })
  }

  disconnectDevice(deviceId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const device = this.getDeviceById(deviceId)

      if (device) {
        this.updateDevice(deviceId, {
          isConnected: false,
          isDisconnecting: false
        })
        resolve(true)
      } else {
        resolve(false)
      }
    })
  }
}

export default UnifiedStore
