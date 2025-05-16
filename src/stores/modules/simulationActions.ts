// Status: Good - Core Module
// This is the simulation actions module that:
// - Implements device simulation features
// - Handles simulated device behavior
// - Provides testing capabilities
// - Supports development testing
// - Maintains simulation state

/**
 * Simulation Actions Module
 *
 * Provides simulated devices that can be used for testing UI functionality
 * when real hardware isn't available.
 *
 * IMPORTANT: These simulations are for UI testing only and are explicitly created,
 * not used as fallbacks for real device failures.
 */

import type { UnifiedStoreType } from '../UnifiedStore'
import type { Device, DeviceEvent } from '../types/device-store.types'

export interface SimulationState {
  allowSimulations: boolean
}

interface ISimulationActions {
  setAllowSimulations(this: UnifiedStoreType, allow: boolean): void
  getSimulatedDevices(this: UnifiedStoreType): Device[]
  simulateCameraExposure(this: UnifiedStoreType, deviceId: string, exposureTime: number, isLight?: boolean): Promise<boolean>
  simulateTelescopeSlew(this: UnifiedStoreType, deviceId: string, ra?: number, dec?: number): Promise<boolean>
  shouldFallbackToSimulation(this: UnifiedStoreType, deviceId: string, method: string): boolean
  simulateDeviceMethod(this: UnifiedStoreType, deviceId: string, method: string, args?: unknown[]): Promise<unknown>
}

