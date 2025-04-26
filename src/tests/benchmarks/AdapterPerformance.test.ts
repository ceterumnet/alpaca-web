/**
 * Adapter Performance Benchmark Tests
 *
 * This test suite measures the performance difference between using the adapter pattern
 * versus direct store usage. It helps quantify the overhead of the adapter layer.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, computed, nextTick } from 'vue'
import UnifiedStore from '../../stores/UnifiedStore'
import { createStoreAdapter, type StoreAdapter } from '../../stores/StoreAdapter'
import type { Device } from '../../types/DeviceTypes'

// Helper function to measure execution time
function measureTime(callback: () => void): number {
  const start = performance.now()
  callback()
  return performance.now() - start
}

// Helper function to measure memory usage
function measureMemoryUsage(callback: () => void): number {
  if (typeof global.gc !== 'undefined') {
    global.gc() // Force garbage collection if available
  }

  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024
  callback()

  if (typeof global.gc !== 'undefined') {
    global.gc() // Force garbage collection if available
  }

  const endMemory = process.memoryUsage().heapUsed / 1024 / 1024
  return endMemory - startMemory
}

// Generate test devices
function generateTestDevices(count: number) {
  const devices = []
  for (let i = 0; i < count; i++) {
    devices.push({
      id: `device-${i}`,
      name: `Test Device ${i}`,
      type: i % 2 === 0 ? 'telescope' : 'camera',
      ipAddress: `192.168.1.${i + 100}`,
      port: 4567 + i,
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      properties: {
        key1: `value-${i}`,
        key2: i * 10,
        key3: `data-${i}`
      }
    })
  }
  return devices
}

// Types for component prop interfaces
interface LegacyDeviceRecord {
  id: string
  deviceName: string
  deviceType: string
  isConnected: boolean
  [key: string]: unknown
}

interface DeviceRecord {
  id: string
  name: string
  type: string
  isConnected: boolean
  [key: string]: unknown
}

// Component using adapter
const AdapterComponent = defineComponent({
  name: 'AdapterComponent',
  props: {
    adapter: {
      type: Object,
      required: true
    }
  },
  setup(props: { adapter: StoreAdapter }) {
    const devices = computed(() => props.adapter.discoveredDevices)
    const deviceCount = computed(() => devices.value.length)
    const telescopes = computed(() =>
      devices.value.filter((d: LegacyDeviceRecord) => d.deviceType === 'telescope')
    )
    const cameras = computed(() =>
      devices.value.filter((d: LegacyDeviceRecord) => d.deviceType === 'camera')
    )
    const connectedDevices = computed(() =>
      devices.value.filter((d: LegacyDeviceRecord) => d.isConnected)
    )

    return () =>
      h('div', [
        h('div', { class: 'device-count' }, `Total Devices: ${deviceCount.value}`),
        h('div', { class: 'telescope-count' }, `Telescopes: ${telescopes.value.length}`),
        h('div', { class: 'camera-count' }, `Cameras: ${cameras.value.length}`),
        h('div', { class: 'connected-count' }, `Connected: ${connectedDevices.value.length}`),
        h(
          'ul',
          devices.value.map((device: LegacyDeviceRecord) =>
            h('li', { key: device.id, class: 'device-item' }, [
              h('span', device.deviceName),
              h('span', device.deviceType),
              h('span', device.isConnected ? 'Connected' : 'Disconnected')
            ])
          )
        )
      ])
  }
})

// Component using direct store
const DirectComponent = defineComponent({
  name: 'DirectComponent',
  props: {
    store: {
      type: Object,
      required: true
    }
  },
  setup(props: { store: UnifiedStore }) {
    const devices = computed(() => props.store.devices)
    const deviceCount = computed(() => devices.value.length)
    const telescopes = computed(() =>
      devices.value.filter((d: DeviceRecord) => d.type === 'telescope')
    )
    const cameras = computed(() => devices.value.filter((d: DeviceRecord) => d.type === 'camera'))
    const connectedDevices = computed(() =>
      devices.value.filter((d: DeviceRecord) => d.isConnected)
    )

    return () =>
      h('div', [
        h('div', { class: 'device-count' }, `Total Devices: ${deviceCount.value}`),
        h('div', { class: 'telescope-count' }, `Telescopes: ${telescopes.value.length}`),
        h('div', { class: 'camera-count' }, `Cameras: ${cameras.value.length}`),
        h('div', { class: 'connected-count' }, `Connected: ${connectedDevices.value.length}`),
        h(
          'ul',
          devices.value.map((device: DeviceRecord) =>
            h('li', { key: device.id, class: 'device-item' }, [
              h('span', device.name),
              h('span', device.type),
              h('span', device.isConnected ? 'Connected' : 'Disconnected')
            ])
          )
        )
      ])
  }
})

describe('Adapter Performance Benchmarks', () => {
  let store: UnifiedStore
  let adapter: ReturnType<typeof createStoreAdapter>
  let testDevices: ReturnType<typeof generateTestDevices>

  beforeEach(() => {
    store = new UnifiedStore()
    adapter = createStoreAdapter(store)
    // Generate 100 test devices - adjust count based on your performance testing needs
    testDevices = generateTestDevices(100)
  })

  describe('Basic Operation Performance', () => {
    it('should measure device add performance', () => {
      // Test adding devices via adapter
      const adapterTime = measureTime(() => {
        testDevices.forEach((device) => {
          adapter.addDevice({
            id: device.id,
            deviceName: device.name,
            deviceType: device.type,
            address: device.ipAddress as string,
            devicePort: device.port as number,
            isConnected: device.isConnected,
            status: 'idle',
            properties: device.properties
          })
        })
      })

      // Reset store
      store = new UnifiedStore()

      // Test adding devices directly to store
      const directTime = measureTime(() => {
        testDevices.forEach((device) => {
          store.addDevice(device)
        })
      })

      console.log(
        `Add performance - Adapter: ${adapterTime.toFixed(2)}ms, Direct: ${directTime.toFixed(2)}ms`
      )
      expect(adapterTime).toBeGreaterThan(directTime)
    })

    it('should measure device retrieval performance', () => {
      // Add devices directly to store
      testDevices.forEach((device) => {
        store.addDevice(device)
      })

      // Test retrieving devices via adapter
      const adapterTime = measureTime(() => {
        for (let i = 0; i < testDevices.length; i++) {
          adapter.getDeviceById(`device-${i}`)
        }
      })

      // Test retrieving devices directly from store
      const directTime = measureTime(() => {
        for (let i = 0; i < testDevices.length; i++) {
          store.getDeviceById(`device-${i}`)
        }
      })

      console.log(
        `Retrieval performance - Adapter: ${adapterTime.toFixed(2)}ms, Direct: ${directTime.toFixed(2)}ms`
      )
      expect(adapterTime).toBeGreaterThan(directTime)
    })

    it('should measure device update performance', () => {
      // Add devices directly to store
      testDevices.forEach((device) => {
        store.addDevice(device)
      })

      // Test updating devices via adapter
      const adapterTime = measureTime(() => {
        for (let i = 0; i < testDevices.length; i++) {
          adapter.updateDevice(`device-${i}`, {
            status: 'updated',
            isConnected: true,
            properties: {
              newKey: `new-value-${i}`
            }
          })
        }
      })

      // Reset devices
      store = new UnifiedStore()
      testDevices.forEach((device) => {
        store.addDevice(device)
      })

      // Test updating devices directly in store
      const directTime = measureTime(() => {
        for (let i = 0; i < testDevices.length; i++) {
          store.updateDevice(`device-${i}`, {
            isConnected: true,
            properties: {
              newKey: `new-value-${i}`
            }
          })
        }
      })

      console.log(
        `Update performance - Adapter: ${adapterTime.toFixed(2)}ms, Direct: ${directTime.toFixed(2)}ms`
      )
      expect(adapterTime).toBeGreaterThan(directTime)
    })
  })

  describe('Complex Operation Performance', () => {
    it('should measure device filtering performance', () => {
      // Add devices directly to store
      testDevices.forEach((device) => {
        store.addDevice(device)
        // Connect half of the devices
        if (parseInt(device.id.split('-')[1]) % 2 === 0) {
          store.updateDevice(device.id, { isConnected: true })
        }
      })

      // Test filtering via adapter
      const adapterTime = measureTime(() => {
        // Get all connected telescopes
        const connectedTelescopes = adapter.discoveredDevices.filter(
          (device) => device.deviceType === 'telescope' && device.isConnected
        )
        // Simulate using the result to avoid optimization
        void connectedTelescopes.length
      })

      // Test filtering directly in store
      const directTime = measureTime(() => {
        // Get all connected telescopes
        const connectedTelescopes = store.devices.filter(
          (device) => device.type === 'telescope' && device.isConnected
        )
        // Simulate using the result to avoid optimization
        void connectedTelescopes.length
      })

      console.log(
        `Filtering performance - Adapter: ${adapterTime.toFixed(2)}ms, Direct: ${directTime.toFixed(2)}ms`
      )
      expect(adapterTime).toBeGreaterThan(directTime)
    })

    it('should measure event handling performance', () => {
      // Set up event handlers
      let adapterEvents = 0
      let directEvents = 0

      adapter.on('deviceAdded', () => {
        adapterEvents++
      })

      store.addEventListener((event) => {
        if (event.type === 'deviceAdded') {
          directEvents++
        }
      })

      // Test event emission via adapter
      const adapterTime = measureTime(() => {
        testDevices.forEach((device) => {
          adapter.addDevice({
            id: device.id,
            deviceName: device.name,
            deviceType: device.type,
            address: device.ipAddress as string,
            devicePort: device.port as number,
            isConnected: false,
            status: 'idle',
            properties: {}
          })
        })
      })

      // Reset store
      store = new UnifiedStore()
      adapterEvents = 0
      directEvents = 0

      store.addEventListener((event) => {
        if (event.type === 'deviceAdded') {
          directEvents++
        }
      })

      // Test event emission directly
      const directTime = measureTime(() => {
        testDevices.forEach((device) => {
          store.addDevice(device)
        })
      })

      console.log(
        `Event handling performance - Adapter: ${adapterTime.toFixed(2)}ms, Direct: ${directTime.toFixed(2)}ms`
      )
      expect(adapterEvents).toBe(testDevices.length)
      expect(directEvents).toBe(testDevices.length)
      expect(adapterTime).toBeGreaterThan(directTime)
    })
  })

  describe('Memory Usage', () => {
    it('should measure memory consumption between adapter and direct approaches', () => {
      // Measure memory for adapter approach
      const adapterMemory = measureMemoryUsage(() => {
        const adapters = []
        for (let i = 0; i < 10; i++) {
          const newStore = new UnifiedStore()
          const newAdapter = createStoreAdapter(newStore)

          // Add devices to each store
          testDevices.forEach((device) => {
            newStore.addDevice(device)
          })

          adapters.push(newAdapter)
        }

        // Force adapters to be used
        adapters.forEach((a) => void a.discoveredDevices.length)
      })

      // Measure memory for direct store approach
      const directMemory = measureMemoryUsage(() => {
        const stores = []
        for (let i = 0; i < 10; i++) {
          const newStore = new UnifiedStore()

          // Add devices to each store
          testDevices.forEach((device) => {
            newStore.addDevice(device)
          })

          stores.push(newStore)
        }

        // Force stores to be used
        stores.forEach((s) => void s.devices.length)
      })

      console.log(
        `Memory usage - Adapter: ${adapterMemory.toFixed(2)}MB, Direct: ${directMemory.toFixed(2)}MB`
      )

      // Adapter approach should use more memory due to the additional layer
      expect(adapterMemory).toBeGreaterThan(directMemory)
    })
  })

  describe('Component Rendering Performance', () => {
    it('should measure component rendering performance with adapter vs direct store', async () => {
      // Add devices to store
      testDevices.forEach((device) => {
        store.addDevice(device)
      })

      // Measure render time for adapter component
      let adapterComponent: any
      const adapterRenderTime = measureTime(() => {
        adapterComponent = shallowMount(AdapterComponent, {
          props: {
            adapter
          }
        })
      })

      // Cleanup
      adapterComponent.unmount()

      // Measure render time for direct component
      let directComponent: any
      const directRenderTime = measureTime(() => {
        directComponent = shallowMount(DirectComponent, {
          props: {
            store
          }
        })
      })

      // Cleanup
      directComponent.unmount()

      console.log(
        `Initial render - Adapter: ${adapterRenderTime.toFixed(2)}ms, Direct: ${directRenderTime.toFixed(2)}ms`
      )

      // Measure update performance

      // Setup components
      adapterComponent = shallowMount(AdapterComponent, {
        props: { adapter }
      })

      directComponent = shallowMount(DirectComponent, {
        props: { store }
      })

      // Measure update time for adapter component
      const adapterUpdateTime = measureTime(async () => {
        // Update all devices
        for (let i = 0; i < 10; i++) {
          // Limit to 10 updates for faster benchmarking
          adapter.updateDevice?.(`device-${i}`, {
            isConnected: !adapter.getDeviceById(`device-${i}`)?.isConnected
          })
        }

        await nextTick()
      })

      // Measure update time for direct component
      const directUpdateTime = measureTime(async () => {
        // Update all devices
        for (let i = 0; i < 10; i++) {
          // Limit to 10 updates for faster benchmarking
          store.updateDevice(`device-${i}`, {
            isConnected: !store.getDeviceById(`device-${i}`)?.isConnected
          })
        }

        await nextTick()
      })

      console.log(
        `Update performance - Adapter: ${adapterUpdateTime.toFixed(2)}ms, Direct: ${directUpdateTime.toFixed(2)}ms`
      )

      // Cleanup
      adapterComponent.unmount()
      directComponent.unmount()

      expect(adapterRenderTime).toBeGreaterThanOrEqual(directRenderTime * 0.9) // Allow 10% margin
      expect(adapterUpdateTime).toBeGreaterThanOrEqual(directUpdateTime * 0.9) // Allow 10% margin
    })
  })

  describe('Bundle Size Impact', () => {
    it('should estimate the adapter impact on bundle size', () => {
      // Get code size for adapter
      const adapterCode = Object.getOwnPropertyNames(Object.getPrototypeOf(adapter)).length
      const storeCode = Object.getOwnPropertyNames(Object.getPrototypeOf(store)).length

      // Log the difference
      console.log(`API surface - Adapter: ${adapterCode} methods, Store: ${storeCode} methods`)
      console.log(
        `Estimated additional bundle size from adapter: ~${(adapterCode * 0.5).toFixed(1)}KB`
      )

      // The adapter adds overhead, which impacts bundle size
      expect(adapterCode).toBeGreaterThan(0)
    })
  })
})
