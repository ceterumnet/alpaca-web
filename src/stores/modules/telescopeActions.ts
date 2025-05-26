// Status: Good - Core Module
// This is the telescope actions module that:
// - Implements telescope control operations
// - Handles mount positioning and tracking
// - Provides coordinate transformations
// - Supports telescope automation
// - Maintains telescope state

/**
 * Telescope Actions Module
 *
 * Provides functionality for interacting with telescope devices
 */

import type { Device } from '@/types/device.types'
import type { DeviceEvent } from '../types/device-store.types'
import type { AlpacaClient } from '@/api/AlpacaClient'
import type { TelescopeClient } from '@/api/alpaca/telescope-client'
import { formatSiderealTime, parseRaString, parseDecString } from '@/utils/astroCoordinates'
import log from '@/plugins/logger'

// Define telescope state interface with property polling intervals
export interface TelescopeState {
  _propertyPollingIntervals: Map<string, number>
  _deviceStateAvailableProps: Map<string, Set<string>> // Track which properties are available via devicestate for each device
  _deviceStateUnsupported: Set<string> // Track devices that don't support devicestate
}

export function createTelescopeActions() {
  return {
    state: (): TelescopeState => ({
      _propertyPollingIntervals: new Map<string, number>(),
      _deviceStateAvailableProps: new Map<string, Set<string>>(),
      _deviceStateUnsupported: new Set<string>()
    }),

    actions: {
      /**
       * Fetch telescope properties after successful connection
       * Updates the device store with all available telescope properties
       */
      async fetchTelescopeProperties(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          startTelescopePropertyPolling: (deviceId: string) => void
        },
        deviceId: string
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Fetching properties for telescope ${deviceId}.`)

        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Device not found: ${deviceId}`)
        }

        if (device.type !== 'telescope') {
          throw new Error(`Device ${deviceId} is not a telescope`)
        }

        const client = this.getDeviceClient(deviceId)
        if (!client) {
          throw new Error(`No API client available for device ${deviceId}`)
        }

        try {
          // Define the read-only properties we want to fetch once
          const readOnlyProperties = [
            // Telescope capabilities
            'canfindhome',
            'canpark',
            'cansetpark',
            'canpulseguide',
            'cansettracking',
            'canslew',
            'canslewaltaz',
            'cansync',
            'cansyncaltaz',
            // Mount configuration
            'alignmentmode',
            'equatorialsystem',
            'focallength',
            'doesrefraction',
            // Site information
            'siteelevation',
            'sitelatitude',
            'sitelongitude',
            // Available options
            'trackingrates'
          ]

          // Fetch all read-only properties
          const properties: Record<string, unknown> = {}

          for (const property of readOnlyProperties) {
            try {
              const value = await client.getProperty(property)
              properties[property] = value
              log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Telescope ${deviceId} property ${property} = ${value}.`)
            } catch (error) {
              log.warn({ deviceIds: [deviceId] }, `[TelescopeActions] Failed to get telescope property ${property}:`, error)
            }
          }

          // Map properties to friendlier names if needed
          const friendlyProperties: Record<string, unknown> = {
            // Add any useful remapped properties here
            canPark: properties.canpark,
            canUnpark: properties.canpark, // Note: Alpaca only has canpark, not canunpark
            canSetTracking: properties.cansettracking,
            canSlew: properties.canslew
          }

          // Add any non-undefined properties to the device
          const filteredFriendlyProps = Object.entries(friendlyProperties)
            .filter(([, value]) => value !== undefined)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})

          // Update with capability properties
          this.updateDeviceProperties(deviceId, {
            ...properties,
            ...filteredFriendlyProps
          })

          // Now start polling for the read/write properties
          this.startTelescopePropertyPolling(deviceId)

          log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Successfully fetched properties for telescope ${deviceId}.`)
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error fetching properties for telescope ${deviceId}.`, error)
          return false
        }
      },

      /**
       * Start polling for telescope dynamic properties
       * These properties can change and should be periodically updated
       */
      startTelescopePropertyPolling(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          stopTelescopePropertyPolling: (deviceId: string) => void
          _emitEvent: (event: DeviceEvent) => void
          fetchDeviceState: (deviceId: string, options?: { forceRefresh?: boolean; cacheTtlMs?: number }) => Promise<Record<string, unknown> | null>
        },
        deviceId: string
      ): void {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Starting property polling for telescope ${deviceId}.`)

        const device = this.getDeviceById(deviceId)
        if (!device) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Cannot start polling: Device not found ${deviceId}.`)
          return
        }

        // Define the dynamic properties to poll
        const dynamicProperties = [
          // Position data
          'rightascension',
          'declination',
          'altitude',
          'azimuth',
          'siderealtime',
          // Moving state
          'slewing',
          'tracking',
          'trackingrate',
          // At positions
          'atpark',
          'athome',
          // Other dynamic properties
          'utcdate',
          'sideofpier'
        ]

        // Get polling interval from device properties or use default
        const properties = device.properties || {}
        const pollInterval = (properties.propertyPollIntervalMs as number) || 1000 // Default 1 second for telescopes

        // Initialize the interval map if not already done
        if (!this._propertyPollingIntervals) {
          this._propertyPollingIntervals = new Map<string, number>()
        }

        // Initialize devicestate available properties for this device if not already done
        if (!this._deviceStateAvailableProps) {
          this._deviceStateAvailableProps = new Map<string, Set<string>>()
        }

        if (!this._deviceStateAvailableProps.has(deviceId)) {
          this._deviceStateAvailableProps.set(deviceId, new Set<string>())
        }

        // Ensure the unsupported set is initialized
        if (!this._deviceStateUnsupported) {
          this._deviceStateUnsupported = new Set<string>()
        }

        // Clear any existing interval first
        this.stopTelescopePropertyPolling(deviceId)

        // Create new interval
        const intervalId = window.setInterval(async () => {
          try {
            // If device is disconnected, stop polling
            const currentDevice = this.getDeviceById(deviceId)
            if (!currentDevice || !currentDevice.isConnected) {
              log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Device ${deviceId} is no longer connected, stopping property polling.`)
              this.stopTelescopePropertyPolling(deviceId)
              return
            }

            const client = this.getDeviceClient(deviceId)
            if (!client) {
              log.warn({ deviceIds: [deviceId] }, `[TelescopeActions] No client available for device ${deviceId}, stopping property polling.`)
              this.stopTelescopePropertyPolling(deviceId)
              return
            }

            // Fetch all properties and update
            const properties: Record<string, unknown> = {}
            const coordinateProps: Record<string, unknown> = {}

            // Only try to get properties using devicestate if device is not in the unsupported list
            let deviceState: Record<string, unknown> | null = null
            const availableProps = this._deviceStateAvailableProps.get(deviceId) || new Set<string>()

            if (!this._deviceStateUnsupported.has(deviceId)) {
              // We either haven't tried devicestate yet, or we know it's supported
              try {
                // Use the fetchDeviceState with proper caching options
                // During regular polling, force refresh to get fresh data
                deviceState = await this.fetchDeviceState(deviceId, {
                  forceRefresh: true, // Always get fresh data during polling
                  cacheTtlMs: pollInterval / 2 // Cache for half the polling interval
                })

                // If this is our first successful devicestate call, record which properties are available
                if (deviceState && availableProps.size === 0) {
                  for (const prop of dynamicProperties) {
                    if (deviceState[prop] !== undefined) {
                      availableProps.add(prop)
                    }
                  }
                  log.debug(
                    { deviceIds: [deviceId] },
                    `[TelescopeActions] Device ${deviceId} has ${availableProps.size} properties available via devicestate:`,
                    Array.from(availableProps)
                  )

                  // Update the available properties map
                  this._deviceStateAvailableProps.set(deviceId, availableProps)
                }
              } catch (error) {
                log.warn({ deviceIds: [deviceId] }, `[TelescopeActions] Error fetching devicestate for ${deviceId}:`, error)
                // If devicestate completely fails, mark as unsupported to avoid future attempts
                this._deviceStateUnsupported.add(deviceId)
                deviceState = null
              }
            }

            // If we got valid device state, extract the properties we care about
            if (deviceState) {
              // Set a flag to indicate we're using devicestate for efficient polling
              properties.isUsingDeviceState = true

              for (const prop of dynamicProperties) {
                // Only use properties available via devicestate (that we've confirmed before)
                if (availableProps.has(prop)) {
                  const value = deviceState[prop]
                  if (value !== undefined) {
                    properties[prop] = value

                    // Also populate coordinate properties
                    if (prop === 'rightascension' || prop === 'declination' || prop === 'altitude' || prop === 'azimuth' || prop === 'siderealtime') {
                      coordinateProps[prop] = value

                      // Also map to camelCase for better UI compatibility
                      if (prop === 'rightascension') {
                        coordinateProps['rightAscension'] = value
                      } else if (prop === 'siderealtime') {
                        coordinateProps['lst'] = formatSiderealTime(value as number)
                      }
                    }
                  }
                }
              }
            }

            // For any properties not covered by devicestate, poll them individually
            // Only poll individually if devicestate failed completely or for properties not in devicestate
            const remainingProps = deviceState
              ? dynamicProperties.filter((prop) => {
                  // If property is in availableProps but undefined in deviceState, the property
                  // is supported by devicestate but has no value right now
                  // If property is not in availableProps, it's not supported by devicestate
                  return !availableProps.has(prop)
                })
              : dynamicProperties

            if (remainingProps.length > 0) {
              if (deviceState) {
                log.debug(
                  { deviceIds: [deviceId] },
                  `[TelescopeActions] Polling ${remainingProps.length} remaining properties individually for device ${deviceId}: ${remainingProps.join(', ')}`
                )
              } else {
                log.debug(
                  { deviceIds: [deviceId] },
                  `[TelescopeActions] Polling all ${remainingProps.length} properties individually for device ${deviceId} (devicestate not available)`
                )
              }

              for (const property of remainingProps) {
                try {
                  const value = await client.getProperty(property)

                  // Store position data in both the top level (for backwards compatibility)
                  // and in a nested coordinates object (for the UI)
                  properties[property] = value

                  // Add coordinate properties to separate object
                  if (
                    property === 'rightascension' ||
                    property === 'declination' ||
                    property === 'altitude' ||
                    property === 'azimuth' ||
                    property === 'siderealtime'
                  ) {
                    coordinateProps[property] = value

                    // Also map to camelCase for better UI compatibility
                    if (property === 'rightascension') {
                      coordinateProps['rightAscension'] = value
                    } else if (property === 'siderealtime') {
                      coordinateProps['lst'] = formatSiderealTime(value as number)
                    }
                  }
                } catch (error) {
                  // Silently ignore errors for properties that might not be supported
                  // Only log important properties
                  if (property === 'rightascension' || property === 'declination' || property === 'tracking') {
                    log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Failed to get important telescope property ${property}:`, error)
                  }
                }
              }
            }

            if (Object.keys(properties).length > 0) {
              // Create a combined update with both the individual properties
              // and the nested coordinates object
              const updates: Record<string, unknown> = {
                ...properties,

                // Add for UI compatibility - these are the properties the UI expects
                rightAscension: properties.rightascension,
                declination: properties.declination,
                altitude: properties.altitude,
                azimuth: properties.azimuth,

                // Add a nested coordinates object that the UI components expect
                coordinates: {
                  ...coordinateProps,
                  // Ensure we have the fields the UI explicitly looks for
                  rightAscension: properties.rightascension,
                  declination: properties.declination,
                  altitude: properties.altitude,
                  azimuth: properties.azimuth,
                  lst: formatSiderealTime(properties.siderealtime as number)
                }
              }

              // Update the device with polled properties
              this.updateDeviceProperties(deviceId, updates)

              // Check if tracking state changed
              if (properties.tracking !== undefined && device.properties?.tracking !== properties.tracking) {
                // Emit tracking changed event
                this._emitEvent({
                  type: 'telescopeTrackingChanged',
                  deviceId,
                  enabled: properties.tracking as boolean,
                  rate: properties.trackingrate as number
                })
              }

              // Check if slewing completed
              if (properties.slewing !== undefined && device.properties?.slewing === true && properties.slewing === false) {
                // Telescope was slewing and now stopped - emit slew completed event
                this._emitEvent({
                  type: 'telescopeSlewComplete',
                  deviceId,
                  coordinates: {
                    rightAscension: properties.rightascension as number,
                    declination: properties.declination as number,
                    altitude: properties.altitude as number,
                    azimuth: properties.azimuth as number
                  }
                })
              }
            }
          } catch (error) {
            log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error polling properties for telescope ${deviceId}:`, error)
          }
        }, pollInterval)

        // Store the interval ID
        // Note: Window.setInterval returns a number ID
        this._propertyPollingIntervals.set(deviceId, intervalId)

        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Property polling started for telescope ${deviceId} with interval ${pollInterval}ms`)
      },

      /**
       * Stop polling for telescope properties
       */
      stopTelescopePropertyPolling(this: TelescopeState, deviceId: string): void {
        if (!this._propertyPollingIntervals) {
          return
        }

        const intervalId = this._propertyPollingIntervals.get(deviceId)

        if (intervalId) {
          log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Stopping property polling for telescope ${deviceId}.`)
          clearInterval(intervalId)
          this._propertyPollingIntervals.delete(deviceId)
        }
      },

      /**
       * Change the polling interval for a telescope device
       */
      setTelescopePollingInterval(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          startTelescopePropertyPolling: (deviceId: string) => void
        },
        deviceId: string,
        intervalMs: number
      ): void {
        if (intervalMs < 100) {
          log.warn({ deviceIds: [deviceId] }, `[TelescopeActions] Polling interval too small (${intervalMs}ms), using 100ms minimum`)
          intervalMs = 100
        }

        // Update device property with new interval
        this.updateDeviceProperties(deviceId, {
          propertyPollIntervalMs: intervalMs
        })

        // Restart polling with new interval
        this.startTelescopePropertyPolling(deviceId)
      },

      /**
       * Park the telescope using standard ASCOM Alpaca method
       */
      async parkTelescope(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Parking telescope ${deviceId}.`)

        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Device not found: ${deviceId}`)
        }

        if (device.type !== 'telescope') {
          throw new Error(`Device ${deviceId} is not a telescope`)
        }

        try {
          // Emit event before parking attempt
          this._emitEvent({
            type: 'telescopeParkStarted',
            deviceId
          })

          // Call Park method with no parameters according to ASCOM standard
          // Method name should be lowercase in URL
          await this.callDeviceMethod(deviceId, 'park', [])

          // Update device properties
          this.updateDeviceProperties(deviceId, {
            atpark: true
          })

          // Emit event on success
          this._emitEvent({
            type: 'telescopeParked',
            deviceId
          })

          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error parking telescope ${deviceId}:`, error)

          // Emit error event
          this._emitEvent({
            type: 'telescopeParkError',
            deviceId,
            error: String(error)
          })

          throw error
        }
      },

      /**
       * Unpark the telescope using standard ASCOM Alpaca method
       */
      async unparkTelescope(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Unparking telescope ${deviceId}.`)

        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Device not found: ${deviceId}`)
        }

        if (device.type !== 'telescope') {
          throw new Error(`Device ${deviceId} is not a telescope`)
        }

        try {
          // Emit event before unparking attempt
          this._emitEvent({
            type: 'telescopeUnparkStarted',
            deviceId
          })

          // Call Unpark method with no parameters according to ASCOM standard
          // Method name should be lowercase in URL
          await this.callDeviceMethod(deviceId, 'unpark', [])

          // Update device properties
          this.updateDeviceProperties(deviceId, {
            atpark: false
          })

          // Emit event on success
          this._emitEvent({
            type: 'telescopeUnparked',
            deviceId
          })

          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error unparking telescope ${deviceId}:`, error)

          // Emit error event
          this._emitEvent({
            type: 'telescopeUnparkError',
            deviceId,
            error: String(error)
          })

          throw error
        }
      },

      /**
       * Set telescope tracking state
       */
      async setTelescopeTracking(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        enabled: boolean,
        trackingRate?: number
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Setting tracking for telescope ${deviceId} to ${enabled}, rate: ${trackingRate}.`)
        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Device not found: ${deviceId}`)
        }

        try {
          // Set tracking state
          await this.callDeviceMethod(deviceId, 'settracking', [enabled])
          this.updateDeviceProperties(deviceId, { tracking: enabled })

          // Set tracking rate if provided
          if (trackingRate !== undefined) {
            await this.callDeviceMethod(deviceId, 'trackingrate', [trackingRate]) // This should be 'settrackingrate' or similar based on client
            this.updateDeviceProperties(deviceId, { trackingrate: trackingRate })
          }

          this._emitEvent({
            type: 'devicePropertyChanged',
            deviceId,
            property: 'tracking',
            value: { enabled, trackingRate }
          } as DeviceEvent)
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error setting tracking for telescope ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set tracking: ${error}` } as DeviceEvent)
          return false
        }
      },

      async setTelescopeGuideRateDeclination(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null // Should be TelescopeClient
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          fetchTelescopeProperties: (deviceId: string) => Promise<boolean> // or a more specific refresh
        },
        deviceId: string,
        rate: number
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Setting guide rate declination for telescope ${deviceId} to ${rate}.`)
        const client = this.getDeviceClient(deviceId) as TelescopeClient | null
        if (!client) {
          throw new Error(`No Telescope client available for device ${deviceId}`)
        }
        try {
          await client.setGuideRateDeclination(rate)
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'setGuideRateDeclination',
            args: [rate],
            result: 'success'
          } as DeviceEvent)
          await this.fetchTelescopeProperties(deviceId) // Re-fetch to update state
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error setting guide rate declination for telescope ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set guide rate declination: ${error}` } as DeviceEvent)
          return false
        }
      },

      async setTelescopeGuideRateRightAscension(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null // Should be TelescopeClient
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          fetchTelescopeProperties: (deviceId: string) => Promise<boolean>
        },
        deviceId: string,
        rate: number
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Setting guide rate right ascension for telescope ${deviceId} to ${rate}.`)
        const client = this.getDeviceClient(deviceId) as TelescopeClient | null
        if (!client) {
          throw new Error(`No Telescope client available for device ${deviceId}`)
        }
        try {
          await client.setGuideRateRightAscension(rate)
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'setGuideRateRightAscension',
            args: [rate],
            result: 'success'
          } as DeviceEvent)
          await this.fetchTelescopeProperties(deviceId) // Re-fetch to update state
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error setting guide rate right ascension for telescope ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set guide rate RA: ${error}` } as DeviceEvent)
          return false
        }
      },

      async setTelescopeSlewSettleTime(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null // Should be TelescopeClient
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          fetchTelescopeProperties: (deviceId: string) => Promise<boolean>
        },
        deviceId: string,
        time: number
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Setting slew settle time for telescope ${deviceId} to ${time}.`)
        const client = this.getDeviceClient(deviceId) as TelescopeClient | null
        if (!client) {
          throw new Error(`No Telescope client available for device ${deviceId}`)
        }
        try {
          await client.setSlewSettleTime(time)
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'setSlewSettleTime',
            args: [time],
            result: 'success'
          } as DeviceEvent)
          await this.fetchTelescopeProperties(deviceId) // Re-fetch to update state
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error setting slew settle time for telescope ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: `Failed to set slew settle time: ${error}` } as DeviceEvent)
          return false
        }
      },

      /**
       * Slew the telescope to specified coordinates
       */
      async slewToCoordinates(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        rightAscension: number,
        declination: number,
        useAsync: boolean = true
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Slewing telescope ${deviceId} to RA/Dec:`, {
          rightAscension,
          declination,
          useAsync
        })

        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Device not found: ${deviceId}`)
        }

        if (device.type !== 'telescope') {
          throw new Error(`Device ${deviceId} is not a telescope`)
        }

        try {
          // Update target coordinates first - use proper capitalization for parameters
          // According to ASCOM Alpaca spec, parameter names should be capitalized properly
          await this.callDeviceMethod(deviceId, 'targetrightascension', [{ TargetRightAscension: rightAscension }])
          await this.callDeviceMethod(deviceId, 'targetdeclination', [{ TargetDeclination: declination }])

          // Emit slew started event
          this._emitEvent({
            type: 'telescopeSlewStarted',
            deviceId,
            targetRA: rightAscension,
            targetDec: declination
          })

          // Execute appropriate slew method based on async preference
          if (useAsync) {
            // Method name should be lowercase in URL but preserve capitalization in parameters
            await this.callDeviceMethod(deviceId, 'slewtocoordinatesasync', [{ RightAscension: rightAscension, Declination: declination }])
          } else {
            // Method name should be lowercase in URL but preserve capitalization in parameters
            await this.callDeviceMethod(deviceId, 'slewtocoordinates', [{ RightAscension: rightAscension, Declination: declination }])

            // For synchronous slew, update properties and emit completed event
            this.updateDeviceProperties(deviceId, {
              rightascension: rightAscension,
              declination: declination,
              slewing: false
            })

            this._emitEvent({
              type: 'telescopeSlewComplete',
              deviceId,
              coordinates: {
                rightAscension,
                declination
              }
            })
          }

          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error slewing telescope ${deviceId}:`, error)

          // Emit error event
          this._emitEvent({
            type: 'telescopeSlewError',
            deviceId,
            error: String(error),
            coordinates: {
              rightAscension,
              declination
            }
          })

          throw error
        }
      },

      /**
       * Slew the telescope to Alt/Az coordinates
       */
      async slewToAltAz(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        altitude: number,
        azimuth: number,
        useAsync: boolean = true
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Slewing telescope ${deviceId} to Alt/Az:`, {
          altitude,
          azimuth,
          useAsync
        })

        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Device not found: ${deviceId}`)
        }

        if (device.type !== 'telescope') {
          throw new Error(`Device ${deviceId} is not a telescope`)
        }

        try {
          // Emit slew started event
          this._emitEvent({
            type: 'telescopeSlewStarted',
            deviceId,
            targetAlt: altitude,
            targetAz: azimuth
          })

          // Set target altitude and azimuth first - use proper capitalization for parameters
          await this.callDeviceMethod(deviceId, 'targetaltitude', [{ TargetAltitude: altitude }])
          await this.callDeviceMethod(deviceId, 'targetazimuth', [{ TargetAzimuth: azimuth }])

          // Execute appropriate slew method based on async preference
          if (useAsync) {
            // Method name should be lowercase in URL but preserve capitalization in parameters
            await this.callDeviceMethod(deviceId, 'slewtoaltazasync', [])
          } else {
            // Method name should be lowercase in URL but preserve capitalization in parameters
            await this.callDeviceMethod(deviceId, 'slewtoaltaz', [])

            // For synchronous slew, update properties and emit completed event
            this.updateDeviceProperties(deviceId, {
              altitude: altitude,
              azimuth: azimuth,
              slewing: false
            })

            this._emitEvent({
              type: 'telescopeSlewComplete',
              deviceId,
              coordinates: {
                altitude,
                azimuth
              }
            })
          }

          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error slewing telescope ${deviceId} to Alt/Az:`, error)

          // Emit error event
          this._emitEvent({
            type: 'telescopeSlewError',
            deviceId,
            error: String(error),
            coordinates: {
              altitude,
              azimuth
            }
          })

          throw error
        }
      },

      /**
       * Abort any in-progress slew operation
       */
      async abortSlew(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Aborting slew for telescope ${deviceId}.`)

        const device = this.getDeviceById(deviceId)
        if (!device) {
          throw new Error(`Device not found: ${deviceId}`)
        }

        if (device.type !== 'telescope') {
          throw new Error(`Device ${deviceId} is not a telescope`)
        }

        try {
          // Call AbortSlew method with proper lowercase URL
          await this.callDeviceMethod(deviceId, 'abortslew', [])

          // Update device properties
          this.updateDeviceProperties(deviceId, {
            slewing: false
          })

          // Emit event
          this._emitEvent({
            type: 'telescopeSlewAborted',
            deviceId
          })

          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error aborting slew for telescope ${deviceId}:`, error)
          throw error
        }
      },

      /**
       * Slew the telescope to specified coordinates using string inputs for RA and Dec.
       */
      async slewToCoordinatesString(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
          slewToCoordinates: (deviceId: string, rightAscension: number, declination: number, useAsync?: boolean) => Promise<boolean>
        },
        deviceId: string,
        raString: string,
        decString: string,
        useAsync: boolean = true
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Slewing telescope ${deviceId} to RA/Dec strings:`, {
          raString,
          decString,
          useAsync
        })

        const device = this.getDeviceById(deviceId)
        if (!device) {
          const errorMsg = `Device not found: ${deviceId} (input RA: "${raString}", Dec: "${decString}")`
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] slewToCoordinatesString: ${errorMsg}`)
          this._emitEvent({
            type: 'telescopeSlewError',
            deviceId,
            error: errorMsg,
            coordinates: {} // Pass empty object if coordinates are not applicable
          })
          return false
        }

        if (device.type !== 'telescope') {
          const errorMsg = `Device ${deviceId} is not a telescope (input RA: "${raString}", Dec: "${decString}")`
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] slewToCoordinatesString: ${errorMsg}`)
          this._emitEvent({
            type: 'telescopeSlewError',
            deviceId,
            error: errorMsg,
            coordinates: {} // Pass empty object if coordinates are not applicable
          })
          return false
        }

        try {
          const rightAscension = parseRaString(raString)
          const declination = parseDecString(decString)

          return await this.slewToCoordinates(deviceId, rightAscension, declination, useAsync)
        } catch (error: unknown) {
          let errorMessage = 'Unknown error during slew to string coordinates'
          if (error instanceof Error) {
            errorMessage = `Error parsing RA/Dec strings or slewing: ${error.message} (input RA: "${raString}", Dec: "${decString}")`
          } else {
            errorMessage = `Unknown error parsing RA/Dec strings or slewing (input RA: "${raString}", Dec: "${decString}")`
          }
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] slewToCoordinatesString for telescope ${deviceId}:`, errorMessage, error)
          this._emitEvent({
            type: 'telescopeSlewError',
            deviceId,
            error: errorMessage,
            coordinates: {} // Pass empty object if coordinates are not applicable
          })
          return false
        }
      },

      /**
       * Find Home (ASCOM Alpaca)
       */
      async findHome(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Finding home for telescope ${deviceId}.`)
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        try {
          // Use deviceMethodCalled for start
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'findhome', args: [], result: undefined })
          await this.callDeviceMethod(deviceId, 'findhome', [])
          // Use devicePropertyChanged to indicate at home (if property exists)
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'athome', value: true })
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error finding home for telescope ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: String(error) })
          throw error
        }
      },

      /**
       * Sync to Coordinates (RA/Dec)
       */
      async syncToCoordinates(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        rightAscension: number,
        declination: number
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Syncing telescope ${deviceId} to RA/Dec:`, { rightAscension, declination })
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        try {
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'synctocoordinates',
            args: [{ RightAscension: rightAscension, Declination: declination }],
            result: undefined
          })
          await this.callDeviceMethod(deviceId, 'synctocoordinates', [{ RightAscension: rightAscension, Declination: declination }])
          // Use devicePropertyChanged to indicate sync
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'lastSync', value: { rightAscension, declination } })
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error syncing telescope ${deviceId} to coordinates:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: String(error) })
          throw error
        }
      },

      /**
       * Sync to Alt/Az
       */
      async syncToAltAz(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        altitude: number,
        azimuth: number
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Syncing telescope ${deviceId} to Alt/Az:`, { altitude, azimuth })
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        try {
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'synctoaltaz',
            args: [{ Altitude: altitude, Azimuth: azimuth }],
            result: undefined
          })
          await this.callDeviceMethod(deviceId, 'synctoaltaz', [{ Altitude: altitude, Azimuth: azimuth }])
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'lastSyncAltAz', value: { altitude, azimuth } })
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error syncing telescope ${deviceId} to Alt/Az:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: String(error) })
          throw error
        }
      },

      /**
       * Sync to Target
       */
      async syncToTarget(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Syncing telescope ${deviceId} to target.`)
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        try {
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'synctotarget', args: [], result: undefined })
          await this.callDeviceMethod(deviceId, 'synctotarget', [])
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'lastSyncTarget', value: true })
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error syncing telescope ${deviceId} to target:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: String(error) })
          throw error
        }
      },

      /**
       * Slew to Target (ASCOM Alpaca)
       */
      async slewToTarget(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Slewing telescope ${deviceId} to target.`)
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        try {
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'slewtotarget', args: [], result: undefined })
          await this.callDeviceMethod(deviceId, 'slewtotarget', [])
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'lastSlewToTarget', value: true })
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error slewing telescope ${deviceId} to target:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: String(error) })
          throw error
        }
      },

      /**
       * Slew to Target Async (ASCOM Alpaca)
       */
      async slewToTargetAsync(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Slewing telescope ${deviceId} to target (async).`)
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        try {
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'slewtotargetasync', args: [], result: undefined })
          await this.callDeviceMethod(deviceId, 'slewtotargetasync', [])
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'lastSlewToTargetAsync', value: true })
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error slewing telescope ${deviceId} to target (async):`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: String(error) })
          throw error
        }
      },

      /**
       * Move Axis (ASCOM Alpaca)
       */
      async moveAxis(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        axis: number,
        rate: number
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Moving axis ${axis} at rate ${rate} for telescope ${deviceId}.`)
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        try {
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'moveaxis', args: [axis, rate], result: undefined })
          await this.callDeviceMethod(deviceId, 'moveaxis', [axis, rate])
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: `lastMoveAxis_${axis}`, value: rate })
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error moving axis for telescope ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: String(error) })
          throw error
        }
      },

      /**
       * Pulse Guide (ASCOM Alpaca)
       */
      async pulseGuide(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        direction: number,
        duration: number
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Pulse guiding telescope ${deviceId} direction ${direction} for ${duration}ms.`)
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        try {
          this._emitEvent({ type: 'deviceMethodCalled', deviceId, method: 'pulseguide', args: [direction, duration], result: undefined })
          await this.callDeviceMethod(deviceId, 'pulseguide', [direction, duration])
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'lastPulseGuide', value: { direction, duration } })
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error pulse guiding telescope ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: String(error) })
          throw error
        }
      },

      /**
       * Set Target Right Ascension (ASCOM Alpaca)
       */
      async setTargetRightAscension(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        rightAscension: number
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Setting target right ascension for telescope ${deviceId}: ${rightAscension}`)
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        try {
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'targetrightascension',
            args: [{ TargetRightAscension: rightAscension }],
            result: undefined
          })
          await this.callDeviceMethod(deviceId, 'targetrightascension', [{ TargetRightAscension: rightAscension }])
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'targetRightAscension', value: rightAscension })
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error setting target right ascension for telescope ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: String(error) })
          throw error
        }
      },

      /**
       * Set Target Declination (ASCOM Alpaca)
       */
      async setTargetDeclination(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
          _emitEvent: (event: DeviceEvent) => void
          callDeviceMethod: (deviceId: string, method: string, args: unknown[]) => Promise<unknown>
        },
        deviceId: string,
        declination: number
      ): Promise<boolean> {
        log.debug({ deviceIds: [deviceId] }, `[TelescopeActions] Setting target declination for telescope ${deviceId}: ${declination}`)
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        try {
          this._emitEvent({
            type: 'deviceMethodCalled',
            deviceId,
            method: 'targetdeclination',
            args: [{ TargetDeclination: declination }],
            result: undefined
          })
          await this.callDeviceMethod(deviceId, 'targetdeclination', [{ TargetDeclination: declination }])
          this._emitEvent({ type: 'devicePropertyChanged', deviceId, property: 'targetDeclination', value: declination })
          return true
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error setting target declination for telescope ${deviceId}:`, error)
          this._emitEvent({ type: 'deviceApiError', deviceId, error: String(error) })
          throw error
        }
      },

      /**
       * Get isPulseGuiding (ASCOM Alpaca)
       * This is a getter, polled if not available via devicestate.
       */
      async getIsPulseGuiding(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string
      ): Promise<boolean | null> {
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        const client = this.getDeviceClient(deviceId)
        if (!client) throw new Error(`No API client available for device ${deviceId}`)
        try {
          const value = await client.getProperty('ispulseguiding')
          this.updateDeviceProperties(deviceId, { isPulseGuiding: value })
          return Boolean(value)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error getting isPulseGuiding for telescope ${deviceId}:`, error)
          return null
        }
      },

      /**
       * Get Aperture Area (ASCOM Alpaca)
       */
      async getApertureArea(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string
      ): Promise<number | null> {
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        const client = this.getDeviceClient(deviceId)
        if (!client) throw new Error(`No API client available for device ${deviceId}`)
        try {
          const value = await client.getProperty('aperturearea')
          this.updateDeviceProperties(deviceId, { apertureArea: value })
          return Number(value)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error getting aperture area for telescope ${deviceId}:`, error)
          return null
        }
      },

      /**
       * Get Aperture Diameter (ASCOM Alpaca)
       */
      async getApertureDiameter(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string
      ): Promise<number | null> {
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        const client = this.getDeviceClient(deviceId)
        if (!client) throw new Error(`No API client available for device ${deviceId}`)
        try {
          const value = await client.getProperty('aperturediameter')
          this.updateDeviceProperties(deviceId, { apertureDiameter: value })
          return Number(value)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error getting aperture diameter for telescope ${deviceId}:`, error)
          return null
        }
      },

      /**
       * Get Axis Rates (ASCOM Alpaca)
       */
      async getAxisRates(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string,
        axis: number
      ): Promise<object[] | null> {
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        const axisRatesClient = this.getDeviceClient(deviceId) as TelescopeClient | null
        if (!axisRatesClient) throw new Error(`No API client available for device ${deviceId}`)
        try {
          // Use the client method, not getProperty
          const value = await axisRatesClient.getAxisRates(axis)
          this.updateDeviceProperties(deviceId, { [`axisRates_${axis}`]: value })
          return Array.isArray(value) ? value : null
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error getting axis rates for telescope ${deviceId}:`, error)
          return null
        }
      },

      /**
       * Get Destination Side Of Pier (ASCOM Alpaca)
       */
      async getDestinationSideOfPier(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string,
        rightAscension: number,
        declination: number
      ): Promise<number | null> {
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        const sideOfPierClient = this.getDeviceClient(deviceId) as TelescopeClient | null
        if (!sideOfPierClient) throw new Error(`No API client available for device ${deviceId}`)
        try {
          // Use the client method, not getProperty
          const value = await sideOfPierClient.getDestinationSideOfPier(rightAscension, declination)
          this.updateDeviceProperties(deviceId, { destinationSideOfPier: value })
          return typeof value === 'number' ? value : null
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error getting destination side of pier for telescope ${deviceId}:`, error)
          return null
        }
      },

      /**
       * Get Guide Rate Declination (ASCOM Alpaca)
       */
      async getGuideRateDeclination(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string
      ): Promise<number | null> {
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        const client = this.getDeviceClient(deviceId)
        if (!client) throw new Error(`No API client available for device ${deviceId}`)
        try {
          const value = await client.getProperty('guideratedeclination')
          this.updateDeviceProperties(deviceId, { guideRateDeclination: value })
          return Number(value)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error getting guide rate declination for telescope ${deviceId}:`, error)
          return null
        }
      },

      /**
       * Get Guide Rate Right Ascension (ASCOM Alpaca)
       */
      async getGuideRateRightAscension(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string
      ): Promise<number | null> {
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        const client = this.getDeviceClient(deviceId)
        if (!client) throw new Error(`No API client available for device ${deviceId}`)
        try {
          const value = await client.getProperty('guideraterightascension')
          this.updateDeviceProperties(deviceId, { guideRateRightAscension: value })
          return Number(value)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error getting guide rate right ascension for telescope ${deviceId}:`, error)
          return null
        }
      },

      /**
       * Get Slew Settle Time (ASCOM Alpaca)
       */
      async getSlewSettleTime(
        this: TelescopeState & {
          getDeviceById: (id: string) => Device | null
          getDeviceClient: (id: string) => AlpacaClient | null
          updateDeviceProperties: (id: string, props: Record<string, unknown>) => boolean
        },
        deviceId: string
      ): Promise<number | null> {
        const device = this.getDeviceById(deviceId)
        if (!device) throw new Error(`Device not found: ${deviceId}`)
        if (device.type !== 'telescope') throw new Error(`Device ${deviceId} is not a telescope`)
        const client = this.getDeviceClient(deviceId)
        if (!client) throw new Error(`No API client available for device ${deviceId}`)
        try {
          const value = await client.getProperty('slewsettletime')
          this.updateDeviceProperties(deviceId, { slewSettleTime: value })
          return Number(value)
        } catch (error) {
          log.error({ deviceIds: [deviceId] }, `[TelescopeActions] Error getting slew settle time for telescope ${deviceId}:`, error)
          return null
        }
      }
    }
  }
}
