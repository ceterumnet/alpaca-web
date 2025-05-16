import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

// Focuser-specific client with focuser-specific methods
export class FocuserClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'focuser', deviceNumber, device)
  }

  // Properties (GETters)
  async isMoving(): Promise<boolean> {
    return this.getProperty('ismoving') as Promise<boolean>
  }

  async getPosition(): Promise<number> {
    return this.getProperty('position') as Promise<number>
  }

  async getStepSize(): Promise<number> {
    return this.getProperty('stepsize') as Promise<number>
  }

  async getMaxStep(): Promise<number> {
    return this.getProperty('maxstep') as Promise<number>
  }

  async getMaxIncrement(): Promise<number> {
    return this.getProperty('maxincrement') as Promise<number>
  }

  async getTemperature(): Promise<number | null> {
    // Temperature might not be available
    try {
      const temp = await this.getProperty('temperature')
      return temp === null || typeof temp === 'undefined' ? null : (temp as number)
    } catch (error) {
      // Handle cases where temperature property might not exist (e.g. not supported by device)
      console.warn(`Error getting temperature for focuser ${this.device.name}: ${error}`)
      return null
    }
  }

  async isTempCompAvailable(): Promise<boolean> {
    return this.getProperty('tempcompavailable') as Promise<boolean>
  }

  async getTempComp(): Promise<boolean> {
    return this.getProperty('tempcomp') as Promise<boolean>
  }

  // Properties (SETters)
  async setTempComp(enable: boolean): Promise<void> {
    await this.setProperty('tempcomp', enable)
  }

  // Methods
  async halt(): Promise<void> {
    await this.put('halt')
  }

  async move(position: number): Promise<void> {
    await this.put('move', { Position: position })
  }

  // Method to get all relevant focuser properties, similar to SimplifiedFocuserPanel's needs
  async getFocuserState(): Promise<Record<string, unknown>> {
    const properties = [
      'absolute', // boolean: True if the focuser is absolute
      'ismoving', // boolean: True if focuser is moving
      'maxincrement', // int32: Maximum increment size for 'move' relative requests
      'maxstep', // int32: Maximum step position for 'move' absolute requests
      'position', // int32: Current focuser position
      'stepsize', // double: Focuser step size (microns)
      'tempcomp', // boolean: Temperature compensation state
      'tempcompavailable', // boolean: True if temp comp is available
      'temperature' // double: Focuser temperature (degrees Celsius)
    ]
    return this.getProperties(properties)
  }
}
