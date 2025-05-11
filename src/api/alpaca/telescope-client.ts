// Status: Good - Core Component
// This is the telescope-specific ALPACA client implementation that:
// - Extends the base AlpacaClient with telescope-specific methods
// - Handles telescope-specific operations (slewing, tracking)
// - Provides type-safe telescope property access
// - Implements proper error handling for telescope operations

/**
 * Telescope-specific ALPACA client
 */

import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

// Telescope-specific client with telescope-specific methods
export class TelescopeClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'telescope', deviceNumber, device)
  }

  // Capability checks - these use GET with simple return values
  async canFindHome(): Promise<boolean> {
    return this.getProperty('canfindhome') as Promise<boolean>
  }

  async canPark(): Promise<boolean> {
    return this.getProperty('canpark') as Promise<boolean>
  }

  async canUnpark(): Promise<boolean> {
    return this.getProperty('canunpark') as Promise<boolean>
  }

  async canSetPark(): Promise<boolean> {
    return this.getProperty('cansetpark') as Promise<boolean>
  }

  async canPulseGuide(): Promise<boolean> {
    return this.getProperty('canpulseguide') as Promise<boolean>
  }

  async canSetTracking(): Promise<boolean> {
    return this.getProperty('cansettracking') as Promise<boolean>
  }

  async canSlew(): Promise<boolean> {
    return this.getProperty('canslew') as Promise<boolean>
  }

  async canSlewAltAz(): Promise<boolean> {
    return this.getProperty('canslewaltaz') as Promise<boolean>
  }

  async canSlewAsync(): Promise<boolean> {
    return this.getProperty('canslewasync') as Promise<boolean>
  }

  async canSlewAltAzAsync(): Promise<boolean> {
    return this.getProperty('canslewaltazasync') as Promise<boolean>
  }

  async canSync(): Promise<boolean> {
    return this.getProperty('cansync') as Promise<boolean>
  }

  async canSyncAltAz(): Promise<boolean> {
    return this.getProperty('cansyncaltaz') as Promise<boolean>
  }

  async canMoveAxis(axis: number): Promise<boolean> {
    return this.get('canmoveaxis', { Axis: axis }) as Promise<boolean>
  }

  // Telescope-specific methods for parking/unparking - these use PUT with no parameters
  async park(): Promise<void> {
    await this.callMethod('park', [])
  }

  async unpark(): Promise<void> {
    await this.callMethod('unpark', [])
  }

  async setpark(): Promise<void> {
    await this.callMethod('setpark', [])
  }

  // Slew methods - these use PUT with properly named parameters
  async slewToCoordinates(rightAscension: number, declination: number): Promise<void> {
    // Per Alpaca spec, parameters should be named RightAscension and Declination
    await this.put('slewtocoordinates', {
      RightAscension: rightAscension,
      Declination: declination
    })
  }

  async slewToCoordinatesAsync(rightAscension: number, declination: number): Promise<void> {
    // Per Alpaca spec, parameters should be named RightAscension and Declination
    await this.put('slewtocoordinatesasync', {
      RightAscension: rightAscension,
      Declination: declination
    })
  }

  async slewToAltAz(altitude: number, azimuth: number): Promise<void> {
    // Per Alpaca spec, parameters should be named Altitude and Azimuth
    await this.put('slewtoaltaz', {
      Altitude: altitude,
      Azimuth: azimuth
    })
  }

  async slewToAltAzAsync(altitude: number, azimuth: number): Promise<void> {
    // Per Alpaca spec, parameters should be named Altitude and Azimuth
    await this.put('slewtoaltazasync', {
      Altitude: altitude,
      Azimuth: azimuth
    })
  }

  async slewToTarget(): Promise<void> {
    await this.callMethod('slewtotarget', [])
  }

  async slewToTargetAsync(): Promise<void> {
    await this.callMethod('slewtotargetasync', [])
  }

  // Synchronization methods - these use PUT with properly named parameters
  async syncToAltAz(altitude: number, azimuth: number): Promise<void> {
    // Per Alpaca spec, parameters should be named Altitude and Azimuth
    await this.put('synctoaltaz', {
      Altitude: altitude,
      Azimuth: azimuth
    })
  }

  async syncToCoordinates(rightAscension: number, declination: number): Promise<void> {
    // Per Alpaca spec, parameters should be named RightAscension and Declination
    await this.put('synctocoordinates', {
      RightAscension: rightAscension,
      Declination: declination
    })
  }

  async syncToTarget(): Promise<void> {
    await this.callMethod('synctotarget', [])
  }

  // Movement control methods - these use PUT with properly named parameters
  async abortSlew(): Promise<void> {
    await this.callMethod('abortslew', [])
  }

  async findHome(): Promise<void> {
    await this.callMethod('findhome', [])
  }

  async moveAxis(axis: number, rate: number): Promise<void> {
    // Per Alpaca spec, parameters should be named Axis and Rate
    await this.put('moveaxis', {
      Axis: axis,
      Rate: rate
    })
  }

  async pulseGuide(direction: number, duration: number): Promise<void> {
    // Per Alpaca spec, parameters should be named Direction and Duration
    await this.put('pulseguide', {
      Direction: direction,
      Duration: duration
    })
  }

  // Target setting - these use PUT with properly named parameters
  async setTargetRightAscension(rightAscension: number): Promise<void> {
    await this.setProperty('targetrightascension', rightAscension)
  }

  async setTargetDeclination(declination: number): Promise<void> {
    await this.setProperty('targetdeclination', declination)
  }

  // Tracking methods - these use PUT with properly named parameters
  async setTracking(enabled: boolean): Promise<void> {
    await this.setProperty('tracking', enabled)
  }

  async setTrackingRate(trackingRate: number): Promise<void> {
    await this.setProperty('trackingrate', trackingRate)
  }

  // Date/time methods - these use PUT with properly named parameters
  async setUTCDate(utcDate: Date): Promise<void> {
    await this.setProperty('utcdate', utcDate.toISOString())
  }

  // Comprehensive state - uses GET to retrieve multiple properties
  async getTelescopeState(): Promise<Record<string, unknown>> {
    const properties = [
      'alignmentmode',
      'altitude',
      'azimuth',
      'atpark',
      'athome',
      'canfindhome',
      'canpark',
      'canpulseguide',
      'cansettracking',
      'canslew',
      'canslewaltaz',
      'canslewasync',
      'canslewaltazasync',
      'declination',
      'declination_rate',
      'doesrefraction',
      'equatorialsystem',
      'focallength',
      'rightascension',
      'rightascension_rate',
      'sideofpier',
      'siderealtime',
      'siteelevation',
      'sitelatitude',
      'sitelongitude',
      'slewing',
      'tracking',
      'trackingrate',
      'trackingrates',
      'utcdate'
    ]

    return this.getProperties(properties)
  }
}
