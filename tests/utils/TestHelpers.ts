/**
 * Test Helper Functions
 * Utility functions to assist with testing the adapter implementation
 */

import type { Device } from '@/stores/UnifiedStore'

/**
 * Device type capabilities by device type
 */
interface DeviceCapabilities {
  [key: string]: Record<string, unknown>
}

/**
 * Creates a test device with the specified type, IP address, and name
 * @param type - The device type (telescope, camera, etc.)
 * @param ipAddress - The IP address for the device
 * @param name - The device name
 * @returns A device object with typical properties
 */
export function createTestDevice(type: string, ipAddress: string, name: string): Device {
  return {
    id: `test-${type}-${Date.now()}`,
    type: type,
    ipAddress: ipAddress,
    name: name,
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    properties: {
      friendlyName: name,
      isAvailable: true,
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      firmwareVersion: '1.0.0',
      lastSeen: new Date().toISOString()
    },
    capabilities: getCapabilitiesForType(type)
  }
}

/**
 * Returns a set of typical capabilities for a device type
 * @param type - The device type
 * @returns Capabilities object
 */
function getCapabilitiesForType(type: string): DeviceCapabilities {
  const capabilities: DeviceCapabilities = {
    base: {
      canConnect: true,
      supportsRemoteControl: true
    }
  }

  switch (type.toLowerCase()) {
    case 'telescope':
      capabilities.telescope = {
        canSlew: true,
        canTrack: true,
        canPark: true,
        hasFocuser: false
      }
      break
    case 'camera':
      capabilities.camera = {
        canCapture: true,
        hasTemperatureControl: true,
        maxExposureTime: 3600,
        pixelSize: 3.8
      }
      break
    case 'focuser':
      capabilities.focuser = {
        isAbsolute: true,
        maxPosition: 65535,
        maxStepSize: 100
      }
      break
    case 'filter_wheel':
      capabilities.filterWheel = {
        positions: 8,
        filters: [
          { position: 1, name: 'Luminance' },
          { position: 2, name: 'Red' },
          { position: 3, name: 'Green' },
          { position: 4, name: 'Blue' },
          { position: 5, name: 'Ha' },
          { position: 6, name: 'OIII' },
          { position: 7, name: 'SII' },
          { position: 8, name: 'Clear' }
        ]
      }
      break
    default:
      capabilities.generic = {
        isGeneric: true
      }
  }

  return capabilities
}

/**
 * Wait for a specified amount of time
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the timeout
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Simulates a typical network delay
 * @returns Promise that resolves after a random network-like delay
 */
export function simulateNetworkDelay(): Promise<void> {
  const delay = 50 + Math.random() * 200 // 50-250ms delay
  return wait(delay)
}

/**
 * Generates fake telemetry data for a device
 * @param type - The device type
 * @returns Telemetry data appropriate for the device type
 */
export function generateTelemetryData(type: string): Record<string, unknown> {
  switch (type.toLowerCase()) {
    case 'telescope':
      return {
        rightAscension: Math.random() * 24,
        declination: Math.random() * 180 - 90,
        altitude: Math.random() * 90,
        azimuth: Math.random() * 360,
        isTracking: Math.random() > 0.2,
        isPierEast: Math.random() > 0.5,
        timestamp: new Date().toISOString()
      }
    case 'camera':
      return {
        temperature: -20 + Math.random() * 30,
        coolerPower: Math.random() * 100,
        gain: Math.floor(Math.random() * 100),
        offset: Math.floor(Math.random() * 30),
        isExposing: Math.random() > 0.7,
        exposureRemaining: Math.random() > 0.7 ? Math.random() * 60 : 0,
        timestamp: new Date().toISOString()
      }
    case 'focuser':
      return {
        position: Math.floor(Math.random() * 65535),
        temperature: 10 + Math.random() * 20,
        isMoving: Math.random() > 0.8,
        timestamp: new Date().toISOString()
      }
    case 'filter_wheel':
      return {
        position: Math.floor(Math.random() * 8) + 1,
        isMoving: Math.random() > 0.8,
        timestamp: new Date().toISOString()
      }
    default:
      return {
        status: 'online',
        lastUpdated: new Date().toISOString()
      }
  }
}
