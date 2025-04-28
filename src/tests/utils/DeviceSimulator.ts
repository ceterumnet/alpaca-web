// @ts-nocheck
/**
 * Device Simulator
 *
 * This utility simulates ALPACA-compatible devices for local testing.
 * It creates virtual devices that can be discovered and controlled through
 * the application, without requiring physical hardware.
 */

import UnifiedStore from '../../stores/UnifiedStore'
import { isTelescope, isCamera } from '../../types/DeviceTypes'

// Telescope position interface
interface TelescopePosition {
  rightAscension: number // hours (0-24)
  declination: number // degrees (-90 to +90)
  altitude: number // degrees (0-90)
  azimuth: number // degrees (0-360)
}

// Camera status interface
interface CameraStatus {
  isExposing: boolean
  exposureProgress: number // 0-100%
  exposureDuration: number // seconds
  lastImagePath: string | null
}

// Simulator configuration
interface SimulatorConfig {
  deviceCount: {
    telescopes: number
    cameras: number
    focusers: number
    filterWheels: number
  }
  networkLatency: number // milliseconds
  errorRate: number // 0-1 probability of random errors
  discoveryTime: number // milliseconds
}

// Default config
const DEFAULT_CONFIG: SimulatorConfig = {
  deviceCount: {
    telescopes: 2,
    cameras: 2,
    focusers: 1,
    filterWheels: 1
  },
  networkLatency: 200, // 200ms latency
  errorRate: 0.05, // 5% chance of random errors
  discoveryTime: 3000 // 3 seconds for discovery
}

/**
 * Device Simulator Class
 *
 * This class creates and manages virtual devices for testing.
 */
export class DeviceSimulator {
  private store: typeof UnifiedStore
  private config: SimulatorConfig
  private isRunning: boolean = false
  private telescopePositions: Map<string, TelescopePosition> = new Map()
  private cameraStatuses: Map<string, CameraStatus> = new Map()
  private updateInterval: number | null = null
  private simulatedDevices: string[] = []

