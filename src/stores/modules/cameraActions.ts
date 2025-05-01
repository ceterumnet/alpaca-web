/**
 * Camera Actions Module
 *
 * Provides functionality for interacting with camera devices
 */

// Status: Good - Core Module
// This is the camera actions module that:
// - Implements camera control operations
// - Handles image acquisition
// - Provides exposure management
// - Supports camera configuration
// - Maintains camera state

// Features:
// - Exposure tracking with progress updates
// - Image download handling
// - Error recovery and fallback mechanisms
// - Event emission for UI updates
// - Support for both binary and JSON image formats

import type { DeviceEvent, Device } from '../types/deviceTypes'
import type { AlpacaClient } from '@/api/AlpacaClient'
import { AlpacaClient as BaseAlpacaClient } from '@/api/alpaca/base-client'

// Define camera state interface with property polling intervals
export interface CameraState {
  _propertyPollingIntervals: Map<string, number>
  _deviceStateAvailableProps: Map<string, Set<string>> // Track which properties are available via devicestate for each device
  _deviceStateUnsupported: Set<string> // Track devices that don't support devicestate
}

export function createCameraActions() {
  return {
    state: (): CameraState => ({
      _propertyPollingIntervals: new Map<string, number>(),
      _deviceStateAvailableProps: new Map<string, Set<string>>(),
      _deviceStateUnsupported: new Set<string>()
    }),

    actions: {
      async startCameraExposure(
        this: CameraState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (id: string, method: string, args: unknown[]) => Promise<unknown>
          trackExposureProgress: (id: string, exposureTime: number) => void
        },
        deviceId: string,
        exposureTime: number,
        isLight: boolean = true
      ): Promise<boolean> {
        console.log(`Starting exposure on camera ${deviceId}:`, {
          exposureTime,
          isLight
        })

        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Device not found: ${deviceId}`)
        }

        if (device.type !== 'camera') {
          throw new Error(`Device ${deviceId} is not a camera`)
        }

        // Update device properties to show exposure in progress
        console.log(`Updating device properties to show exposure in progress`)
        this.updateDeviceProperties(deviceId, {
          isExposing: true,
          exposureProgress: 0,
          exposureTime: exposureTime,
          cameraState: 2 // CameraStates.Exposing
        })

        // Emit exposure started event
        console.log(`Emitting cameraExposureStarted event`)
        this._emitEvent({
          type: 'cameraExposureStarted',
          deviceId,
          duration: exposureTime,
          isLight
        })

        try {
          console.log(`Attempting to call startexposure via API`)
          // Per Alpaca spec, startexposure takes named parameters not an array
          // Send as single object parameter to trigger the PUT with named parameters
          await this.callDeviceMethod(deviceId, 'startexposure', [
            {
              Duration: exposureTime,
              Light: isLight
            }
          ])

          // Start a progress tracking timer
          console.log(`Starting exposure progress tracking`)
          this.trackExposureProgress(deviceId, exposureTime)

          return true
        } catch (error) {
          console.error(`Error starting exposure on camera ${deviceId}:`, error)

          // Update device state to show error
          this.updateDeviceProperties(deviceId, {
            isExposing: false,
            exposureProgress: 0,
            cameraState: 0 // CameraStates.Idle
          })

          // Re-throw the error to be handled by the caller
          throw error
        }
      },

      trackExposureProgress(
        this: CameraState & {
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          handleExposureComplete: (id: string) => Promise<void>
        },
        deviceId: string,
        exposureTime: number
      ): void {
        console.log(
          `Starting to track exposure progress for device ${deviceId} with exposure time ${exposureTime}s`
        )
        const startTime = Date.now()
        const duration = exposureTime * 1000 // convert to milliseconds

        // Ensure the isExposing property is set when tracking starts
        this.updateDeviceProperties(deviceId, {
          isExposing: true,
          exposureProgress: 0
        })

        // Config options - these should eventually move to user settings
        const MAX_WAIT_TIME = 300000 // 5 minutes max wait for image
        const POLLING_INTERVAL = 500 // Check every 500ms

        // Track if we're in the post-exposure polling phase
        let isPollingForImage = false
        let lastKnownProgress = 0

        const progressTimer = setInterval(async () => {
          try {
            const client = this.getDeviceClient(deviceId)
            const now = Date.now()
            const elapsedTime = now - startTime

            // Check if we've exceeded the maximum wait time
            if (elapsedTime > MAX_WAIT_TIME) {
              console.warn(
                `Exposure for ${deviceId} exceeded maximum wait time (${MAX_WAIT_TIME}ms), aborting`
              )
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
                const cameraState = (await client.getProperty('camerastate')) as number
                console.log(`Camera ${deviceId} state: ${cameraState}`)

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
                    const imageReady = (await client.getProperty('imageready')) as boolean
                    if (imageReady) {
                      console.log(`Camera ${deviceId} is idle and image is ready`)
                      clearInterval(progressTimer)
                      await this.handleExposureComplete(deviceId)
                      return
                    } else {
                      console.warn(`Camera ${deviceId} is idle but image not ready, possible error`)
                      // Continue polling a bit longer, might be transitional state
                    }
                  } else if (elapsedTime > duration) {
                    // Camera is idle and exposure time has passed, start polling for image
                    isPollingForImage = true
                    console.log(`Exposure time complete, starting to poll for image ready`)
                  }
                } else if (cameraState === 2) {
                  // Camera is exposing
                  // Calculate progress based on exposure time
                  const progress = Math.min(100, Math.round((elapsedTime / duration) * 100))
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
                  const imageReady = (await client.getProperty('imageready')) as boolean
                  if (imageReady) {
                    console.log(
                      `Camera ${deviceId} reports image is ready while in state ${cameraState}`
                    )
                    clearInterval(progressTimer)
                    await this.handleExposureComplete(deviceId)
                    return
                  }
                } else if (cameraState === 5) {
                  // Error
                  console.error(
                    `Camera ${deviceId} reported error state, aborting exposure tracking`
                  )
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
                  const imageReady = (await client.getProperty('imageready')) as boolean
                  console.log(`Image ready polling check: ${imageReady}`)
                  if (imageReady) {
                    console.log(`Camera ${deviceId} reports image is ready during polling`)
                    clearInterval(progressTimer)
                    await this.handleExposureComplete(deviceId)
                    return
                  }
                }
              } catch (error) {
                console.warn(`Error checking camera state for ${deviceId}:`, error)
                // Fall back to time-based tracking
                fallbackToTimeBasedTracking(elapsedTime, duration)
              }
            } else {
              console.warn(
                `No client available for device ${deviceId}, using time-based tracking only`
              )
              fallbackToTimeBasedTracking(elapsedTime, duration)
            }
          } catch (error) {
            console.error(`Error tracking exposure progress for camera ${deviceId}:`, error)
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
              console.warn(`Polling for image ready timed out for ${deviceId}`)
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
              console.log(
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

      async handleExposureComplete(
        this: CameraState & {
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          getDeviceClient: (id: string) => AlpacaClient | null
          callDeviceMethod: (id: string, method: string, args: unknown[]) => Promise<unknown>
          getDeviceById: (id: string) => Device | null
        },
        deviceId: string
      ): Promise<void> {
        console.log(`Handling exposure completion for camera ${deviceId}`)

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
              console.log(`Attempting to download image data for camera ${deviceId}`)

              // First check if the image is really ready
              let imageReady = false
              try {
                imageReady = (await client.getProperty('imageready')) as boolean
                console.log(`Camera ${deviceId} imageready check: ${imageReady}`)
              } catch (readyError) {
                console.warn(`Error checking if image is ready: ${readyError}`)
                // Assume it's ready since we've reached this point
                imageReady = true
              }

              if (imageReady) {
                // Get device to determine preferred image format
                const device = this.getDeviceById(deviceId)
                const properties = device?.properties || {}
                const preferredFormat = (properties.preferredImageFormat as string) || 'binary'

                console.log(`Retrieving image data in ${preferredFormat} format`)

                let imageData: ArrayBuffer | null = null

                try {
                  if (client) {
                    // Access base client's protected methods safely by casting
                    const baseClient = client as BaseAlpacaClient
                    const url = baseClient['getDeviceUrl']('imagearray')
                    console.log(`Fetching image data from ${url}`)

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
                    console.log(
                      `Successfully received image data, size: ${imageData.byteLength} bytes`
                    )
                  }
                } catch (error) {
                  console.error(`Error fetching image data: ${error}`)
                  // Fall back to JSON mode as last resort
                  console.log(`Falling back to JSON image data`)
                  try {
                    const jsonData = await this.callDeviceMethod(deviceId, 'imagearray', [])
                    if (jsonData && Array.isArray(jsonData)) {
                      const typedArray = new Uint8Array(jsonData as number[])
                      imageData = typedArray.buffer
                    }
                  } catch (jsonError) {
                    console.error(`Error fetching image as JSON: ${jsonError}`)
                  }
                }

                if (imageData) {
                  console.log(
                    `Downloaded image data for camera ${deviceId}, size: ${imageData.byteLength} bytes`
                  )

                  // Update device with image data
                  this.updateDeviceProperties(deviceId, {
                    imageData,
                    hasImage: true,
                    isExposing: false // Ensure exposure state is set to false when image is downloaded
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
                  console.warn(`Retrieved imagearray but it's not a valid image data`)
                }
              } else {
                console.warn(`Camera reports image is not ready, skipping image download`)
              }
            } catch (error) {
              console.error(`Error downloading image data for camera ${deviceId}:`, error)
            }
          } else {
            console.warn(`No client available for device ${deviceId}, can't download image`)
          }

          // If we reach here, we couldn't download the image
          // Still emit completion event but without image data
          console.log(`Emitting completion event without image data`)
          this._emitEvent({
            type: 'cameraExposureComplete',
            deviceId
          })
        } catch (error) {
          console.error(`Error handling exposure completion for camera ${deviceId}:`, error)

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

      async abortCameraExposure(
        this: CameraState & {
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (id: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string
      ): Promise<boolean> {
        console.log(`Aborting exposure on camera ${deviceId}`)

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
          console.error(`Error aborting exposure on camera ${deviceId}:`, error)

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

      async setCameraCooler(
        this: CameraState & {
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (id: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        enabled: boolean,
        targetTemperature?: number
      ): Promise<boolean> {
        console.log(`Setting camera ${deviceId} cooler:`, {
          enabled,
          targetTemperature
        })

        try {
          // Set cooler state - Per Alpaca spec, use property format with named parameter
          await this.callDeviceMethod(deviceId, 'cooleron', [{ CoolerOn: enabled }])

          // If target temperature is provided, set it
          if (targetTemperature !== undefined) {
            // Per Alpaca spec, use property format with named parameter
            await this.callDeviceMethod(deviceId, 'setccdtemperature', [
              { SetCCDTemperature: targetTemperature }
            ])
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
          console.error(`Error setting camera ${deviceId} cooler:`, error)
          throw error
        }
      },

      async setCameraBinning(
        this: CameraState & {
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (id: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        binX: number,
        binY: number
      ): Promise<boolean> {
        console.log(`Setting camera ${deviceId} binning:`, { binX, binY })

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
          console.error(`Error setting camera ${deviceId} binning:`, error)
          throw error
        }
      },

      /**
       * Fetch camera properties after successful connection
       * Updates the device store with all available camera properties
       */
      async fetchCameraProperties(
        this: CameraState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          startCameraPropertyPolling: (deviceId: string) => void
          fetchDeviceState: (
            deviceId: string,
            options?: { forceRefresh?: boolean; cacheTtlMs?: number }
          ) => Promise<Record<string, unknown> | null>
        },
        deviceId: string
      ): Promise<boolean> {
        console.log(`Fetching properties for camera ${deviceId}`)

        const device = this.getDeviceById(deviceId)
        if (!device) {
          console.error(`Device not found: ${deviceId}`)
          return false
        }

        const client = this.getDeviceClient(deviceId)
        if (!client) {
          console.error(`No client available for device ${deviceId}`)
          return false
        }

        try {
          // Define the read-only properties we want to fetch
          const readOnlyProperties = [
            // Camera capabilities
            'canabortexposure',
            'canasymmetricbin',
            'canfastreadout',
            'cangetcoolerpower',
            'canpulseguide',
            'cansetccdtemperature',
            'canstopexposure',
            // Camera dimensions & hardware limits
            'bayeroffsetx',
            'bayeroffsety',
            'cameraxsize',
            'cameraysize',
            // Min/max values
            'gainmin',
            'gainmax',
            'offsetmin',
            'offsetmax',
            'exposuremin',
            'exposuremax',
            'exposureresolution',
            // Available options
            'readoutmodes'
          ]

          // Try to get all properties via devicestate first
          const properties: Record<string, unknown> = {}
          let deviceState: Record<string, unknown> | null = null

          try {
            deviceState = await this.fetchDeviceState(deviceId, {
              forceRefresh: true,
              cacheTtlMs: 5000 // Cache for 5 seconds
            })

            if (deviceState) {
              // Extract properties from device state
              for (const property of readOnlyProperties) {
                if (deviceState[property] !== undefined) {
                  properties[property] = deviceState[property]
                }
              }
            }
          } catch (error) {
            console.warn(`Error fetching device state for ${deviceId}:`, error)
            deviceState = null
          }

          // For any properties not found in device state, fetch them individually
          for (const property of readOnlyProperties) {
            if (properties[property] === undefined) {
              try {
                const value = await client.getProperty(property)
                properties[property] = value
                console.log(`Camera ${deviceId} property ${property} = ${value}`)
              } catch (error) {
                console.warn(`Failed to get camera property ${property}:`, error)
              }
            }
          }

          // Determine gain mode (Index vs Value) by trying to fetch gains
          let gainMode = 'Value'
          let gains = null
          try {
            gains = await client.getProperty('gains')
            if (gains && Array.isArray(gains) && gains.length > 0) {
              gainMode = 'Index'
              properties.gains = gains
              console.log(`Camera ${deviceId} is in Gain Index mode, gains:`, gains)
            } else {
              console.log(`Camera ${deviceId} gains array is empty, assuming Value mode`)
            }
          } catch {
            console.log(`Camera ${deviceId} does not support Gain Index mode, using Value mode`)
          }
          properties.gainMode = gainMode

          // Determine offset mode (Index vs Value) by trying to fetch offsets
          let offsetMode = 'Value'
          let offsets = null
          try {
            offsets = await client.getProperty('offsets')
            if (offsets && Array.isArray(offsets) && offsets.length > 0) {
              offsetMode = 'Index'
              properties.offsets = offsets
              console.log(`Camera ${deviceId} is in Offset Index mode, offsets:`, offsets)
            } else {
              console.log(`Camera ${deviceId} offsets array is empty, assuming Value mode`)
            }
          } catch {
            console.log(`Camera ${deviceId} does not support Offset Index mode, using Value mode`)
          }
          properties.offsetMode = offsetMode

          // Map properties to friendlier names
          const friendlyProperties: Record<string, unknown> = {}

          // Map basic capabilities
          if (properties.cansetccdtemperature !== undefined) {
            friendlyProperties.canCool = properties.cansetccdtemperature
          }

          if (properties.cangetcoolerpower !== undefined) {
            friendlyProperties.canGetCoolerPower = properties.cangetcoolerpower
          }

          if (properties.cameraxsize !== undefined) {
            friendlyProperties.imageWidth = properties.cameraxsize
          }

          if (properties.cameraysize !== undefined) {
            friendlyProperties.imageHeight = properties.cameraysize
          }

          // Check for gain/offset support
          const hasGain = properties.gainmin !== undefined && properties.gainmax !== undefined
          const hasOffset = properties.offsetmin !== undefined && properties.offsetmax !== undefined

          friendlyProperties.hasGain = hasGain
          friendlyProperties.hasOffset = hasOffset

          // Add gain/offset mode information from our detection
          if (hasGain) {
            friendlyProperties.gainMode = gainMode
            if (gains) friendlyProperties.gainOptions = gains
          }

          if (hasOffset) {
            friendlyProperties.offsetMode = offsetMode
            if (offsets) friendlyProperties.offsetOptions = offsets
          }

          // Add any non-undefined properties to the device
          if (Object.keys(friendlyProperties).length > 0) {
            this.updateDeviceProperties(deviceId, friendlyProperties)
          }

          // Now start polling for the read/write properties
          this.startCameraPropertyPolling(deviceId)

          console.log(`Successfully fetched properties for camera ${deviceId}`)
          return true
        } catch (error) {
          console.error(`Error fetching properties for camera ${deviceId}:`, error)
          return false
        }
      },

      /**
       * Start polling for camera read/write properties
       * These properties can change and should be periodically updated
       */
      startCameraPropertyPolling(
        this: CameraState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          stopCameraPropertyPolling: (deviceId: string) => void
          fetchDeviceState: (
            deviceId: string,
            options?: { forceRefresh?: boolean; cacheTtlMs?: number }
          ) => Promise<Record<string, unknown> | null>
        },
        deviceId: string
      ): void {
        console.log(`Starting property polling for camera ${deviceId}`)

        const device = this.getDeviceById(deviceId)
        if (!device) {
          console.error(`Cannot start polling: Device not found ${deviceId}`)
          return
        }

        // Get device capabilities
        const properties = device.properties || {}

        // Clear any existing interval first
        this.stopCameraPropertyPolling(deviceId)

        // Initialize the interval map if not already done
        if (!this._propertyPollingIntervals) {
          this._propertyPollingIntervals = new Map<string, number>()
        }

        // Initialize devicestate tracking for this device if not already done
        if (!this._deviceStateAvailableProps.has(deviceId)) {
          this._deviceStateAvailableProps.set(deviceId, new Set<string>())
        }

        // Get polling interval from device properties or use default
        const pollInterval = (properties.propertyPollIntervalMs as number) || 2000 // Default 2 seconds

        // Create new interval
        const intervalId = setInterval(async () => {
          try {
            // Get current device before each poll cycle to ensure we have latest state
            const currentDevice = this.getDeviceById(deviceId)
            if (!currentDevice || !currentDevice.isConnected) {
              console.log(`Device ${deviceId} is no longer connected, stopping property polling`)
              this.stopCameraPropertyPolling(deviceId)
              return
            }

            const client = this.getDeviceClient(deviceId)
            if (!client) {
              console.warn(`No client available for device ${deviceId}, stopping property polling`)
              this.stopCameraPropertyPolling(deviceId)
              return
            }

            // Determine which properties to poll based on current device state
            const currentProps = currentDevice.properties || {}
            const isExposing = currentProps.isExposing === true

            // Log exposure state for debugging
            console.debug(
              `Camera ${deviceId} polling cycle - exposure state: ${isExposing ? 'EXPOSING' : 'IDLE'}`
            )

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
              console.debug(`Camera ${deviceId} is exposing, polling state properties`)
              propsToFetch.push('camerastate')
              propsToFetch.push('imageready')
            }

            // Fetch all properties and update
            const properties: Record<string, unknown> = {}

            // Try to use devicestate if not marked as unsupported
            let deviceStateResult: Record<string, unknown> | null = null

            // Only try devicestate if we haven't marked it as unsupported
            if (!this._deviceStateUnsupported.has(deviceId)) {
              deviceStateResult = await this.fetchDeviceState(deviceId, {
                forceRefresh: true, // Always get fresh data during polling
                cacheTtlMs: pollInterval / 2 // Cache for half the polling interval
              })

              if (deviceStateResult) {
                // Update our tracking of which properties are available via devicestate
                const deviceStateProps =
                  this._deviceStateAvailableProps.get(deviceId) || new Set<string>()

                // Add all received properties to our available props set
                Object.keys(deviceStateResult).forEach((prop) => {
                  deviceStateProps.add(prop.toLowerCase())
                })

                // Update the set
                this._deviceStateAvailableProps.set(deviceId, deviceStateProps)

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
            const deviceStateProps =
              this._deviceStateAvailableProps.get(deviceId) || new Set<string>()

            // Filter properties that need to be individually fetched
            const individualPropsToFetch = propsToFetch.filter(
              (prop) => !deviceStateResult || !deviceStateProps.has(prop.toLowerCase())
            )

            if (individualPropsToFetch.length > 0) {
              // Debug log showing exactly which properties are being polled
              console.debug(`Camera ${deviceId} properties being polled:`, individualPropsToFetch)

              // Check if we're polling state properties and log clearly
              const pollingStateProps = individualPropsToFetch.some(
                (prop) => prop === 'camerastate' || prop === 'imageready'
              )
              if (pollingStateProps) {
                console.log(
                  `%c Camera ${deviceId} polling state properties - isExposing: ${isExposing}`,
                  'color: blue; font-weight: bold'
                )
              }

              for (const property of individualPropsToFetch) {
                try {
                  // Log each individual fetch for state properties
                  if (property === 'camerastate' || property === 'imageready') {
                    console.log(`%c📊 Polling individual property: ${property}`, 'color: green')
                  }

                  const value = await client.getProperty(property)
                  properties[property] = value
                } catch (error) {
                  // Silently ignore errors for properties that might not be supported
                  // Only log in debug mode to avoid console spam
                  if (
                    property === 'camerastate' ||
                    property === 'ccdtemperature' ||
                    property === 'imageready'
                  ) {
                    console.debug(`Failed to get important camera property ${property}:`, error)
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
              if (properties.cooleron !== undefined)
                friendlyProperties.coolerEnabled = properties.cooleron
              if (properties.ccdtemperature !== undefined)
                friendlyProperties.temperature = properties.ccdtemperature
              if (properties.setccdtemperature !== undefined)
                friendlyProperties.targetTemperature = properties.setccdtemperature
              if (properties.coolerpower !== undefined)
                friendlyProperties.coolerPower = properties.coolerpower

              // Add any non-undefined properties
              if (Object.keys(friendlyProperties).length > 0) {
                this.updateDeviceProperties(deviceId, friendlyProperties)
              }
            }
          } catch (error) {
            console.error(`Error polling properties for camera ${deviceId}:`, error)
          }
        }, pollInterval)

        // Store the interval ID
        // Note: Window.setInterval returns a number ID
        this._propertyPollingIntervals.set(deviceId, intervalId)

        console.log(
          `Property polling started for camera ${deviceId} with interval ${pollInterval}ms`
        )
      },

      /**
       * Stop polling for camera properties
       */
      stopCameraPropertyPolling(
        this: CameraState & {
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string
      ): void {
        if (!this._propertyPollingIntervals) {
          return
        }

        const intervalId = this._propertyPollingIntervals.get(deviceId)

        if (intervalId) {
          console.log(`Stopping property polling for camera ${deviceId}`)
          clearInterval(intervalId)
          this._propertyPollingIntervals.delete(deviceId)

          // Clean up devicestate tracking
          this.updateDeviceProperties(deviceId, {
            usingDeviceState: false
          })
        }
      },

      /**
       * Change the polling interval for a device
       */
      setPropertyPollingInterval(
        this: CameraState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          startCameraPropertyPolling: (deviceId: string) => void
        },
        deviceId: string,
        intervalMs: number
      ): void {
        if (intervalMs < 100) {
          console.warn(`Polling interval too small (${intervalMs}ms), using 100ms minimum`)
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
      setPreferredImageFormat(
        this: CameraState & {
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          getDeviceById: (id: string) => Device | null
        },
        deviceId: string,
        format: 'binary' | 'json'
      ): void {
        const device = this.getDeviceById(deviceId)
        if (!device) {
          console.error(`Cannot set preferred image format: Device not found ${deviceId}`)
          return
        }

        if (device.type !== 'camera') {
          console.error(`Device ${deviceId} is not a camera`)
          return
        }

        console.log(`Setting preferred image format for ${deviceId} to ${format}`)
        this.updateDeviceProperties(deviceId, {
          preferredImageFormat: format
        })
      },

      /**
       * Cleanup all device state tracking when a device is disconnected or removed
       */
      cleanupDeviceState(this: CameraState, deviceId: string): void {
        console.log(`Cleaning up device state tracking for camera ${deviceId}`)

        // Remove from device state tracking
        this._deviceStateAvailableProps.delete(deviceId)
        this._deviceStateUnsupported.delete(deviceId)
      },

      /**
       * Handle device disconnection
       * Clean up all resources and stop polling
       */
      handleDeviceDisconnected(
        this: CameraState & {
          stopCameraPropertyPolling: (deviceId: string) => void
          cleanupDeviceState: (deviceId: string) => void
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string
      ): void {
        console.log(`Handling disconnection for camera ${deviceId}`)

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
      handleDeviceConnected(
        this: CameraState & {
          startCameraPropertyPolling: (deviceId: string) => void
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string
      ): void {
        console.log(`Handling connection for camera ${deviceId}`)

        // Initialize devicestate tracking for this device
        if (!this._deviceStateAvailableProps.has(deviceId)) {
          this._deviceStateAvailableProps.set(deviceId, new Set<string>())
        }

        // Remove from unsupported list in case it was previously added
        this._deviceStateUnsupported.delete(deviceId)

        // Start property polling
        this.startCameraPropertyPolling(deviceId)
      }
    }
  }
}
