// Status: Good - Core Component
// This is the camera-specific ALPACA client implementation that:
// - Extends the base AlpacaClient with camera-specific methods
// - Handles camera-specific operations (exposure, image download)
// - Provides type-safe camera property access
// - Implements proper error handling for camera operations

/**
 * Camera-specific ALPACA client
 */

import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'
import { AlpacaError, ErrorType } from './errors'

// Camera-specific client with camera-specific methods
export class CameraClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'camera', deviceNumber, device)
  }

  // Capability checks - these use GET with simple return values
  async canAbortExposure(): Promise<boolean> {
    return this.getProperty('canabortexposure') as Promise<boolean>
  }

  async canAsymmetricBin(): Promise<boolean> {
    return this.getProperty('canasymmetricbin') as Promise<boolean>
  }

  async canGetCoolerPower(): Promise<boolean> {
    return this.getProperty('cangetcoolerpower') as Promise<boolean>
  }

  async canPulseGuide(): Promise<boolean> {
    return this.getProperty('canpulseguide') as Promise<boolean>
  }

  async canSetCCDTemperature(): Promise<boolean> {
    return this.getProperty('cansetccdtemperature') as Promise<boolean>
  }

  async canStopExposure(): Promise<boolean> {
    return this.getProperty('canstopexposure') as Promise<boolean>
  }

  async canFastReadout(): Promise<boolean> {
    return this.getProperty('canfastreadout') as Promise<boolean>
  }

  /**
   * Start an exposure
   * @param duration Duration in seconds
   * @param light True for light frame, false for dark frame
   */
  async startExposure(duration: number, light: boolean = true): Promise<void> {
    // Per Alpaca spec, parameters should be named Duration and Light
    await this.put('startexposure', {
      Duration: duration,
      Light: light
    })
  }

  /**
   * Abort the current exposure
   */
  async abortExposure(): Promise<void> {
    await this.callMethod('abortexposure', [])
  }

  /**
   * Stop the current exposure and save the image data
   */
  async stopExposure(): Promise<void> {
    await this.callMethod('stopexposure', [])
  }

  /**
   * Get the image data from the camera
   * @returns ArrayBuffer containing the image data
   */
  async getImageData(): Promise<ArrayBuffer> {
    // Build the custom URL for ImageBytes
    const url = this.getDeviceUrl('imagearray')

    // Use a custom fetch with ArrayBuffer response
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new AlpacaError(`Failed to get image data: ${response.status} ${response.statusText}`, ErrorType.SERVER, url, response.status)
    }

    // Parse the response as ArrayBuffer
    const data = await response.arrayBuffer()
    return data
  }

  /**
   * Get the current state of the camera
   */
  async getCameraState(): Promise<number> {
    return this.getProperty('camerastate') as Promise<number>
  }

  /**
   * Check if image is ready
   */
  async isImageReady(): Promise<boolean> {
    return this.getProperty('imageready') as Promise<boolean>
  }

  /**
   * Set the camera gain
   */
  async setGain(value: number): Promise<void> {
    await this.setProperty('gain', value)
  }

  /**
   * Set the camera offset
   */
  async setOffset(value: number): Promise<void> {
    await this.setProperty('offset', value)
  }

  /**
   * Set the camera readout mode
   */
  async setReadoutMode(value: number): Promise<void> {
    await this.setProperty('readoutmode', value)
  }

  /**
   * Set the camera binning
   */
  async setBinning(binX: number, binY: number): Promise<void> {
    await this.setProperty('binx', binX)
    await this.setProperty('biny', binY)
  }

  /**
   * Enable or disable the camera cooler
   */
  async setCooler(enabled: boolean): Promise<void> {
    await this.setProperty('cooleron', enabled)
  }

  /**
   * Set the camera temperature setpoint
   */
  async setTemperature(temperature: number): Promise<void> {
    await this.setProperty('setccdtemperature', temperature)
  }

  /**
   * Set the camera subframe
   */
  async setSubframe(startX: number, startY: number, numX: number, numY: number): Promise<void> {
    await this.setProperty('startx', startX)
    await this.setProperty('starty', startY)
    await this.setProperty('numx', numX)
    await this.setProperty('numy', numY)
  }

  /**
   * Send a pulse guide command
   */
  async pulseGuide(direction: number, duration: number): Promise<void> {
    // Per Alpaca spec, parameters should be named Direction and Duration
    await this.put('pulseguide', {
      Direction: direction,
      Duration: duration
    })
  }

  /**
   * Get the width of the CCD camera chip
   */
  async getCameraXSize(): Promise<number> {
    return this.getProperty('cameraxsize') as Promise<number>
  }

  /**
   * Get the height of the CCD camera chip
   */
  async getCameraYSize(): Promise<number> {
    return this.getProperty('cameraysize') as Promise<number>
  }

  /**
   * Get the maximum exposure time supported by StartExposure
   */
  async getExposureMax(): Promise<number> {
    return this.getProperty('exposuremax') as Promise<number>
  }

  /**
   * Get the minimum exposure time supported by StartExposure
   */
  async getExposureMin(): Promise<number> {
    return this.getProperty('exposuremin') as Promise<number>
  }

  /**
   * Get the smallest increment in exposure time supported by StartExposure
   */
  async getExposureResolution(): Promise<number> {
    return this.getProperty('exposureresolution') as Promise<number>
  }

  /**
   * Get the maximum offset value that this camera supports
   */
  async getOffsetMax(): Promise<number> {
    return this.getProperty('offsetmax') as Promise<number>
  }

  /**
   * Get the minimum offset value that this camera supports
   */
  async getOffsetMin(): Promise<number> {
    return this.getProperty('offsetmin') as Promise<number>
  }

  /**
   * Get the camera's sub-exposure interval in seconds
   */
  async getSubExposureDuration(): Promise<number> {
    return this.getProperty('subexposureduration') as Promise<number>
  }

  /**
   * Set the camera's sub-exposure interval in seconds
   */
  async setSubExposureDuration(value: number): Promise<void> {
    await this.setProperty('subexposureduration', value)
  }

  /**
   * Get comprehensive camera information
   */
  async getCameraInfo(): Promise<Record<string, unknown>> {
    const properties = [
      'bayeroffsetx',
      'bayeroffsety',
      'binx',
      'biny',
      'camerastate',
      'cameraxsize',
      'cameraysize',
      'cameratype',
      'canabortexposure',
      'canasymmetricbin',
      'canfastreadout',
      'cangetcoolerpower',
      'canpulseguide',
      'cansetccdtemperature',
      'canstopexposure',
      'ccdtemperature',
      'cooleron',
      'coolerpower',
      'electronsperadu',
      'exposuremax',
      'exposuremin',
      'exposureresolution',
      'fastreadout',
      'fullwellcapacity',
      'gain',
      'gains',
      'gainmax',
      'gainmin',
      'hasshutter',
      'heatsinktemperature',
      'imagearray',
      'imageready',
      'ispulseguiding',
      'lastexposureduration',
      'lastexposurestarttime',
      'maxadu',
      'maxbinx',
      'maxbiny',
      'numx',
      'numy',
      'offset',
      'offsetmax',
      'offsetmin',
      'offsets',
      'percentcompleted',
      'pixelsizex',
      'pixelsizey',
      'readoutmode',
      'readoutmodes',
      'sensorname',
      'sensortype',
      'setccdtemperature',
      'startx',
      'starty',
      'subexposureduration'
    ]

    return this.getProperties(properties)
  }
}