export function createSimulationActions(): {
  state: () => SimulationState
  actions: ISimulationActions
} {
  return {
    state: (): SimulationState => ({
      allowSimulations: false // Disabled by default
    }),

    actions: {
      // Enable or disable simulations in the app
      setAllowSimulations(this: UnifiedStoreType, allow: boolean): void {
        this.allowSimulations = allow
        console.log(`Simulations ${allow ? 'enabled' : 'disabled'}`)
      },

      // Get all simulated devices
      getSimulatedDevices(this: UnifiedStoreType): Device[] {
        // In a real implementation, we would have access to the device store properly
        // This is a simplified version that accesses devicesArray directly
        const availableDevices = this.devicesArray || []

        if (Array.isArray(availableDevices)) {
          return availableDevices.filter((device) => device && device.properties && device.properties.isSimulation === true)
        }

        return []
      },

      // Simulate a camera exposure
      simulateCameraExposure(this: UnifiedStoreType, deviceId: string, exposureTime: number, isLight: boolean = true): Promise<boolean> {
        const device = this.getDeviceById(deviceId)
        if (!device) {
          console.error(`[Simulation] Device ${deviceId} not found for simulateCameraExposure.`)
          return Promise.resolve(false)
        }

        console.log(`Simulating camera exposure for ${deviceId} (${exposureTime}s)`)

        // Update device to show it's exposing
        this.updateDeviceProperties(deviceId, {
          isExposing: true,
          exposureProgress: 0,
          cameraState: 2 // exposing
        })

        // Emit exposure started event
        this._emitEvent({
          type: 'cameraExposureStarted',
          deviceId,
          duration: exposureTime,
          isLight
        })

        // Create a timer to update progress
        const timer = setInterval(
          () => {
            const currentDevice = this.getDeviceById(deviceId)
            if (!currentDevice) {
              clearInterval(timer)
              return
            }

            const currentProgress = Number(currentDevice.properties?.exposureProgress || 0)
            const newProgress = Math.min(100, currentProgress + 5)

            this.updateDeviceProperties(deviceId, {
              exposureProgress: newProgress
            })

            this._emitEvent({
              type: 'cameraExposureChanged',
              deviceId,
              percentComplete: newProgress
            })

            if (newProgress >= 100) {
              clearInterval(timer)

              // Finish exposure
              this.updateDeviceProperties(deviceId, {
                isExposing: false,
                cameraState: 0, // idle
                imageReady: true
              })

              this._emitEvent({
                type: 'cameraExposureComplete',
                deviceId
              })
            }
          },
          (exposureTime * 1000) / 20
        ) // Update 20 times during exposure

        return Promise.resolve(true)
      },

      // Simulate telescope movement
      simulateTelescopeSlew(this: UnifiedStoreType, deviceId: string, ra?: number, dec?: number): Promise<boolean> {
        const device = this.getDeviceById(deviceId)
        if (!device || !device.properties?.isSimulation) {
          throw new Error('This method can only be used with simulation devices')
        }

        console.log(`Simulating telescope slew for ${deviceId}`)

        // Update device to show it's slewing
        this.updateDeviceProperties(deviceId, {
          isSlewing: true
        })

        // Emit slew started event
        this._emitEvent({
          type: 'telescopeSlewStarted',
          deviceId,
          targetRA: ra,
          targetDec: dec
        })

        // Simulate the slew completing after 3 seconds
        setTimeout(() => {
          this.updateDeviceProperties(deviceId, {
            isSlewing: false,
            rightAscension: ra,
            declination: dec
          })

          this._emitEvent({
            type: 'telescopeSlewCompleted',
            deviceId
          })
        }, 3000)

        return Promise.resolve(true)
      },

      // New methods added below
      shouldFallbackToSimulation(this: UnifiedStoreType, deviceId: string, method: string): boolean {
        const device = this.getDeviceById(deviceId)
        if (!this.allowSimulations) {
          console.log(`[Simulation] Fallback check: Simulations globally disabled.`)
          return false
        }
        // Fallback if the device is explicitly a simulation.
        // More complex logic can be added here, e.g., per-method simulation rules.
        const isSimulatedDevice = !!(device && device.properties?.isSimulation)
        console.log(
          `[Simulation] Checking fallback for device ${deviceId}, method ${method}. Device is simulation: ${isSimulatedDevice}. Global allow: ${this.allowSimulations}`
        )
        // For now, fallback only if it's a designated simulation device and simulations are allowed.
        // Or, if you want to allow fallback for ANY device if simulations are on:
        // return this.allowSimulations;
        return this.allowSimulations && isSimulatedDevice
      },

      async simulateDeviceMethod(this: UnifiedStoreType, deviceId: string, method: string, args: unknown[] = []): Promise<unknown> {
        const device = this.getDeviceById(deviceId) // getDeviceById is on UnifiedStoreType

        // This check might be slightly different based on shouldFallbackToSimulation's logic
        if (!this.allowSimulations || !device || !device.properties?.isSimulation) {
          console.warn(`[Simulation] simulateDeviceMethod called for non-simulation device ${deviceId} or simulations disabled.`)
          // Or throw new Error if this state is unexpected
          // throw new Error(`Device ${deviceId} is not a simulation or simulations are disabled, cannot simulate method ${method}.`);
          // Returning a rejected promise or a specific error object might be better
          return Promise.reject(new Error(`Cannot simulate method ${method} for ${deviceId}: not a simulation or simulations disabled.`))
        }

        console.log(`[Simulation] Simulating method ${method} for device ${deviceId} with args:`, args)

        // Example: Dispatch to specific simulation methods if available
        // Note: `this.simulateCameraExposure` and `this.simulateTelescopeSlew` are also part of UnifiedStoreType
        if (method.toLowerCase().includes('exposure') && device.type.toLowerCase() === 'camera') {
          const exposureTime = typeof args[0] === 'number' ? args[0] : 1 // Default 1s
          const isLight = typeof args[1] === 'boolean' ? args[1] : true // Default light frame
          console.log(`[Simulation] Dispatching to simulateCameraExposure for ${deviceId}`)
          return this.simulateCameraExposure(deviceId, exposureTime, isLight)
        }
        if (method.toLowerCase().includes('slew') && device.type.toLowerCase() === 'telescope') {
          // Args for slew might be RA/Dec. This needs to be defined based on actual usage.
          // Example: args could be [ra, dec] or an object {ra: val, dec: val}
          console.warn(`[Simulation] Telescope slew simulation for method '${method}' on ${deviceId} needs specific arg parsing. Args:`, args)
          // Assuming ra/dec might be passed directly
          const ra = typeof args[0] === 'number' ? args[0] : undefined
          const dec = typeof args[1] === 'number' ? args[1] : undefined
          console.log(`[Simulation] Dispatching to simulateTelescopeSlew for ${deviceId} with RA: ${ra}, Dec: ${dec}`)
          return this.simulateTelescopeSlew(deviceId, ra, dec)
        }

        // Generic fallback simulation for other methods
        console.warn(`[Simulation] No specific simulation for method '${method}' on device ${deviceId}. Returning generic success.`)
        const eventPayload: DeviceEvent = {
          // Explicitly type the event payload
          type: 'deviceMethodCalled',
          deviceId,
          method,
          args,
          result: { simulated: true, message: `Method ${method} simulated successfully.` }
        }
        this._emitEvent(eventPayload) // _emitEvent is on UnifiedStoreType (from eventSystem)
        return Promise.resolve({ simulated: true, message: `Method ${method} simulated successfully for ${deviceId}.` })
      }
    }
  }
}
