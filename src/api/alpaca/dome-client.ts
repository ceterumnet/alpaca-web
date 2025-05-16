import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

export class DomeClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'dome', deviceNumber, device)
  }

  // GET Properties
  async altitude(): Promise<number> {
    return this.getProperty('altitude') as Promise<number>
  }

  async atHome(): Promise<boolean> {
    return this.getProperty('athome') as Promise<boolean>
  }

  async atPark(): Promise<boolean> {
    return this.getProperty('atpark') as Promise<boolean>
  }

  async azimuth(): Promise<number> {
    return this.getProperty('azimuth') as Promise<number>
  }

  async canFindHome(): Promise<boolean> {
    return this.getProperty('canfindhome') as Promise<boolean>
  }

  async canPark(): Promise<boolean> {
    return this.getProperty('canpark') as Promise<boolean>
  }

  async canSetAltitude(): Promise<boolean> {
    return this.getProperty('cansetaltitude') as Promise<boolean>
  }

  async canSetAzimuth(): Promise<boolean> {
    return this.getProperty('cansetazimuth') as Promise<boolean>
  }

  async canSetPark(): Promise<boolean> {
    return this.getProperty('cansetpark') as Promise<boolean>
  }

  async canSetShutter(): Promise<boolean> {
    return this.getProperty('cansetshutter') as Promise<boolean>
  }

  async canSlave(): Promise<boolean> {
    return this.getProperty('canslave') as Promise<boolean>
  }

  async canSyncAzimuth(): Promise<boolean> {
    return this.getProperty('cansyncazimuth') as Promise<boolean>
  }

  async shutterStatus(): Promise<number> {
    // 0=Open, 1=Closed, 2=Opening, 3=Closing, 4=Error
    return this.getProperty('shutterstatus') as Promise<number>
  }

  async slaved(): Promise<boolean> {
    return this.getProperty('slaved') as Promise<boolean>
  }

  async slewing(): Promise<boolean> {
    return this.getProperty('slewing') as Promise<boolean>
  }

  // PUT Methods
  async openShutter(): Promise<void> {
    await this.put('openshutter')
  }

  async closeShutter(): Promise<void> {
    await this.put('closeshutter')
  }

  async parkDome(): Promise<void> {
    await this.put('park')
  }

  async findHomeDome(): Promise<void> {
    await this.put('findhome')
  }

  async abortSlewDome(): Promise<void> {
    await this.put('abortslew')
  }

  async setPark(): Promise<void> {
    // Sets current Azimuth and Altitude as the park position
    await this.put('setpark')
  }

  async slewToAltitude(altitude: number): Promise<void> {
    await this.put('slewtoaltitude', { Altitude: altitude })
  }

  async slewToAzimuth(azimuth: number): Promise<void> {
    await this.put('slewtoazimuth', { Azimuth: azimuth })
  }

  async syncToAzimuth(azimuth: number): Promise<void> {
    await this.put('synctoazimuth', { Azimuth: azimuth })
  }

  async setSlaved(slaved: boolean): Promise<void> {
    await this.setProperty('slaved', slaved)
  }

  async getDomeState(): Promise<Record<string, unknown>> {
    const properties = [
      'altitude',
      'athome',
      'atpark',
      'azimuth',
      'canfindhome',
      'canpark',
      'cansetaltitude',
      'cansetazimuth',
      'cansetpark',
      'cansetshutter',
      'canslave',
      'cansyncazimuth',
      'shutterstatus',
      'slaved',
      'slewing',
      // Common properties from base client might also be useful to include if needed
      'connected',
      'description',
      'driverinfo',
      'driverversion',
      'name',
      'interfaceversion',
      'supportedactions'
    ]
    return this.getProperties(properties)
  }
}
