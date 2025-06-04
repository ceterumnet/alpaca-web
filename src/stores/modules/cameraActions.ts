/**
 * Camera Actions Module
 *
 * Provides functionality for interacting with camera devices
 */

import log from '@/plugins/logger'
import { AlpacaClient as BaseAlpacaClient } from '@/api/alpaca/base-client'
import type { UnifiedStoreType } from '../UnifiedStore'
import type { CameraClient } from '@/api/alpaca/camera-client'

// Define an interface for the actions specific to the camera module
// This helps in typing 'this' context for actions if needed, and for clear definition of available actions
export interface CameraActionsSignatures {
  startCameraExposure: (deviceId: string, exposureTime: number, isLight?: boolean) => Promise<boolean>
  trackExposureProgress: (deviceId: string, exposureTime: number) => void
  handleExposureComplete: (deviceId: string) => Promise<void>
  abortCameraExposure: (deviceId: string) => Promise<boolean>
  setCameraCooler: (deviceId: string, enabled: boolean, targetTemperature?: number) => Promise<boolean>
  setCameraBinning: (deviceId: string, binX: number, binY: number) => Promise<boolean>
  fetchCameraProperties: (deviceId: string) => Promise<boolean>
  startCameraPropertyPolling: (deviceId: string) => void
  stopCameraPropertyPolling: (deviceId: string) => void
  setPropertyPollingInterval: (deviceId: string, intervalMs: number) => void
  setPreferredImageFormat: (deviceId: string, format: 'binary' | 'json') => void
  cleanupDeviceState: (deviceId: string) => void
  handleDeviceDisconnected: (deviceId: string) => void
  handleDeviceConnected: (deviceId: string) => void

  // New actions based on audit and gain/offset discussion
  setCameraGain: (deviceId: string, desiredGain: number | string) => Promise<void>
  setCameraOffset: (deviceId: string, desiredOffset: number | string) => Promise<void>
  setCameraReadoutMode: (deviceId: string, modeIndex: number) => Promise<void> // Alpaca expects index
  setCameraSubframe: (deviceId: string, startX: number, startY: number, numX: number, numY: number) => Promise<void>
  stopCameraExposure: (deviceId: string, earlyImageReadout?: boolean) => Promise<void> // earlyImageReadout for consistency with potential future client changes
  pulseGuideCamera: (deviceId: string, direction: number, duration: number) => Promise<void>
  setCameraSubExposureDuration: (deviceId: string, duration: number) => Promise<void>
  // getCameraSubExposureDuration might be covered by fetchCameraProperties if subexposureduration is polled
}

