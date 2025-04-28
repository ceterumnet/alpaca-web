/**
 * Device Simulator Runner
 *
 * This script sets up a device simulator for testing the application with
 * simulated devices. It's designed to be imported in a browser environment
 * to enable real device testing without actual hardware.
 */

import { useUnifiedStore } from '../../stores/UnifiedStore'
import { createStoreAdapter } from '../../stores/StoreAdapter'
import { createDeviceSimulator, DeviceSimulator } from './DeviceSimulator'
import { createTestLog } from '../integration/RealDeviceTests'
import { createPinia, setActivePinia } from 'pinia'

// Global store for the simulator
let store: ReturnType<typeof useUnifiedStore>
let adapter: ReturnType<typeof createStoreAdapter>
let simulator: DeviceSimulator

/**
 * Initialize the testing environment
 */
export function initializeTestingEnvironment(): {
  store: ReturnType<typeof useUnifiedStore>
  adapter: ReturnType<typeof createStoreAdapter>
  simulator: DeviceSimulator
} {
  // Set up Pinia
  setActivePinia(createPinia())

  // Create store and adapter
  store = useUnifiedStore()
  adapter = createStoreAdapter(store)

  // Create simulator
  simulator = createDeviceSimulator(store, {
    deviceCount: {
      telescopes: 3,
      cameras: 2,
      focusers: 1,
      filterWheels: 1
    },
    networkLatency: 300, // 300ms latency for more realistic testing
    errorRate: 0.05 // 5% chance of errors
  })

  // Override discovery method to use simulator
  const originalStartDiscovery = store.startDiscovery
  store.startDiscovery = async () => {
    console.log('Intercepted discovery request - using simulator')

    // Start normal discovery process
    store.setDiscovering(true)

    try {
      // Use simulator to handle discovery
      await simulator.handleDiscovery()
      console.log('Discovery completed via simulator')
      return true
    } catch (error) {
      console.error('Error during simulated discovery:', error)
      return false
    } finally {
      store.setDiscovering(false)
    }
  }

  // Override connect method to use simulator
  const originalConnectDevice = store.connectDevice
  store.connectDevice = async (deviceId: string) => {
    console.log(`Intercepted connect request for device ${deviceId} - using simulator`)

    // Update device state
    store.updateDevice(deviceId, { isConnecting: true })

    try {
      // Use simulator to handle connection
      const success = await simulator.connectDevice(deviceId)
      console.log(`Connection ${success ? 'succeeded' : 'failed'} for device ${deviceId}`)
      return success
    } catch (error) {
      console.error(`Error connecting to device ${deviceId}:`, error)
      store.updateDevice(deviceId, { isConnecting: false })
      return false
    }
  }

  // Override disconnect method to use simulator
  const originalDisconnectDevice = store.disconnectDevice
  store.disconnectDevice = async (deviceId: string) => {
    console.log(`Intercepted disconnect request for device ${deviceId} - using simulator`)

    // Update device state
    store.updateDevice(deviceId, { isDisconnecting: true })

    try {
      // Use simulator to handle disconnection
      const success = await simulator.disconnectDevice(deviceId)
      console.log(`Disconnection ${success ? 'succeeded' : 'failed'} for device ${deviceId}`)
      return success
    } catch (error) {
      console.error(`Error disconnecting from device ${deviceId}:`, error)
      store.updateDevice(deviceId, { isDisconnecting: false })
      return false
    }
  }

  // Override command execution to use simulator
  const originalExecuteCommand = store.executeDeviceCommand
  store.executeDeviceCommand = async (deviceId: string, command: string, params: any) => {
    console.log(`Intercepted command ${command} for device ${deviceId} - using simulator`)

    try {
      // Use simulator to handle command
      const result = await simulator.executeCommand(deviceId, command, params)
      console.log(`Command ${command} result:`, result)
      return result
    } catch (error) {
      console.error(`Error executing command ${command} on device ${deviceId}:`, error)
      throw error
    }
  }

  // Make available globally
  if (typeof window !== 'undefined') {
    const w = window as any
    w.testStore = store
    w.testAdapter = adapter
    w.deviceSimulator = simulator
    w.createTestLog = createTestLog

    console.log('Device testing environment initialized.')
    console.log('Access via:')
    console.log('- window.testStore - The unified store')
    console.log('- window.testAdapter - The store adapter')
    console.log('- window.deviceSimulator - The device simulator')
    console.log('- window.createTestLog - Function to create test logs')
    console.log('')
    console.log('Usage:')
    console.log('1. Start simulator: window.deviceSimulator.start()')
    console.log('2. Discover devices: window.testStore.startDiscovery()')
    console.log('3. Connect to a device: window.testStore.connectDevice("telescope-sim-0")')
    console.log(
      '4. Execute command: window.testStore.executeDeviceCommand("telescope-sim-0", "slew", { rightAscension: 12, declination: 45 })'
    )
  }

  return { store, adapter, simulator }
}

// Auto-initialize when imported in browser
if (typeof window !== 'undefined') {
  console.log('Initializing device simulator in browser...')
  initializeTestingEnvironment()

  // Add auto-start functionality on query parameter
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has('simulate-devices')) {
    console.log('Auto-starting device simulator due to URL parameter...')
    setTimeout(() => {
      if (simulator) {
        simulator.start()
        console.log('Device simulator started automatically')
      }
    }, 1000)
  }
}
