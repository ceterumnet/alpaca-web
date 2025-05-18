import { AlpacaClient } from './base-client'
import type { Device } from '@/stores/types/device-store.types'

// Focuser-specific client with focuser-specific methods
export class FocuserClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'focuser', deviceNumber, device)
  }

  // Read-only properties
  async isMoving(): Promise<boolean | null> {
    return this.getProperty('ismoving') as Promise<boolean | null>
  }

  async getPosition(): Promise<number | null> {
    return this.getProperty('position') as Promise<number | null>
  }

  async getStepSize(): Promise<number | null> {
    // According to Alpaca spec, StepSize is GET only.
    return this.getProperty('stepsize') as Promise<number | null>
  }

  async getMaxStep(): Promise<number | null> {
    return this.getProperty('maxstep') as Promise<number | null>
  }

  async getMaxIncrement(): Promise<number | null> {
    return this.getProperty('maxincrement') as Promise<number | null>
  }

  async getTemperature(): Promise<number | null> {
    try {
      const temp = await this.getProperty('temperature')
      return typeof temp === 'number' ? temp : null
    } catch (error) {
      // If temperature is not supported, it might throw an error or return non-numeric
      console.warn(`Error reading temperature for focuser ${this.device.id}: ${error}`)
      return null // Explicitly return null if not available or error
    }
  }

  async isTempCompAvailable(): Promise<boolean | null> {
    // Some focusers might not implement this, so handle potential errors
    try {
      return (await this.getProperty('tempcompavailable')) as Promise<boolean | null>
    } catch (error) {
      console.warn(`Error checking tempcompavailable for focuser ${this.device.id}: ${error}`)
      return false // Assume not available if error
    }
  }

  async getTempComp(): Promise<boolean | null> {
    // Check availability first if possible, or handle error if direct call fails
    // For simplicity, directly call and handle potential error if device doesn't support it
    try {
      return (await this.getProperty('tempcomp')) as Promise<boolean | null>
    } catch (error) {
      console.warn(`Error reading tempcomp for focuser ${this.device.id}: ${error}`)
      return null // Or false, depending on desired default
    }
  }

  // Write methods
  async setTempComp(enable: boolean): Promise<void> {
    // Parameter name is 'TempComp'
    await this.put('tempcomp', { TempComp: enable })
  }

  async halt(): Promise<void> {
    await this.put('halt')
  }

  async move(position: number): Promise<void> {
    // Parameter name is 'Position'
    await this.put('move', { Position: position })
  }

  // Optional: Method to get all relevant focuser state in one call if desired
  // async getFocuserState(): Promise<Record<string, unknown>> {
  //   const properties = [
  //     'ismoving',
  //     'position',
  //     'stepsize',
  //     'maxstep',
  //     'maxincrement',
  //     'temperature',
  //     'tempcomp'
  //     // 'tempcompavailable' // if needed
  //   ]
  //   return this.getProperties(properties)
  // }
}