export function createCameraActions(): { actions: CameraActionsSignatures } {
  return {
    actions: {
      async startCameraExposure(this: UnifiedStoreType, deviceId: string, exposureTime: number, isLight: boolean = true): Promise<boolean> {
        const device = this.getDeviceById(deviceId)
        if (!device) {
          log.error({ deviceIds: [deviceId] }, `[UnifiedStore/cameraActions] Device ${deviceId} not found for startCameraExposure`)
          return false
        }

        if (device.type !== 'camera') {
          log.error({ deviceIds: [deviceId] }, `[UnifiedStore/cameraActions] Device ${deviceId} is not a camera for startCameraExposure`)
          // This case should ideally not happen if called correctly, but good to have a guard.
          return false
        }

        const client = this.getDeviceClient(deviceId) // Explicitly get client to check before callDeviceMethod
        if (!client) {
          log.error({ deviceIds: [deviceId] }, `[UnifiedStore/cameraActions] No client available for device ${deviceId} for startCameraExposure`)
          return false
        }

        log.debug({ deviceIds: [deviceId] }, `[UnifiedStore/cameraActions] Starting exposure on camera ${deviceId}:`, {
          exposureTime,
          isLight
        })

        try {
          // Update device properties to show exposure in progress
          log.debug({ deviceIds: [deviceId] }, `[UnifiedStore/cameraActions] Updating device properties to show exposure in progress`)
          this.updateDeviceProperties(deviceId, {
            isExposing: true,
            exposureProgress: 0,
            exposureStartTime: Date.now(), // Set exposureStartTime
            // exposureTime: exposureTime, // exposureTime is already a property from capabilities/settings
            cameraState: 2 // CameraStates.Exposing
          })

          log.debug({ deviceIds: [deviceId] }, `[UnifiedStore/cameraActions] Attempting to call startexposure via API`)

          const params = {
            Duration: exposureTime,
            Light: isLight,
            ClientID: 1,
            ClientTransactionID: Math.floor(Math.random() * 9000000) + 1000000
          }

          await client.put('startexposure', params)

          // Emit exposure started event AFTER successful API call
          log.debug({ deviceIds: [deviceId] }, `[UnifiedStore/cameraActions] Emitting cameraExposureStarted event`)
          this._emitEvent({
            type: 'cameraExposureStarted',
            deviceId,
            duration: exposureTime,
            isLight: isLight
          })

          // Start a progress tracking timer
          log.debug({ deviceIds: [deviceId] }, `[UnifiedStore/cameraActions] Starting exposure progress tracking`)
          this.trackExposureProgress(deviceId, exposureTime)

          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[UnifiedStore/cameraActions] Error starting exposure on camera ${deviceId}:`, error)

          // Update device state to show error
          this.updateDeviceProperties(deviceId, {
            isExposing: false,
            exposureProgress: 0,
            cameraState: 0 // CameraStates.Idle
          })
          // Do NOT re-throw the error, return false as per expected behavior for tests
          return false
        }
      },

      trackExposureProgress(this: UnifiedStoreType, deviceId: string, exposureTime: number): void {
        const device = this.getDeviceById(deviceId)
        if (!device) {
          log.error({ deviceIds: [deviceId] }, `[UnifiedStore/cameraActions] Device ${deviceId} not found for trackExposureProgress`) // Restored original log
          return
        }

        const initialStartTime = device.properties.exposureStartTime as number | undefined
        if (typeof initialStartTime !== 'number') {
          log.error(
            { deviceIds: [deviceId] },
            `[UnifiedStore/cameraActions] exposureStartTime not found or invalid for device ${deviceId}. Cannot track progress accurately.`
          )
          return
        }

        // Ensure the isExposing property is set when tracking starts
        this.updateDeviceProperties(deviceId, {
          isExposing: true,
          exposureProgress: 0
        })

        // Config options - these should eventually move to user settings
        const MAX_WAIT_TIME = 300000 // 5 minutes max wait for image
        const POLLING_INTERVAL = 500 // Check every 500ms

        // Track if we're in the post-exposure phase
        let isPollingForImage = false
        let lastKnownProgress = 0
        // Use initialStartTime from device properties
        const startTimeForCalculations = initialStartTime
        const durationMs = exposureTime * 1000 // Convert exposureTime (seconds) to milliseconds

        const progressTimer = setInterval(async () => {
          const device = this.getDeviceById(deviceId) // Re-fetch device in each interval
          if (!device) {
            log.error(
              { deviceIds: [deviceId] },
              `[UnifiedStore/cameraActions] Device ${deviceId} not found during exposure tracking interval. Clearing timer.`
            )
            clearInterval(progressTimer)
            return
          }

          try {
            const client = this.getDeviceClient(deviceId)
            const now = Date.now()
            const elapsedTime = now - startTimeForCalculations // Use the fetched startTime

            // Check if we've exceeded the maximum wait time
            if (elapsedTime > MAX_WAIT_TIME) {
              log.error({ deviceIds: [deviceId] }, `Exposure for ${deviceId} exceeded maximum wait time (${MAX_WAIT_TIME}ms), aborting`)
              clearInterval(progressTimer)
              this.updateDeviceProperties(deviceId, {
                isExposing: false,
                exposureProgress: 100,
                cameraState: 0 // Idle
              })
              this._emitEvent({
                type: 'cameraExposureFailed',
                deviceId,
                error: 'Exposure timed out waiting for image'
              })
              return
            }

            if (client) {
              // First, check the camera state to get accurate status
              try {
                // Assuming AlpacaClient.getProperty throws on error and returns direct value on success
                const cameraState = (await client.getProperty('camerastate')) as number | undefined
                log.debug({ deviceIds: [deviceId] }, `Camera ${deviceId} state: ${cameraState}`)

                // Update the camera state in our store
                this.updateDeviceProperties(deviceId, {
                  cameraState,
                  // Always update isExposing based on camera state
                  isExposing: cameraState !== 0 // True if camera is not idle
                })

                // Common ASCOM camera states:
                // 0 = Idle (cameraIdle)
                // 1 = Waiting (cameraWaiting)
                // 2 = Exposing (cameraExposing)
                // 3 = Reading (cameraReading)
                // 4 = Download (cameraDownload)
                // 5 = Error (cameraError)

                if (cameraState === 0) {
                  // Camera is idle
                  if (isPollingForImage) {
                    // We were polling for an image and now camera is idle - final check for imageready
                    const imageReady = (await client.getProperty('imageready')) as boolean | undefined
                    if (imageReady) {
                      log.debug({ deviceIds: [deviceId] }, `Camera ${deviceId} is idle and image is ready`)
                      clearInterval(progressTimer)
                      await this.handleExposureComplete(deviceId)
                      return
                    } else {
                      log.warn({ deviceIds: [deviceId] }, `Camera ${deviceId} is idle but image not ready, possible error`)
                      // Continue polling a bit longer, might be transitional state
                    }
                  } else if (elapsedTime > durationMs) {
                    // Camera is idle and exposure time has passed, start polling for image
                    isPollingForImage = true
                    log.debug({ deviceIds: [deviceId] }, `Exposure time complete, starting to poll for image ready`)
                  }
                } else if (cameraState === 2) {
                  // Camera is exposing
                  // Calculate progress based on exposure time
                  const progress = Math.min(100, Math.round((elapsedTime / durationMs) * 100)) // Use durationMs
                  lastKnownProgress = progress

                  // Update properties with current progress
                  this.updateDeviceProperties(deviceId, {
                    isExposing: true,
                    exposureProgress: progress
                  })

                  // Emit progress event
                  this._emitEvent({
                    type: 'cameraExposureChanged',
                    deviceId,
                    percentComplete: progress
                  })
                } else if (cameraState === 3 || cameraState === 4) {
                  // Reading or downloading
                  // Camera is reading/downloading - we're past exposure phase
                  isPollingForImage = true

                  // Set progress to 100% for exposure, but indicate we're now reading/downloading
                  this.updateDeviceProperties(deviceId, {
                    isExposing: true, // Still busy, though not technically exposing
                    exposureProgress: 100
                  })

                  // Check if image is ready
                  const imageReadyAfterRead = (await client.getProperty('imageready')) as boolean | undefined
                  if (imageReadyAfterRead) {
                    log.debug({ deviceIds: [deviceId] }, `Camera ${deviceId} reports image is ready while in state ${cameraState}`)
                    clearInterval(progressTimer)
                    await this.handleExposureComplete(deviceId)
                    return
                  }
                } else if (cameraState === 5) {
                  // Error
                  log.error({ deviceIds: [deviceId] }, `Camera ${deviceId} reported error state, aborting exposure tracking`)
                  clearInterval(progressTimer)
                  this.updateDeviceProperties(deviceId, {
                    isExposing: false,
                    exposureProgress: 0,
                    cameraState: 5 // Error
                  })
                  this._emitEvent({
                    type: 'cameraExposureFailed',
                    deviceId,
                    error: 'Camera reported error state'
                  })
                  return
                }

                // If we're now polling for image, always check imageready
                if (isPollingForImage) {
                  const imageReadyPolling = (await client.getProperty('imageready')) as boolean | undefined
                  log.debug({ deviceIds: [deviceId] }, `Image ready polling check: ${imageReadyPolling}`)
                  if (imageReadyPolling) {
                    log.debug({ deviceIds: [deviceId] }, `Camera ${deviceId} reports image is ready during polling`)
                    clearInterval(progressTimer)
                    await this.handleExposureComplete(deviceId)
                    return
                  }
                }
              } catch (error) {
                log.error({ deviceIds: [deviceId] }, `Error checking camera state for ${deviceId}:`, error)
                // Fall back to time-based tracking
                fallbackToTimeBasedTracking(elapsedTime, durationMs)
              }
            } else {
              log.warn({ deviceIds: [deviceId] }, `No client available for device ${deviceId}, using time-based tracking only`)
              fallbackToTimeBasedTracking(elapsedTime, durationMs)
            }
          } catch (error) {
            log.error({ deviceIds: [deviceId] }, `Error tracking exposure progress for camera ${deviceId}:`, error)
          }
        }, POLLING_INTERVAL)

        // Helper function for time-based tracking fallback
        const fallbackToTimeBasedTracking = (elapsedTime: number, duration: number) => {
          // If we're already in the post-exposure phase, we need to poll regularly
          if (isPollingForImage || elapsedTime > duration) {
            isPollingForImage = true

            // We don't know if the image is ready, so keep the progress at 100%
            if (lastKnownProgress < 100) {
              lastKnownProgress = 100
              this.updateDeviceProperties(deviceId, {
                exposureProgress: 100,
                isExposing: true // Ensure we keep this flag set until we're done
              })
            }

            // If we've been polling too long, give up eventually
            if (elapsedTime > duration + 60000) {
              // 1 minute after expected completion
              log.warn({ deviceIds: [deviceId] }, `Polling for image ready timed out for ${deviceId}`)
              clearInterval(progressTimer)
              this.updateDeviceProperties(deviceId, {
                isExposing: false,
                cameraState: 0 // Set to idle
              })
              this._emitEvent({
                type: 'cameraExposureFailed',
                deviceId,
                error: 'Timed out waiting for image ready'
              })
            }
          } else {
            // Calculate progress based on elapsed time
            const progress = Math.min(100, Math.round((elapsedTime / duration) * 100))

            // Only update if progress has changed
            if (progress !== lastKnownProgress) {
              lastKnownProgress = progress
              log.debug(
                { deviceIds: [deviceId] },
                `Exposure progress update for ${deviceId}: ${progress}% (elapsed: ${elapsedTime}ms, duration: ${duration}ms)`
              )

              // Update the device properties with the current progress
              this.updateDeviceProperties(deviceId, {
                exposureProgress: progress,
                isExposing: true // Make sure this is set throughout the exposure
              })

              // Emit progress event
              this._emitEvent({
                type: 'cameraExposureChanged',
                deviceId,
                percentComplete: progress
              })
            }
          }
        }
      },

      async handleExposureComplete(this: UnifiedStoreType, deviceId: string): Promise<void> {
        log.debug({ deviceIds: [deviceId] }, `Handling exposure completion for camera ${deviceId}`)

        try {
          // Update state to show exposure complete but image not downloaded yet
          this.updateDeviceProperties(deviceId, {
            isExposing: false,
            exposureProgress: 100,
            imageReady: true,
            cameraState: 0 // CameraStates.Idle
          })

          // Try to download the image data
          const client = this.getDeviceClient(deviceId)
          if (client) {
            try {
              log.debug({ deviceIds: [deviceId] }, `Attempting to download image data for camera ${deviceId}`)

              // First check if the image is really ready
              let imageReady = false
              try {
                imageReady = (await client.getProperty('imageready')) as boolean
                log.debug({ deviceIds: [deviceId] }, `Camera ${deviceId} imageready check: ${imageReady}`)
              } catch (readyError) {
                log.warn({ deviceIds: [deviceId] }, `Error checking if image is ready: ${readyError}`)
                // Assume it's ready since we've reached this point
                imageReady = true
              }

              if (imageReady) {
                // Get device to determine preferred image format
                const device = this.getDeviceById(deviceId)

                if (!device) {
                  const errorMessage = `Device ${deviceId} not found after imageready check`
                  log.error({ deviceIds: [deviceId] }, errorMessage)
                  // Update device properties to a consistent state
                  this.updateDeviceProperties(deviceId, {
                    isExposing: false,
                    exposureProgress: 100, // Progress was 100 as imageready was true
                    imageReady: false, // Set to false as device is gone, can't confirm
                    cameraState: 0 // CameraStates.Idle
                  })
                  this._emitEvent({
                    type: 'cameraExposureComplete',
                    deviceId,
                    error: errorMessage
                  })
                  return // Stop further processing
                }

                const properties = device.properties || {} // device is now guaranteed
                const preferredFormat = (properties.preferredImageFormat as string) || 'binary'

                log.debug({ deviceIds: [deviceId] }, `Retrieving image data in ${preferredFormat} format`)

                let imageData: ArrayBuffer | null = null

                try {
                  if (client) {
                    // Access base client's protected methods safely by casting
                    const baseClient = client as BaseAlpacaClient
                    const url = baseClient['getDeviceUrl']('imagearray')
                    log.debug({ deviceIds: [deviceId] }, `Fetching image data from ${url}`)

                    // Add ClientID as URL parameter
                    const urlWithParams = new URL(url, window.location.origin)
                    const clientId = (baseClient as unknown as { clientId: number }).clientId || 1
                    urlWithParams.searchParams.append('ClientID', clientId.toString())

                    // Create request with the correct header for ImageBytes format
                    const response = await fetch(urlWithParams.toString(), {
                      method: 'GET',
                      headers: {
                        Accept: 'application/imagebytes',
                        'User-Agent': 'AlpacaWeb'
                      }
                    })

                    if (!response.ok) {
                      throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
                    }

                    // Get binary data as ArrayBuffer
                    imageData = await response.arrayBuffer()
                    log.debug({ deviceIds: [deviceId] }, `Successfully received image data, size: ${imageData.byteLength} bytes`)
                  }
                } catch (error) {
                  log.error({ deviceIds: [deviceId] }, `Error fetching image data: ${error}`)
                  // Fall back to JSON mode as last resort
                  log.debug({ deviceIds: [deviceId] }, `Falling back to JSON image data`)
                  try {
                    const jsonData = await this.callDeviceMethod(deviceId, 'imagearray', [])
                    if (jsonData && Array.isArray(jsonData)) {
                      const typedArray = new Uint8Array(jsonData as number[])
                      imageData = typedArray.buffer
                    }
                  } catch (jsonError) {
                    log.error({ deviceIds: [deviceId] }, `Error fetching image as JSON: ${jsonError}`)
                  }
                }

                if (imageData) {
                  log.debug({ deviceIds: [deviceId] }, `Downloaded image data for camera ${deviceId}, size: ${imageData.byteLength} bytes`)

                  // Update device with image data
                  this.updateDeviceProperties(deviceId, {
                    imageData,
                    hasImage: true,
                    isExposing: false, // Ensure exposure state is set to false when image is downloaded
                    cameraState: 0, // CameraStates.Idle
                    imageReady: false // Explicitly set imageReady to false after download
                  })

                  // Emit exposure complete event with image data
                  this._emitEvent({
                    type: 'cameraExposureComplete',
                    deviceId,
                    imageData
                  })

                  // Also emit image ready event
                  this._emitEvent({
                    type: 'cameraImageReady',
                    deviceId,
                    imageData
                  })

                  return
                } else {
                  log.warn({ deviceIds: [deviceId] }, `Retrieved imagearray but it's not a valid image data`)
                }
              } else {
                log.warn({ deviceIds: [deviceId] }, `Camera reports image is not ready, skipping image download`)
              }
            } catch (error) {
              log.error({ deviceIds: [deviceId] }, `Error downloading image data for camera ${deviceId}:`, error)
            }
          } else {
            log.warn({ deviceIds: [deviceId] }, `No client available for device ${deviceId}, can't download image`)
          }

          // If we reach here, we couldn't download the image
          // Still emit completion event but without image data
          log.debug({ deviceIds: [deviceId] }, `Emitting completion event without image data`)
          this._emitEvent({
            type: 'cameraExposureComplete',
            deviceId
          })
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `Error handling exposure completion for camera ${deviceId}:`, error)

          // Ensure exposure state is set to false even on error
          this.updateDeviceProperties(deviceId, {
            isExposing: false
          })

          // Still emit completion event
          this._emitEvent({
            type: 'cameraExposureComplete',
            deviceId
          })
        }
      },

      async abortCameraExposure(this: UnifiedStoreType, deviceId: string): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `Aborting exposure on camera ${deviceId}`)

        try {
          // Call abortexposure via the API - Per Alpaca spec, this is a PUT with no parameters
          await this.callDeviceMethod(deviceId, 'abortexposure', [])

          // Update device properties to show exposure aborted
          this.updateDeviceProperties(deviceId, {
            isExposing: false,
            exposureProgress: 0,
            imageReady: false,
            cameraState: 0 // CameraStates.Idle
          })

          // Emit aborted event
          this._emitEvent({
            type: 'cameraExposureAborted',
            deviceId
          })

          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `Error aborting exposure on camera ${deviceId}:`, error)

          // Still update the device state to indicate we're not exposing anymore
          this.updateDeviceProperties(deviceId, {
            isExposing: false,
            exposureProgress: 0,
            cameraState: 0 // Ensure we set camera state to idle
          })

          // Re-throw the error to be handled by the caller
          throw error
        }
      },

      async setCameraCooler(this: UnifiedStoreType, deviceId: string, enabled: boolean, targetTemperature?: number): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `Setting camera ${deviceId} cooler:`, {
          enabled,
          targetTemperature
        })

        try {
          // Set cooler state - Per Alpaca spec, use property format with named parameter
          await this.callDeviceMethod(deviceId, 'cooleron', [{ CoolerOn: enabled }])

          // If target temperature is provided, set it
          if (targetTemperature !== undefined) {
            // Per Alpaca spec, use property format with named parameter
            await this.callDeviceMethod(deviceId, 'setccdtemperature', [{ SetCCDTemperature: targetTemperature }])
          }

          // Update device properties
          const updates: Record<string, unknown> = {
            coolerEnabled: enabled
          }

          if (targetTemperature !== undefined) {
            updates.targetTemperature = targetTemperature
          }

          this.updateDeviceProperties(deviceId, updates)

          // Emit event
          this._emitEvent({
            type: 'cameraCoolerChanged',
            deviceId,
            enabled,
            temperature: targetTemperature
          })

          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `Error setting camera ${deviceId} cooler:`, error)
          throw error
        }
      },

      async setCameraBinning(this: UnifiedStoreType, deviceId: string, binX: number, binY: number): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `Setting camera ${deviceId} binning:`, { binX, binY })

        try {
          // Set binning X - Per Alpaca spec, property name must be capitalized correctly
          await this.callDeviceMethod(deviceId, 'binx', [{ BinX: binX }])

          // Set binning Y - Per Alpaca spec, property name must be capitalized correctly
          await this.callDeviceMethod(deviceId, 'biny', [{ BinY: binY }])

          // Update device properties
          this.updateDeviceProperties(deviceId, {
            binningX: binX,
            binningY: binY
          })

          // Emit event
          this._emitEvent({
            type: 'cameraBinningChanged',
            deviceId,
            binX,
            binY
          })

          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `Error setting camera ${deviceId} binning:`, error)
          throw error
        }
      },

      /**
       * Fetch camera properties after successful connection
       * Updates the device store with all available camera properties
       */
      async fetchCameraProperties(this: UnifiedStoreType, deviceId: string): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `Fetching properties for camera ${deviceId}`)

        const device = this.getDeviceById(deviceId)
        if (!device) {
          log.error({ deviceIds: [deviceId] }, `Device not found: ${deviceId}`)
          return false
        }

        const client = this.getDeviceClient(deviceId)
        if (!client) {
          log.error({ deviceIds: [deviceId] }, `No client available for device ${deviceId}`)
          return false
        }

        try {
          // Fetch all read-only properties.
          // client.getCameraInfo() returns an object with lowercase alpaca property names as keys.
          const propertiesFromClient = await (client as CameraClient).getCameraInfo()

          // Ensure specific properties for gain/offset modes are present
          // Access with lowercase alpaca property names as returned by client.getCameraInfo()
          const gains = (propertiesFromClient.gains as string[] | undefined) ?? []
          const gainmin = propertiesFromClient.gainmin as number | undefined
          const gainmax = propertiesFromClient.gainmax as number | undefined
          const offsets = (propertiesFromClient.offsets as string[] | undefined) ?? []
          const offsetmin = propertiesFromClient.offsetmin as number | undefined
          const offsetmax = propertiesFromClient.offsetmax as number | undefined
          // const subexposureduration = propertiesFromClient.subexposureduration as number | undefined; // Redundant

          // Determine cam_gainMode
          let gainMode: 'list' | 'value' | 'unknown' = 'unknown'
          log.debug({ deviceIds: [deviceId] }, `gainMode: ${gainMode} before evaluation`)
          if (gains && gains.length > 0) {
            gainMode = 'list'
          } else if (typeof gainmin === 'number' && typeof gainmax === 'number') {
            gainMode = 'value'
          }
          log.debug({ deviceIds: [deviceId] }, `gainMode: ${gainMode} after evaluation`)

          // Store internal mode representation (can be on propertiesFromClient or a separate var)
          const internalGainMode = gainMode

          // Determine cam_offsetMode
          let offsetMode: 'list' | 'value' | 'unknown' = 'unknown'
          if (offsets && offsets.length > 0) {
            offsetMode = 'list'
          } else if (typeof offsetmin === 'number' && typeof offsetmax === 'number') {
            offsetMode = 'value'
          }
          const internalOffsetMode = offsetMode

          // Map properties to friendlier names (typically camelCase for internal store use)
          const friendlyProperties: Record<string, unknown> = {}

          // Map basic capabilities - use lowercase alpaca property names for access from 'propertiesFromClient' object
          if (propertiesFromClient.cansetccdtemperature !== undefined) {
            friendlyProperties.canCool = propertiesFromClient.cansetccdtemperature
          }

          if (propertiesFromClient.cangetcoolerpower !== undefined) {
            friendlyProperties.canGetCoolerPower = propertiesFromClient.cangetcoolerpower
          }

          if (propertiesFromClient.cameraxsize !== undefined) {
            friendlyProperties.cameraXSize = propertiesFromClient.cameraxsize
          }

          if (propertiesFromClient.cameraysize !== undefined) {
            friendlyProperties.cameraYSize = propertiesFromClient.cameraysize
          }

          if (propertiesFromClient.sensorname !== undefined) {
            friendlyProperties.sensorName = propertiesFromClient.sensorname
          }

          if (propertiesFromClient.readoutmodes !== undefined) {
            friendlyProperties.readoutModes = propertiesFromClient.readoutmodes
          }

          if (propertiesFromClient.maxbinx !== undefined) {
            friendlyProperties.maxBinX = propertiesFromClient.maxbinx
          }

          if (propertiesFromClient.maxbiny !== undefined) {
            friendlyProperties.maxBinY = propertiesFromClient.maxbiny
          }

          // This block must remain to map subExposureDuration
          if (propertiesFromClient.subexposureduration !== undefined) {
            friendlyProperties.subExposureDuration = propertiesFromClient.subexposureduration
          }

          // Check for gain/offset support using lowercase alpaca property names
          const hasGain = propertiesFromClient.gainmin !== undefined && propertiesFromClient.gainmax !== undefined
          const hasOffset = propertiesFromClient.offsetmin !== undefined && propertiesFromClient.offsetmax !== undefined

          friendlyProperties.hasGain = hasGain
          friendlyProperties.hasOffset = hasOffset

          // Add gain/offset mode information from our detection
          if (hasGain) {
            friendlyProperties.gainMode = internalGainMode
            if (gains && gains.length > 0) friendlyProperties.gains = gains
          }

          if (hasOffset) {
            friendlyProperties.offsetMode = internalOffsetMode
            if (offsets && offsets.length > 0) friendlyProperties.offsets = offsets
          }

          // After determining gainMode and offsetMode, always set them as cam_gainMode and cam_offsetMode
          friendlyProperties.cam_gainMode = internalGainMode
          friendlyProperties.cam_offsetMode = internalOffsetMode

          // Add any non-undefined properties to the device
          if (Object.keys(friendlyProperties).length > 0) {
            this.updateDeviceProperties(deviceId, friendlyProperties)
          }

          // Now start polling for the read/write properties
          this.startCameraPropertyPolling(deviceId)

          log.debug({ deviceIds: [deviceId] }, `Successfully fetched properties for camera ${deviceId}`)
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `Error fetching properties for camera ${deviceId}:`, error)
          return false
        }
      },

      /**
       * Start polling for camera read/write properties
       * These properties can change and should be periodically updated
       */
      startCameraPropertyPolling(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceIds: [deviceId] }, `Starting property polling for camera ${deviceId}`)

        const device = this.getDeviceById(deviceId)
        if (!device) {
          log.error({ deviceIds: [deviceId] }, `Cannot start polling: Device not found ${deviceId}`)
          return
        }

        // Get device capabilities
        const properties = device.properties || {}

        // Clear any existing interval first
        this.stopCameraPropertyPolling(deviceId)

        // Initialize the interval map if not already done
        if (!this.propertyPollingIntervals) {
          this.propertyPollingIntervals = new Map<string, number>()
        }

        // Initialize devicestate tracking for this device if not already done
        if (!this.deviceStateAvailableProps.has(deviceId)) {
          this.deviceStateAvailableProps.set(deviceId, new Set<string>())
        }

        // Get polling interval from device properties or use default
        const pollInterval = (properties.propertyPollIntervalMs as number) || 2000 // Default 2 seconds

        // Create new interval
        const intervalId = window.setInterval(async () => {
          try {
            // Get current device before each poll cycle to ensure we have latest state
            const currentDevice = this.getDeviceById(deviceId)
            if (!currentDevice || !currentDevice.isConnected) {
              log.debug({ deviceIds: [deviceId] }, `Device ${deviceId} is no longer connected, stopping property polling`)
              this.stopCameraPropertyPolling(deviceId)
              return
            }

            const client = this.getDeviceClient(deviceId)
            if (!client) {
              log.warn({ deviceIds: [deviceId] }, `No client available for device ${deviceId}, stopping property polling`)
              this.stopCameraPropertyPolling(deviceId)
              return
            }

            // Determine which properties to poll based on current device state
            const currentProps = currentDevice.properties || {}
            const isExposing = currentProps.isExposing === true

            // Log exposure state for debugging
            log.debug({ deviceIds: [deviceId] }, `Camera ${deviceId} polling cycle - exposure state: ${isExposing ? 'EXPOSING' : 'IDLE'}`)

            // Define base properties that are always polled
            const propsToFetch = [
              // Basic properties always polled
              'binx',
              'biny',
              'gain',
              'offset',
              'readoutmode',
              'startx',
              'starty',
              'numx',
              'numy',
              'fastreadout'
            ]

            // Add cooling-related properties only if camera supports them
            if (currentProps.cansetccdtemperature === true) {
              propsToFetch.push('cooleron')
              propsToFetch.push('setccdtemperature')
            }

            if (currentProps.canreadtemperature !== false) {
              propsToFetch.push('ccdtemperature')
            }

            if (currentProps.cangetcoolerpower === true) {
              propsToFetch.push('coolerpower')
            }

            // Add state properties only if camera is currently exposing
            if (isExposing) {
              log.debug({ deviceIds: [deviceId] }, `Camera ${deviceId} is exposing, polling state properties`)
              propsToFetch.push('camerastate')
              propsToFetch.push('imageready')
            }

            // Fetch all properties and update
            const properties: Record<string, unknown> = {}

            // Try to use devicestate if not marked as unsupported
            let deviceStateResult: Record<string, unknown> | null = null

            // Only try devicestate if we haven't marked it as unsupported
            if (!this.deviceStateUnsupported.has(deviceId)) {
              deviceStateResult = await this.fetchDeviceState(deviceId, {
                forceRefresh: true, // Always get fresh data during polling
                cacheTtlMs: pollInterval / 2 // Cache for half the polling interval
              })

              if (deviceStateResult) {
                // Update our tracking of which properties are available via devicestate
                const deviceStateProps = this.deviceStateAvailableProps.get(deviceId) || new Set<string>()

                // Add all received properties to our available props set
                Object.keys(deviceStateResult).forEach((prop) => {
                  deviceStateProps.add(prop.toLowerCase())
                })

                // Update the set
                this.deviceStateAvailableProps.set(deviceId, deviceStateProps)

                // Add all received properties to our update
                Object.entries(deviceStateResult).forEach(([key, value]) => {
                  // Store properties with lowercase keys for consistency
                  properties[key.toLowerCase()] = value
                })

                // Update the device with a flag indicating devicestate is being used
                this.updateDeviceProperties(deviceId, {
                  usingDeviceState: true
                })
              }
            }

            // For any properties not received via devicestate, poll them individually
            const deviceStateProps = this.deviceStateAvailableProps.get(deviceId) || new Set<string>()

            // Filter properties that need to be individually fetched
            const individualPropsToFetch = propsToFetch.filter((prop) => !deviceStateResult || !deviceStateProps.has(prop.toLowerCase()))

            if (individualPropsToFetch.length > 0) {
              // Debug log showing exactly which properties are being polled
              log.debug({ deviceIds: [deviceId] }, `Camera ${deviceId} properties being polled:`, individualPropsToFetch)

              // Check if we're polling state properties and log clearly
              const pollingStateProps = individualPropsToFetch.some((prop) => prop === 'camerastate' || prop === 'imageready')
              if (pollingStateProps) {
                log.debug(
                  { deviceIds: [deviceId] },
                  `%c Camera ${deviceId} polling state properties - isExposing: ${isExposing}`,
                  'color: blue; font-weight: bold'
                )
              }

              for (const property of individualPropsToFetch) {
                try {
                  // Log each individual fetch for state properties
                  if (property === 'camerastate' || property === 'imageready') {
                    log.debug({ deviceIds: [deviceId] }, `%c📊 Polling individual property: ${property}`, 'color: green')
                  }

                  const value = await client.getProperty(property)
                  properties[property] = value
                } catch (error) {
                  // Silently ignore errors for properties that might not be supported
                  // Only log in debug mode to avoid console spam
                  if (property === 'camerastate' || property === 'ccdtemperature' || property === 'imageready') {
                    log.debug({ deviceIds: [deviceId] }, `Failed to get important camera property ${property}:`, error)
                  }
                }
              }
            }

            if (Object.keys(properties).length > 0) {
              // Update the device with polled properties
              this.updateDeviceProperties(deviceId, properties)

              // Map to friendly property names
              const friendlyProperties: Record<string, unknown> = {}

              // Only map properties that exist
              if (properties.binx !== undefined) friendlyProperties.binningX = properties.binx
              if (properties.biny !== undefined) friendlyProperties.binningY = properties.biny
              if (properties.cooleron !== undefined) friendlyProperties.coolerEnabled = properties.cooleron
              if (properties.ccdtemperature !== undefined) friendlyProperties.temperature = properties.ccdtemperature
              if (properties.setccdtemperature !== undefined) friendlyProperties.targetTemperature = properties.setccdtemperature
              if (properties.coolerpower !== undefined) friendlyProperties.coolerPower = properties.coolerpower
              if (properties.numx !== undefined) friendlyProperties.numX = properties.numx
              if (properties.numy !== undefined) friendlyProperties.numY = properties.numy
              if (properties.startx !== undefined) friendlyProperties.startX = properties.startx
              if (properties.starty !== undefined) friendlyProperties.startY = properties.starty
              // Add any non-undefined properties
              if (Object.keys(friendlyProperties).length > 0) {
                this.updateDeviceProperties(deviceId, friendlyProperties)
              }
            }
          } catch (error) {
            log.error({ deviceIds: [deviceId] }, `Error polling properties for camera ${deviceId}:`, error)
          }
        }, pollInterval)

        // Store the interval ID
        // Note: Window.setInterval returns a number ID
        this.propertyPollingIntervals.set(deviceId, intervalId)

        log.debug({ deviceIds: [deviceId] }, `Property polling started for camera ${deviceId} with interval ${pollInterval}ms`)
      },

      /**
       * Stop polling for camera properties
       */
      stopCameraPropertyPolling(this: UnifiedStoreType, deviceId: string): void {
        if (!this.propertyPollingIntervals) {
          return
        }

        const intervalId = this.propertyPollingIntervals.get(deviceId)

        if (intervalId) {
          log.debug({ deviceIds: [deviceId] }, `Stopping property polling for camera ${deviceId}`)
          clearInterval(intervalId)
          this.propertyPollingIntervals.delete(deviceId)

          // Clean up devicestate tracking
          this.updateDeviceProperties(deviceId, {
            usingDeviceState: false
          })
        }
      },

      /**
       * Change the polling interval for a device
       */
      setPropertyPollingInterval(this: UnifiedStoreType, deviceId: string, intervalMs: number): void {
        if (intervalMs < 100) {
          log.warn({ deviceIds: [deviceId] }, `Polling interval too small (${intervalMs}ms), using 100ms minimum`)
          intervalMs = 100
        }

        // Update device property with new interval
        this.updateDeviceProperties(deviceId, {
          propertyPollIntervalMs: intervalMs
        })

        // Restart polling with new interval
        this.startCameraPropertyPolling(deviceId)
      },

      /**
       * Sets the preferred image format for a camera device
       * @param deviceId ID of the camera device
       * @param format The format: 'binary' (default, uses application/imagebytes) or 'json' (fallback)
       */
      setPreferredImageFormat(this: UnifiedStoreType, deviceId: string, format: 'binary' | 'json'): void {
        const device = this.getDeviceById(deviceId)
        if (!device) {
          log.error({ deviceIds: [deviceId] }, `Cannot set preferred image format: Device not found ${deviceId}`)
          return
        }

        if (device.type !== 'camera') {
          log.error({ deviceIds: [deviceId] }, `Device ${deviceId} is not a camera`)
          return
        }

        log.debug({ deviceIds: [deviceId] }, `Setting preferred image format for ${deviceId} to ${format}`)
        this.updateDeviceProperties(deviceId, {
          preferredImageFormat: format
        })
      },

      /**
       * Cleanup all device state tracking when a device is disconnected or removed
       */
      cleanupDeviceState(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceIds: [deviceId] }, `Cleaning up device state tracking for camera ${deviceId}`)

        // Remove from device state tracking
        this.deviceStateAvailableProps.delete(deviceId)
        this.deviceStateUnsupported.delete(deviceId)
      },

      /**
       * Handle device disconnection
       * Clean up all resources and stop polling
       */
      handleDeviceDisconnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceIds: [deviceId] }, `Handling disconnection for camera ${deviceId}`)

        // Stop property polling
        this.stopCameraPropertyPolling(deviceId)

        // Clean up device state tracking
        this.cleanupDeviceState(deviceId)

        // Update device properties to show we're not using devicestate
        this.updateDeviceProperties(deviceId, {
          usingDeviceState: false
        })
      },

      /**
       * Handle device connection
       * Initialize devicestate tracking and start property polling
       */
      handleDeviceConnected(this: UnifiedStoreType, deviceId: string): void {
        log.debug({ deviceIds: [deviceId] }, `Handling connection for camera ${deviceId}`)

        // Initialize devicestate tracking for this device
        if (!this.deviceStateAvailableProps.has(deviceId)) {
          this.deviceStateAvailableProps.set(deviceId, new Set<string>())
        }

        // Remove from unsupported list in case it was previously added
        this.deviceStateUnsupported.delete(deviceId)

        // Start property polling
        this.startCameraPropertyPolling(deviceId)
      },

      // Implementation of new actions

      async setCameraGain(this: UnifiedStoreType, deviceId: string, desiredGain: number | string): Promise<void> {
        const device = this.getDeviceById(deviceId)
        const client = this.getDeviceClient(deviceId) as CameraClient | null
        if (!device || !client) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Client or device not found for setCameraGain' })
          return
        }

        const currentGainMode = device.properties?.cam_gainMode as 'list' | 'value' | 'unknown' | undefined
        const gainsList = (device.properties?.gains as string[] | undefined) ?? []
        const gainMin = device.properties?.gainmin as number | undefined
        const gainMax = device.properties?.gainmax as number | undefined
        let numericValueToSend: number | undefined

        if (currentGainMode === 'list') {
          if (typeof desiredGain === 'string') {
            const index = gainsList.indexOf(desiredGain)
            if (index !== -1) {
              numericValueToSend = index
            } else {
              this._emitEvent({ type: 'deviceApiError', deviceId, error: `Gain name '${desiredGain}' not found in list.` })
              return
            }
          } else if (typeof desiredGain === 'number') {
            if (desiredGain >= 0 && desiredGain < gainsList.length) {
              numericValueToSend = desiredGain
            } else {
              this._emitEvent({ type: 'deviceApiError', deviceId, error: `Gain index ${desiredGain} out of bounds.` })
              return
            }
          }
        } else if (currentGainMode === 'value') {
          if (typeof desiredGain === 'string') {
            numericValueToSend = parseInt(desiredGain, 10)
            if (isNaN(numericValueToSend)) {
              this._emitEvent({ type: 'deviceApiError', deviceId, error: `Invalid gain value string '${desiredGain}'.` })
              return
            }
          } else {
            numericValueToSend = desiredGain
          }
          if (typeof gainMin === 'number' && numericValueToSend < gainMin) numericValueToSend = gainMin // Clamp or error? For now, clamp.
          if (typeof gainMax === 'number' && numericValueToSend > gainMax) numericValueToSend = gainMax // Clamp or error? For now, clamp.
        } else {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Gain mode is unknown. Cannot set gain.' })
          return
        }

        if (typeof numericValueToSend === 'number') {
          try {
            await client.setGain(numericValueToSend)
            this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'setGain', args: [numericValueToSend], result: 'success' })
            await this.fetchCameraProperties(deviceId) // Refresh state
          } catch (error) {
            this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set gain: ${error}` })
          }
        } else {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Could not determine numeric gain value to send.' })
        }
      },

      async setCameraOffset(this: UnifiedStoreType, deviceId: string, desiredOffset: number | string): Promise<void> {
        const device = this.getDeviceById(deviceId)
        const client = this.getDeviceClient(deviceId) as CameraClient | null
        if (!device || !client) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Client or device not found for setCameraOffset' })
          return
        }

        const currentOffsetMode = device.properties?.cam_offsetMode as 'list' | 'value' | 'unknown' | undefined
        const offsetsList = (device.properties?.offsets as string[] | undefined) ?? []
        const offsetMin = device.properties?.offsetmin as number | undefined
        const offsetMax = device.properties?.offsetmax as number | undefined
        let numericValueToSend: number | undefined

        if (currentOffsetMode === 'list') {
          if (typeof desiredOffset === 'string') {
            const index = offsetsList.indexOf(desiredOffset)
            if (index !== -1) {
              numericValueToSend = index
            } else {
              this._emitEvent({ type: 'deviceApiError', deviceId, error: `Offset name '${desiredOffset}' not found in list.` })
              return
            }
          } else if (typeof desiredOffset === 'number') {
            if (desiredOffset >= 0 && desiredOffset < offsetsList.length) {
              numericValueToSend = desiredOffset
            } else {
              this._emitEvent({ type: 'deviceApiError', deviceId, error: `Offset index ${desiredOffset} out of bounds.` })
              return
            }
          }
        } else if (currentOffsetMode === 'value') {
          if (typeof desiredOffset === 'string') {
            numericValueToSend = parseInt(desiredOffset, 10)
            if (isNaN(numericValueToSend)) {
              this._emitEvent({ type: 'deviceApiError', deviceId, error: `Invalid offset value string '${desiredOffset}'.` })
              return
            }
          } else {
            numericValueToSend = desiredOffset
          }
          if (typeof offsetMin === 'number' && numericValueToSend < offsetMin) numericValueToSend = offsetMin
          if (typeof offsetMax === 'number' && numericValueToSend > offsetMax) numericValueToSend = offsetMax
        } else {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Offset mode is unknown. Cannot set offset.' })
          return
        }

        if (typeof numericValueToSend === 'number') {
          try {
            await client.setOffset(numericValueToSend)
            this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'setOffset', args: [numericValueToSend], result: 'success' })
            await this.fetchCameraProperties(deviceId)
          } catch (error) {
            this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set offset: ${error}` })
          }
        } else {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Could not determine numeric offset value to send.' })
        }
      },

      async setCameraReadoutMode(this: UnifiedStoreType, deviceId: string, modeIndex: number): Promise<void> {
        const client = this.getDeviceClient(deviceId) as CameraClient | null
        if (!client) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Client not found for setCameraReadoutMode' })
          return
        }
        try {
          await client.setReadoutMode(modeIndex)
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'setReadoutMode', args: [modeIndex], result: 'success' })
          await this.fetchCameraProperties(deviceId)
        } catch (error) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set readout mode: ${error}` })
        }
      },

      async setCameraSubframe(this: UnifiedStoreType, deviceId: string, startX: number, startY: number, numX: number, numY: number): Promise<void> {
        const client = this.getDeviceClient(deviceId) as CameraClient | null
        if (!client) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Client not found for setCameraSubframe' })
          return
        }
        try {
          await client.setSubframe(startX, startY, numX, numY)
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'setSubframe', args: [startX, startY, numX, numY], result: 'success' })
          await this.fetchCameraProperties(deviceId)
        } catch (error) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set subframe: ${error}` })
        }
      },

      async stopCameraExposure(
        this: UnifiedStoreType,
        deviceId: string
        // earlyImageReadout: boolean = true // Client.stopExposure does not take this.
      ): Promise<void> {
        const client = this.getDeviceClient(deviceId) as CameraClient | null
        if (!client) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Client not found for stopCameraExposure' })
          return
        }
        try {
          await client.stopExposure() // Alpaca method does not take earlyImageReadout
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'stopExposure', args: [], result: 'success' })
          // Update state: exposure stopped, image might be ready or reading. Polling will pick it up.
          this.updateDeviceProperties(deviceId, { isExposing: false }) // Tentative, polling/handleExposureComplete should confirm
        } catch (error) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to stop exposure: ${error}` })
        }
      },

      async pulseGuideCamera(this: UnifiedStoreType, deviceId: string, direction: number, duration: number): Promise<void> {
        const client = this.getDeviceClient(deviceId) as CameraClient | null
        if (!client) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Client not found for pulseGuideCamera' })
          return
        }
        try {
          await client.pulseGuide(direction, duration)
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'pulseGuide', args: [direction, duration], result: 'success' })
          // Pulse guiding is a command, ispulseguiding property will be updated by polling if it changes.
        } catch (error) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to pulse guide: ${error}` })
        }
      },

      async setCameraSubExposureDuration(this: UnifiedStoreType, deviceId: string, duration: number): Promise<void> {
        const client = this.getDeviceClient(deviceId) as CameraClient | null
        if (!client) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: 'Client not found for setSubExposureDuration' })
          return
        }
        try {
          await client.setSubExposureDuration(duration)
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'setSubExposureDuration', args: [duration], result: 'success' })
          await this.fetchCameraProperties(deviceId) // Refresh as subexposureduration changed
        } catch (error) {
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set sub-exposure duration: ${error}` })
        }
      }
    } as CameraActionsSignatures // Cast to ensure all actions are covered
  }
}
