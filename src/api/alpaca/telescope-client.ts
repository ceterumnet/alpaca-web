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
import type { RequestOptions } from '@/api/alpaca/types'
import type { TelescopeDevice } from '@/types/device.types'

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

  async canSetDeclinationRate(): Promise<boolean> {
    return this.getProperty('cansetdeclinationrate') as Promise<boolean>
  }

  async canSetGuideRates(): Promise<boolean> {
    return this.getProperty('cansetguiderates') as Promise<boolean>
  }

  async canSetPierSide(): Promise<boolean> {
    return this.getProperty('cansetpierside') as Promise<boolean>
  }

  async canSetRightAscensionRate(): Promise<boolean> {
    return this.getProperty('cansetrightascensionrate') as Promise<boolean>
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

  // Additional GET Properties
  async getApertureArea(): Promise<number> {
    return this.getProperty('aperturearea') as Promise<number>
  }

  async getApertureDiameter(): Promise<number> {
    return this.getProperty('aperturediameter') as Promise<number>
  }

  async getGuideRateDeclination(): Promise<number> {
    return this.getProperty('guideratedeclination') as Promise<number>
  }

  async getGuideRateRightAscension(): Promise<number> {
    return this.getProperty('guideraterightascension') as Promise<number>
  }

  async isPulseGuiding(): Promise<boolean> {
    return this.getProperty('ispulseguiding') as Promise<boolean>
  }

  async getSlewSettleTime(): Promise<number> {
    return this.getProperty('slewsettletime') as Promise<number>
  }

  // Additional PUT Methods for Properties
  async setGuideRateDeclination(rate: number): Promise<void> {
    await this.put('guideratedeclination', { Value: rate })
  }

  async setGuideRateRightAscension(rate: number): Promise<void> {
    await this.put('guideraterightascension', { Value: rate })
  }

  async setSlewSettleTime(time: number): Promise<void> {
    await this.put('slewsettletime', { Value: time })
  }

  // Additional GET Methods
  async getAxisRates(axis: number): Promise<object[]> {
    // Assuming axis is 0 for RA/Azm and 1 for Dec/Alt
    return this.get('axisrates', { Axis: axis }) as Promise<object[]>
  }

  async getDestinationSideOfPier(rightAscension: number, declination: number): Promise<number> {
    return this.get('destinationsideofpier', {
      RightAscension: rightAscension,
      Declination: declination
    }) as Promise<number>
  }

  // Comprehensive state - uses GET to retrieve multiple properties
  async getTelescopeState(options: RequestOptions = {}): Promise<Partial<TelescopeDevice>> {
    const propertiesToFetch = [
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
      'utcdate',
      // Added from discussion about missing properties
      'aperturearea',
      'aperturediameter',
      'guideratedeclination',
      'guideraterightascension',
      'ispulseguiding',
      'slewsettletime',
      'cansetdeclinationrate',
      'cansetguiderates',
      'cansetpierside',
      'cansetrightascensionrate'
    ]

    try {
      const fetchedProperties = await this.getProperties(propertiesToFetch, options)

      return fetchedProperties as Partial<TelescopeDevice>
    } catch (error) {
      console.error('TelescopeClient.getTelescopeState: Catastrophic failure in getProperties or subsequent logging:', error)
      return {} // Return empty object on catastrophic failure
    }
  }
}
