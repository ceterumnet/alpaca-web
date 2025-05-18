import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

export class CoverCalibratorClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'covercalibrator', deviceNumber, device)
  }

  // GET Properties
  async getBrightness(): Promise<number> {
    return this.getProperty('brightness') as Promise<number>
  }

  async getCalibratorState(): Promise<number> {
    // 0=Unknown, 1=Off, 2=NotReady, 3=Ready, 4=Error
    return this.getProperty('calibratorstate') as Promise<number>
  }

  async getCoverState(): Promise<number> {
    // 0=Unknown, 1=NotPresent, 2=Closed, 3=Moving, 4=Open, 5=Error
    return this.getProperty('coverstate') as Promise<number>
  }

  async getMaxBrightness(): Promise<number> {
    return this.getProperty('maxbrightness') as Promise<number>
  }

  async getCalibratorChanging(): Promise<boolean> {
    // ICoverCalibratorV2+
    return this.getProperty('calibratorchanging') as Promise<boolean>
  }

  async getCoverMoving(): Promise<boolean> {
    // ICoverCalibratorV2+
    return this.getProperty('covermoving') as Promise<boolean>
  }

  // PUT Methods
  async calibratorOff(): Promise<void> {
    await this.put('calibratoroff')
  }

  async calibratorOn(brightness: number): Promise<void> {
    await this.put('calibratoron', { Brightness: brightness })
  }

  async closeCover(): Promise<void> {
    await this.put('closecover')
  }

  async haltCover(): Promise<void> {
    await this.put('haltcover')
  }

  async openCover(): Promise<void> {
    await this.put('opencover')
  }

  // Helper to get all relevant properties
  async getCoverCalibratorState(): Promise<Record<string, unknown>> {
    const properties = [
      'brightness',
      'calibratorstate',
      'coverstate',
      'maxbrightness',
      'calibratorchanging', // V2
      'covermoving', // V2
      // Standard properties
      'connected',
      'name',
      'description',
      'driverinfo',
      'driverversion',
      'interfaceversion',
      'supportedactions'
    ]
    return this.getProperties(properties)
  }
}