  /**
   * Create a new device simulator
   */
  constructor(store: typeof UnifiedStore, config: Partial<SimulatorConfig> = {}) {
    this.store = store
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Start the simulator
   */
  start(): void {
    if (this.isRunning) return
    this.isRunning = true

    // Create devices
    this.createSimulatedDevices()

    // Start device update interval
    this.updateInterval = window.setInterval(() => {
      this.updateDevices()
    }, 1000) as unknown as number

    console.log(`Simulator started with ${this.simulatedDevices.length} devices`)
  }

  /**
   * Stop the simulator
   */
  stop(): void {
    if (!this.isRunning) return
    this.isRunning = false

    // Clear update interval
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    // Remove all simulated devices
    this.simulatedDevices.forEach((deviceId) => {
      this.store.removeDevice(deviceId)
    })

    this.simulatedDevices = []
    this.telescopePositions.clear()
    this.cameraStatuses.clear()

    console.log('Simulator stopped')
  }

  /**
   * Handle discovery requests
   */
  async handleDiscovery(): Promise<string[]> {
    console.log('Handling discovery request')

    // Simulate network delay
    await this.simulateDelay(this.config.discoveryTime)

    return this.simulatedDevices
  }

  /**
   * Simulate device connection
   */
  async connectDevice(deviceId: string): Promise<boolean> {
    console.log(`Connecting to device: ${deviceId}`)

    // Simulate connection latency
    await this.simulateDelay(this.config.networkLatency * 2)

    // Introduce random errors if configured
    if (Math.random() < this.config.errorRate) {
      console.error(`Simulated connection error for device ${deviceId}`)
      return false
    }

    // Update device connection state
    this.store.updateDevice(deviceId, {
      isConnected: true,
      lastConnected: new Date().toISOString()
    })

    return true
  }

  /**
   * Simulate device disconnection
   */
  async disconnectDevice(deviceId: string): Promise<boolean> {
    console.log(`Disconnecting from device: ${deviceId}`)

    // Simulate disconnection latency
    await this.simulateDelay(this.config.networkLatency)

    // Update device connection state
    this.store.updateDevice(deviceId, {
      isConnected: false
    })

    return true
  }

  /**
   * Execute a command on a simulated device
   */
  async executeCommand(
    deviceId: string,
    command: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    console.log(`Executing command ${command} on device ${deviceId}`)
    console.log('Parameters:', params)

    // Simulate command latency
    await this.simulateDelay(this.config.networkLatency)

    // Handle command based on device type
    const device = this.store.getDeviceById(deviceId)
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`)
    }

    // Introduce random errors if configured
    if (Math.random() < this.config.errorRate) {
      console.error(`Simulated command error for ${command} on device ${deviceId}`)
      throw new Error(`Simulated error executing ${command}`)
    }

    // Handle telescope commands
    if (isTelescope(device)) {
      return this.handleTelescopeCommand(deviceId, command, params)
    }

    // Handle camera commands
    if (isCamera(device)) {
      return this.handleCameraCommand(deviceId, command, params)
    }

    // Generic response for other device types
    return { success: true, message: `Command ${command} executed successfully` }
  }

  /**
   * Handle telescope-specific commands
   */
  private async handleTelescopeCommand(
    deviceId: string,
    command: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const position = this.telescopePositions.get(deviceId)
    if (!position) {
      throw new Error(`Telescope position not found for device ${deviceId}`)
    }

    switch (command) {
      case 'slew': {
        // Extract target coordinates from params
        const targetRA = params.rightAscension as number
        const targetDec = params.declination as number

        if (typeof targetRA !== 'number' || typeof targetDec !== 'number') {
          throw new Error('Invalid slew parameters')
        }

        // Update state to indicate slewing
        this.store.updateDevice(deviceId, {
          isSlewing: true,
          targetRightAscension: targetRA,
          targetDeclination: targetDec
        })

        // Simulate slew time (proportional to distance)
        const distance = Math.sqrt(
          Math.pow(targetRA - position.rightAscension, 2) +
            Math.pow(targetDec - position.declination, 2)
        )
        const slewTime = Math.max(2000, distance * 1000)

        // Gradually update position during slew
        const steps = 10
        const stepTime = slewTime / steps

        for (let i = 1; i <= steps; i++) {
          await this.simulateDelay(stepTime)

          // Update position proportionally
          const progress = i / steps
          const newRA = position.rightAscension + (targetRA - position.rightAscension) * progress
          const newDec = position.declination + (targetDec - position.declination) * progress

          // Update telescope position
          position.rightAscension = newRA
          position.declination = newDec

          // Update device state
          this.store.updateDevice(deviceId, {
            rightAscension: newRA,
            declination: newDec
          })
        }

        // Complete slew
        this.store.updateDevice(deviceId, {
          isSlewing: false,
          rightAscension: targetRA,
          declination: targetDec
        })

        return { success: true, message: 'Slew completed successfully' }
      }

      case 'park': {
        // Update state to indicate parking
        this.store.updateDevice(deviceId, {
          isParking: true
        })

        // Simulate park time
        await this.simulateDelay(3000)

        // Update to parked state
        const parkedPosition = {
          rightAscension: 0,
          declination: 90, // Point to celestial pole
          altitude: 90,
          azimuth: 0
        }

        this.telescopePositions.set(deviceId, parkedPosition)

        this.store.updateDevice(deviceId, {
          isParking: false,
          isParked: true,
          rightAscension: parkedPosition.rightAscension,
          declination: parkedPosition.declination,
          altitude: parkedPosition.altitude,
          azimuth: parkedPosition.azimuth
        })

        return { success: true, message: 'Telescope parked successfully' }
      }

      default:
        return { success: true, message: `Command ${command} acknowledged` }
    }
  }

  /**
   * Handle camera-specific commands
   */
  private async handleCameraCommand(
    deviceId: string,
    command: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const status = this.cameraStatuses.get(deviceId)
    if (!status) {
      throw new Error(`Camera status not found for device ${deviceId}`)
    }

    switch (command) {
      case 'startExposure': {
        if (status.isExposing) {
          throw new Error('Camera is already exposing')
        }

        // Extract exposure parameters
        const duration = (params.duration as number) || 1

        if (typeof duration !== 'number' || duration <= 0) {
          throw new Error('Invalid exposure duration')
        }

        // Update camera status
        status.isExposing = true
        status.exposureDuration = duration
        status.exposureProgress = 0

        // Update device state
        this.store.updateDevice(deviceId, {
          isExposing: true,
          exposureDuration: duration,
          exposureProgress: 0
        })

        // Simulate exposure progress
        const steps = 10
        const stepTime = (duration * 1000) / steps

        for (let i = 1; i <= steps; i++) {
          await this.simulateDelay(stepTime)

          // Update progress
          const progress = (i / steps) * 100
          status.exposureProgress = progress

          // Update device state
          this.store.updateDevice(deviceId, {
            exposureProgress: progress
          })
        }

        // Complete exposure
        const imagePath = `/simulated-images/image_${Date.now()}.fits`
        status.isExposing = false
        status.exposureProgress = 100
        status.lastImagePath = imagePath

        // Update device state
        this.store.updateDevice(deviceId, {
          isExposing: false,
          exposureProgress: 100,
          lastImagePath: imagePath
        })

        return {
          success: true,
          message: 'Exposure completed successfully',
          imagePath
        }
      }

      case 'abortExposure': {
        if (!status.isExposing) {
          return { success: false, message: 'No exposure in progress' }
        }

        // Update camera status
        status.isExposing = false
        status.exposureProgress = 0

        // Update device state
        this.store.updateDevice(deviceId, {
          isExposing: false,
          exposureProgress: 0
        })

        return { success: true, message: 'Exposure aborted successfully' }
      }

      default:
        return { success: true, message: `Command ${command} acknowledged` }
    }
  }

  /**
   * Create simulated devices based on configuration
   */
  private createSimulatedDevices(): void {
    // Create telescopes
    for (let i = 0; i < this.config.deviceCount.telescopes; i++) {
      const deviceId = `telescope-sim-${i}`

      // Initial telescope position
      const position: TelescopePosition = {
        rightAscension: Math.random() * 24,
        declination: Math.random() * 180 - 90,
        altitude: Math.random() * 90,
        azimuth: Math.random() * 360
      }

      // Add to store
      this.store.addDevice({
        id: deviceId,
        name: `Simulated Telescope ${i + 1}`,
        type: 'telescope',
        ipAddress: `127.0.0.${i + 1}`,
        port: 11111,
        isConnected: false,
        rightAscension: position.rightAscension,
        declination: position.declination,
        altitude: position.altitude,
        azimuth: position.azimuth,
        isSlewing: false,
        isParked: false,
        canSlew: true,
        canPark: true,
        properties: {
          aperture: 200 + i * 50,
          focalLength: 1000 + i * 200,
          model: `Simulator ${i + 1}`
        }
      })

      // Store telescope position for simulation
      this.telescopePositions.set(deviceId, position)
      this.simulatedDevices.push(deviceId)
    }

    // Create cameras
    for (let i = 0; i < this.config.deviceCount.cameras; i++) {
      const deviceId = `camera-sim-${i}`

      // Initial camera status
      const status: CameraStatus = {
        isExposing: false,
        exposureProgress: 0,
        exposureDuration: 0,
        lastImagePath: null
      }

      // Add to store
      this.store.addDevice({
        id: deviceId,
        name: `Simulated Camera ${i + 1}`,
        type: 'camera',
        ipAddress: `127.0.0.${this.config.deviceCount.telescopes + i + 1}`,
        port: 11112,
        isConnected: false,
        isExposing: false,
        exposureMin: 0.001,
        exposureMax: 3600,
        binningX: 1,
        binningY: 1,
        properties: {
          sensorWidth: 3000 + i * 500,
          sensorHeight: 2000 + i * 500,
          pixelSize: 3.8,
          model: `SimCam ${i + 1}`
        }
      })

      // Store camera status for simulation
      this.cameraStatuses.set(deviceId, status)
      this.simulatedDevices.push(deviceId)
    }

    // Create focusers
    for (let i = 0; i < this.config.deviceCount.focusers; i++) {
      const deviceId = `focuser-sim-${i}`

      // Add to store
      this.store.addDevice({
        id: deviceId,
        name: `Simulated Focuser ${i + 1}`,
        type: 'focuser',
        ipAddress: `127.0.0.${this.config.deviceCount.telescopes + this.config.deviceCount.cameras + i + 1}`,
        port: 11113,
        isConnected: false,
        position: 5000,
        isMoving: false,
        maxPosition: 10000,
        minPosition: 0,
        properties: {
          model: `SimFocus ${i + 1}`
        }
      })

      this.simulatedDevices.push(deviceId)
    }

    // Create filter wheels
    for (let i = 0; i < this.config.deviceCount.filterWheels; i++) {
      const deviceId = `filterwheel-sim-${i}`

      // Add to store
      this.store.addDevice({
        id: deviceId,
        name: `Simulated Filter Wheel ${i + 1}`,
        type: 'filterWheel',
        ipAddress: `127.0.0.${this.config.deviceCount.telescopes + this.config.deviceCount.cameras + this.config.deviceCount.focusers + i + 1}`,
        port: 11114,
        isConnected: false,
        position: 0,
        isMoving: false,
        filters: [
          { position: 0, name: 'Luminance' },
          { position: 1, name: 'Red' },
          { position: 2, name: 'Green' },
          { position: 3, name: 'Blue' },
          { position: 4, name: 'H-alpha' }
        ],
        properties: {
          model: `SimFilter ${i + 1}`
        }
      })

      this.simulatedDevices.push(deviceId)
    }
  }

  /**
   * Update device states periodically
   */
  private updateDevices(): void {
    // Skip updates if not running
    if (!this.isRunning) return

    // Update device timestamps
    this.simulatedDevices.forEach((deviceId) => {
      this.store.updateDevice(deviceId, {
        lastUpdated: new Date().toISOString()
      })
    })

    // Update telescope positions slightly (simulate tracking)
    this.telescopePositions.forEach((position, deviceId) => {
      const device = this.store.getDeviceById(deviceId)
      if (
        !device ||
        !isTelescope(device) ||
        !device.isConnected ||
        device.isSlewing ||
        device.isParked
      ) {
        return
      }

      // Simulate slight movement (tracking)
      position.rightAscension = (position.rightAscension + 0.001) % 24

      // Update device state
      this.store.updateDevice(deviceId, {
        rightAscension: position.rightAscension
      })
    })
  }

  /**
   * Simulate network delay
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Create and initialize a device simulator for the browser
 */
export function createDeviceSimulator(
  store: typeof UnifiedStore,
  config?: Partial<SimulatorConfig>
): DeviceSimulator {
  const simulator = new DeviceSimulator(store, config)

  // Make simulator accessible from window for browser console testing
  if (typeof window !== 'undefined') {
    ;(
      window as Window & typeof globalThis & { deviceSimulator?: DeviceSimulator }
    ).deviceSimulator = simulator
    console.log('Device simulator created. Access via window.deviceSimulator')
    console.log('Start simulator with window.deviceSimulator.start()')
  }

  return simulator
}
