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

import type { Device, DeviceEvent } from '../types/deviceTypes'

export interface SimulationState {
  allowSimulations: boolean
}

interface SimulationContext {
  getDeviceById: (id: string) => Device | null
  _emitEvent: (event: DeviceEvent) => void
  updateDeviceProperties: (deviceId: string, props: Record<string, unknown>) => boolean
}

export function createSimulationActions() {
  return {
    state: (): SimulationState => ({
      allowSimulations: false // Disabled by default
    }),

    actions: {
      // Enable or disable simulations in the app
      setAllowSimulations(this: SimulationState, allow: boolean): void {
        this.allowSimulations = allow
        console.log(`Simulations ${allow ? 'enabled' : 'disabled'}`)
      },

      // Get all simulated devices
      getSimulatedDevices(this: SimulationState & SimulationContext): Device[] {
        // In a real implementation, we would have access to the device store properly
        // This is a simplified version that accesses devicesArray directly
        const store = this as SimulationState & SimulationContext & { devicesArray?: Device[] }
        const availableDevices = store.devicesArray || []

        if (Array.isArray(availableDevices)) {
          return availableDevices.filter(
            (device) => device && device.properties && device.properties.isSimulation === true
          )
        }

        return []
      },

      // Simulate a camera exposure
      simulateCameraExposure(
        this: SimulationState & SimulationContext,
        deviceId: string,
        exposureTime: number,
        isLight: boolean = true
      ): Promise<boolean> {
        const device = this.getDeviceById(deviceId)

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
            const device = this.getDeviceById(deviceId)
            if (!device) {
              clearInterval(timer)
              return
            }

            const currentProgress = Number(device.properties?.exposureProgress || 0)
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
      simulateTelescopeSlew(
        this: SimulationState & SimulationContext,
        deviceId: string,
        ra?: number,
        dec?: number
      ): Promise<boolean> {
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
      }
    }
  }
}
