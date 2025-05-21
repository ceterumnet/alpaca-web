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
import log from '@/plugins/logger'
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
    const cameraInfo: Record<string, unknown> = {}

    // Stage 1: Fetch fundamental capabilities and mode discriminators
    try {
      cameraInfo['sensortype'] = await this.getProperty('sensortype')
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch sensortype', e)
    }

    let canGetCoolerPower = false
    try {
      canGetCoolerPower = (await this.getProperty('cangetcoolerpower')) as boolean
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, "Could not fetch 'cangetcoolerpower'. Assuming false.", e)
    }
    cameraInfo['cangetcoolerpower'] = canGetCoolerPower

    let canSetCCDTemperature = false
    try {
      canSetCCDTemperature = (await this.getProperty('cansetccdtemperature')) as boolean
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, "Could not fetch 'cansetccdtemperature'. Assuming false.", e)
    }
    cameraInfo['cansetccdtemperature'] = canSetCCDTemperature

    let canFastReadout = false
    try {
      canFastReadout = (await this.getProperty('canfastreadout')) as boolean
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, "Could not fetch 'canfastreadout'. Assuming false.", e)
    }
    cameraInfo['canfastreadout'] = canFastReadout

    // These capabilities are directly fetched and stored if successful, otherwise they remain undefined in cameraInfo
    try {
      cameraInfo['canabortexposure'] = await this.getProperty('canabortexposure')
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch canabortexposure', e)
    }
    try {
      cameraInfo['canasymmetricbin'] = await this.getProperty('canasymmetricbin')
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch canasymmetricbin', e)
    }
    try {
      cameraInfo['canpulseguide'] = await this.getProperty('canpulseguide')
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch canpulseguide', e)
    }
    try {
      cameraInfo['canstopexposure'] = await this.getProperty('canstopexposure')
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch canstopexposure', e)
    }

    let gainsList: string[] | number[] | undefined
    try {
      gainsList = (await this.getProperty('gains')) as string[] | number[] | undefined
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, "Could not fetch 'gains' list.", e)
    }
    if (gainsList !== undefined) cameraInfo['gains'] = gainsList

    let offsetsList: string[] | number[] | undefined
    try {
      offsetsList = (await this.getProperty('offsets')) as string[] | number[] | undefined
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, "Could not fetch 'offsets' list.", e)
    }
    if (offsetsList !== undefined) cameraInfo['offsets'] = offsetsList

    // Stage 2: Fetch truly common, non-conditional properties (minimal list based on logs)
    // Note: this.getProperties is a Promise.all of getProperty, so individual failures are possible.
    // We will fetch these individually for max resilience due to observed device quirks.

    const baseCommonProperties = [
      'binx',
      'biny',
      'camerastate',
      'cameraxsize',
      'cameraysize',
      'electronsperadu',
      'exposuremax',
      'exposuremin',
      'exposureresolution',
      'fullwellcapacity',
      'hasshutter',
      'imageready',
      'maxadu',
      'maxbinx',
      'maxbiny',
      'numx',
      'numy',
      'percentcompleted',
      'pixelsizex',
      'pixelsizey',
      'readoutmode',
      'readoutmodes',
      'sensorname',
      'startx',
      'starty',
      'subexposureduration'
      // 'lastexposureduration', 'lastexposurestarttime', 'ispulseguiding' are often state-dependent or not implemented
    ]

    for (const propName of baseCommonProperties) {
      try {
        cameraInfo[propName] = await this.getProperty(propName)
      } catch (e) {
        log.warn({ deviceIds: [this.device.id] }, `Failed to fetch base property: ${propName}`, e)
      }
    }

    // State-dependent properties (attempt fetch, but failure is common)
    try {
      cameraInfo['ispulseguiding'] = await this.getProperty('ispulseguiding')
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch ispulseguiding (may be normal if not supported/active)', e)
    }
    try {
      cameraInfo['lastexposureduration'] = await this.getProperty('lastexposureduration')
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch lastexposureduration (may be normal if no exposure taken)', e)
    }
    try {
      cameraInfo['lastexposurestarttime'] = await this.getProperty('lastexposurestarttime')
    } catch (e) {
      log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch lastexposurestarttime (may be normal if no exposure or not supported)', e)
    }

    // Stage 3: Conditional fetching based on capabilities and modes

    // Gain properties
    if (gainsList && gainsList.length > 0) {
      try {
        cameraInfo['gain'] = await this.getProperty('gain')
      } catch (error) {
        // Index
        log.warn({ deviceIds: [this.device.id] }, "Error fetching 'gain' (index) in List Mode:", error)
      }
    } else {
      try {
        cameraInfo['gain'] = await this.getProperty('gain')
      } catch (error) {
        // Value
        log.warn({ deviceIds: [this.device.id] }, "Failed to fetch 'gain' (value) in Value Mode:", error)
      }
      try {
        cameraInfo['gainmin'] = await this.getProperty('gainmin')
      } catch (error) {
        log.warn(
          { deviceIds: [this.device.id] },
          "Failed to fetch 'gainmin' in Value Mode (may be normal if gain list used or not supported):",
          error
        )
      }
      try {
        cameraInfo['gainmax'] = await this.getProperty('gainmax')
      } catch (error) {
        log.warn(
          { deviceIds: [this.device.id] },
          "Failed to fetch 'gainmax' in Value Mode (may be normal if gain list used or not supported):",
          error
        )
      }
    }

    // Offset properties
    if (offsetsList && offsetsList.length > 0) {
      try {
        cameraInfo['offset'] = await this.getProperty('offset')
      } catch (error) {
        // Index
        log.warn({ deviceIds: [this.device.id] }, "Error fetching 'offset' (index) in List Mode:", error)
      }
    } else {
      try {
        cameraInfo['offset'] = await this.getProperty('offset')
      } catch (error) {
        // Value
        log.warn({ deviceIds: [this.device.id] }, "Failed to fetch 'offset' (value) in Value Mode:", error)
      }
      try {
        cameraInfo['offsetmin'] = await this.getProperty('offsetmin')
      } catch (error) {
        log.warn(
          { deviceIds: [this.device.id] },
          "Failed to fetch 'offsetmin' in Value Mode (may be normal if offset list used or not supported):",
          error
        )
      }
      try {
        cameraInfo['offsetmax'] = await this.getProperty('offsetmax')
      } catch (error) {
        log.warn(
          { deviceIds: [this.device.id] },
          "Failed to fetch 'offsetmax' in Value Mode (may be normal if offset list used or not supported):",
          error
        )
      }
    }

    // Bayer properties if color camera (sensortype already in cameraInfo)
    const sensorTypeValue = cameraInfo['sensortype'] as number | undefined
    if (sensorTypeValue !== undefined && sensorTypeValue > 0) {
      try {
        cameraInfo['bayeroffsetx'] = await this.getProperty('bayeroffsetx')
      } catch (e) {
        log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch bayeroffsetx', e)
      }
      try {
        cameraInfo['bayeroffsety'] = await this.getProperty('bayeroffsety')
      } catch (e) {
        log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch bayeroffsety', e)
      }
    }

    // Cooler related properties
    if (canGetCoolerPower) {
      try {
        cameraInfo['coolerpower'] = await this.getProperty('coolerpower')
      } catch (e) {
        log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch coolerpower, though CanGetCoolerPower is true.', e)
      }
    }
    // HeatSinkTemperature is fetched only if cooler can be controlled or power read, to avoid the specific device error
    if (canSetCCDTemperature || canGetCoolerPower) {
      try {
        cameraInfo['heatsinktemperature'] = await this.getProperty('heatsinktemperature')
      } catch (e) {
        log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch heatsinktemperature', e)
      }
    }

    if (canSetCCDTemperature) {
      try {
        cameraInfo['ccdtemperature'] = await this.getProperty('ccdtemperature')
      } catch (e) {
        log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch ccdtemperature, though CanSetCCDTemperature is true.', e)
      }
      try {
        cameraInfo['cooleron'] = await this.getProperty('cooleron')
      } catch (e) {
        log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch cooleron, though CanSetCCDTemperature is true.', e)
      }
      try {
        cameraInfo['setccdtemperature'] = await this.getProperty('setccdtemperature')
      } catch (e) {
        // GET for current setpoint
        log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch setccdtemperature (GET setpoint), though CanSetCCDTemperature is true.', e)
      }
    }

    // Fast Readout
    if (canFastReadout) {
      try {
        cameraInfo['fastreadout'] = await this.getProperty('fastreadout')
      } catch (e) {
        log.warn({ deviceIds: [this.device.id] }, 'Failed to fetch fastreadout, though CanFastReadout is true.', e)
      }
    }

    log.debug(
      { deviceIds: [this.device.id] },
      '[CameraClient.getCameraInfo] Final fetched properties:',
      JSON.stringify(Object.keys(cameraInfo).sort())
    )
    return cameraInfo
  }
}
