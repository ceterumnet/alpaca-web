import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MainPanelsMigrated from '../MainPanelsMigrated.vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useLayoutStore } from '@/stores/useLayoutStore'
import type { UnifiedDevice } from '@/types/DeviceTypes'

// Mock the store dependencies
vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: vi.fn(),
  default: vi.fn().mockImplementation(() => ({
    devicesList: [],
    connectDevice: vi.fn(),
    disconnectDevice: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }))
}))

vi.mock('@/stores/useLayoutStore', () => ({
  useLayoutStore: vi.fn()
}))

// Mock the component dependencies
vi.mock('../DiscoveredDevicesMigrated.vue', () => ({
  default: {
    template: '<div data-testid="discovered-devices"></div>'
  }
}))

vi.mock('../TelescopePanelMigrated.vue', () => ({
  default: {
    template: '<div data-testid="telescope-panel"></div>',
    props: [
      'deviceId',
      'connected',
      'panelName',
      'deviceType',
      'supportedModes',
      'idx',
      'deviceNum',
      'apiBaseUrl'
    ]
  }
}))

vi.mock('../CameraPanelMigrated.vue', () => ({
  default: {
    template: '<div data-testid="camera-panel"></div>',
    props: [
      'deviceId',
      'connected',
      'panelName',
      'deviceType',
      'supportedModes',
      'idx',
      'deviceNum',
      'apiBaseUrl'
    ]
  }
}))

vi.mock('../EnhancedPanelComponentMigrated.vue', () => ({
  default: {
    template: '<div data-testid="enhanced-panel"></div>',
    props: [
      'deviceId',
      'connected',
      'panelName',
      'deviceType',
      'supportedModes',
      'idx',
      'deviceNum',
      'apiBaseUrl'
    ]
  }
}))

vi.mock('../Icon.vue', () => ({
  default: {
    template: '<div></div>',
    props: ['type']
  }
}))

// Mock grid-layout-plus
vi.mock('grid-layout-plus', () => ({
  GridLayout: {
    template: '<div class="grid-layout"><slot></slot></div>',
    props: ['layout', 'rowHeight']
  },
  GridItem: {
    template: '<div class="grid-item"><slot></slot></div>',
    props: ['x', 'y', 'w', 'h', 'i', 'dragAllowFrom', 'dragIgnoreFrom']
  }
}))

describe('MainPanelsMigrated.vue', () => {
  // Define types for our mocks
  type MockLayoutStore = {
    layout: Array<Record<string, unknown>>
    initLayout: ReturnType<typeof vi.fn>
    updateLayout: ReturnType<typeof vi.fn>
    resetLayout: ReturnType<typeof vi.fn>
    saveLayout: ReturnType<typeof vi.fn>
  }

  type MockUnifiedStore = {
    devicesList: UnifiedDevice[]
    on: ReturnType<typeof vi.fn>
    off: ReturnType<typeof vi.fn>
    removeDevice: ReturnType<typeof vi.fn>
    connectDevice: ReturnType<typeof vi.fn>
    disconnectDevice: ReturnType<typeof vi.fn>
  }

  let mockLayoutStore: MockLayoutStore
  let mockUnifiedStore: MockUnifiedStore
  let mockLayout: Array<Record<string, unknown>>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a mock layout
    mockLayout = [
      {
        x: 0,
        y: 0,
        w: 6,
        h: 20,
        i: 'telescope-0',
        deviceType: 'telescope',
        deviceNum: 0,
        deviceId: 'telescope-123',
        connected: true,
        apiBaseUrl: '/api/v1/telescope/0'
      },
      {
        x: 6,
        y: 0,
        w: 6,
        h: 20,
        i: 'camera-0',
        deviceType: 'camera',
        deviceNum: 0,
        deviceId: 'camera-456',
        connected: false,
        apiBaseUrl: '/api/v1/camera/0'
      }
    ]

    // Mock the layout store
    mockLayoutStore = {
      layout: mockLayout,
      initLayout: vi.fn(),
      updateLayout: vi.fn(),
      resetLayout: vi.fn(),
      saveLayout: vi.fn()
    }

    // Use the layout store mock
    vi.mocked(useLayoutStore).mockReturnValue(
      mockLayoutStore as unknown as ReturnType<typeof useLayoutStore>
    )

    // Create test devices
    const testDevices: UnifiedDevice[] = [
      {
        id: 'telescope-123',
        name: 'Test Telescope',
        type: 'telescope',
        isConnected: true,
        isConnecting: false,
        isDisconnecting: false,
        properties: {
          deviceNumber: 0,
          apiBaseUrl: '/api/v1/telescope/0'
        }
      },
      {
        id: 'camera-456',
        name: 'Test Camera',
        type: 'camera',
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        properties: {
          deviceNumber: 0,
          apiBaseUrl: '/api/v1/camera/0'
        }
      }
    ]

    // Create a mock unified store with the test devices
    mockUnifiedStore = {
      devicesList: testDevices,
      on: vi.fn(),
      off: vi.fn(),
      removeDevice: vi.fn(),
      connectDevice: vi.fn().mockResolvedValue(true),
      disconnectDevice: vi.fn().mockResolvedValue(true)
    }

    // Use the unified store mock
    vi.mocked(useUnifiedStore).mockReturnValue(
      mockUnifiedStore as unknown as ReturnType<typeof useUnifiedStore>
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders properly with the initial layout', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Check if the component renders correctly
    // The DiscoveredDevices component is no longer directly rendered in the main component
    // So we'll check for the grid items instead
    expect(wrapper.findAll('.grid-item').length).toBe(2)
  })

  it('registers event handlers when mounted', async () => {
    mount(MainPanelsMigrated)
    await flushPromises()

    // Check if the event handlers are registered
    expect(mockUnifiedStore.on).toHaveBeenCalledWith('deviceAdded', expect.any(Function))
    expect(mockUnifiedStore.on).toHaveBeenCalledWith('deviceRemoved', expect.any(Function))
    expect(mockUnifiedStore.on).toHaveBeenCalledWith('deviceUpdated', expect.any(Function))

    // Check if the layout is initialized
    expect(mockLayoutStore.initLayout).toHaveBeenCalled()
  })

  it('removes event handlers when unmounted', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    wrapper.unmount()

    // Check if the event handlers are removed
    expect(mockUnifiedStore.off).toHaveBeenCalledWith('deviceAdded', expect.any(Function))
    expect(mockUnifiedStore.off).toHaveBeenCalledWith('deviceRemoved', expect.any(Function))
    expect(mockUnifiedStore.off).toHaveBeenCalledWith('deviceUpdated', expect.any(Function))
  })

  it('selects the correct panel component for telescope devices', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Extract the first GridItem from the DOM
    const gridItems = wrapper.findAll('.grid-item')
    const firstItem = gridItems[0]

    // Check if the telescope panel component is used for the telescope device
    expect(firstItem.find('[data-testid="telescope-panel"]').exists()).toBe(true)
  })

  it('selects the correct panel component for camera devices', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Extract the second GridItem from the DOM
    const gridItems = wrapper.findAll('.grid-item')
    const secondItem = gridItems[1]

    // Check if the camera panel component is used for the camera device
    expect(secondItem.find('[data-testid="camera-panel"]').exists()).toBe(true)
  })

  it('updates layout when a new device is added', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Simulate adding a new device by calling the deviceAdded handler directly
    const newDevice: UnifiedDevice = {
      id: 'focuser-789',
      name: 'Test Focuser',
      type: 'focuser',
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      properties: {
        deviceNumber: 0,
        apiBaseUrl: '/api/v1/focuser/0'
      }
    }

    // Get the deviceAdded handler callback
    const deviceAddedHandler = mockUnifiedStore.on.mock.calls.find(
      (call) => call[0] === 'deviceAdded'
    )?.[1]

    if (deviceAddedHandler) {
      // Call the handler with the new device
      deviceAddedHandler(newDevice)

      // Force layout update
      await wrapper.vm.$nextTick()

      // Check if the layout store's updateLayout method was called
      expect(mockLayoutStore.updateLayout).toHaveBeenCalled()
    }
  })

  it('removes a panel from the layout when requested', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Cast to unknown first, then to the specific type
    const vm = wrapper.vm as unknown as {
      removePanel: (itemId: string) => void
    }

    // Call the removePanel method directly
    vm.removePanel('telescope-0')

    // Force the update
    await wrapper.vm.$nextTick()

    // Check if layout was filtered and updateLayout was called
    expect(mockLayoutStore.updateLayout).toHaveBeenCalled()

    // Mock that the layout was updated (simulation)
    mockLayoutStore.layout = mockLayoutStore.layout.filter((item) => item.i !== 'telescope-0')

    // Re-render with updated layout
    await wrapper.vm.$nextTick()

    // Verify that the filtered layout was passed to the store
    expect(mockLayoutStore.updateLayout).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ i: 'telescope-0' })])
    )
  })

  it('handles connect/disconnect actions correctly', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Cast to unknown first, then to the specific type
    const vm = wrapper.vm as unknown as {
      handleConnect: (connected: boolean, itemId: string) => void
    }

    // Call the handleConnect method with connected=true
    vm.handleConnect(true, 'telescope-0')

    // Check if the store's connectDevice method was called with the correct device ID
    expect(mockUnifiedStore.connectDevice).toHaveBeenCalledWith('telescope-123')

    // Call handleConnect with connected=false
    vm.handleConnect(false, 'telescope-0')

    // Check if the store's disconnectDevice method was called with the correct device ID
    expect(mockUnifiedStore.disconnectDevice).toHaveBeenCalledWith('telescope-123')
  })

  it('properly resets the layout when resetLayout is called', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Cast to unknown first, then to the specific type
    const vm = wrapper.vm as unknown as {
      resetLayout: () => void
    }

    // Call the resetLayout method
    vm.resetLayout()

    // Check if the layout store's resetLayout method was called
    expect(mockLayoutStore.resetLayout).toHaveBeenCalled()
  })

  it('saves layout presets when requested', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Cast to unknown first, then to the specific type
    const vm = wrapper.vm as unknown as {
      saveLayoutPreset: () => void
    }

    // Call the saveLayoutPreset method
    vm.saveLayoutPreset()

    // Check if the layout store's saveLayout method was called
    expect(mockLayoutStore.saveLayout).toHaveBeenCalled()
  })

  it('updates the layout when a device connection state changes', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Get the deviceUpdated handler callback
    const deviceUpdatedHandler = mockUnifiedStore.on.mock.calls.find(
      (call) => call[0] === 'deviceUpdated'
    )?.[1]

    if (deviceUpdatedHandler) {
      // Call the handler with an updated device (connection state changed)
      deviceUpdatedHandler({
        ...mockUnifiedStore.devicesList[1],
        isConnected: true
      })

      // Force layout update
      await wrapper.vm.$nextTick()

      // Check if the layout is being updated to reflect the connection state change
      expect(mockLayoutStore.updateLayout).toHaveBeenCalled()
    }
  })

  it('properly handles layout updates from the grid component', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Cast to unknown first, then to the specific type
    const vm = wrapper.vm as unknown as {
      onLayoutUpdate: (newLayout: Array<Record<string, unknown>>) => void
    }

    // Call the onLayoutUpdate method with a new layout
    const updatedLayout = [...mockLayout]
    updatedLayout[0] = { ...updatedLayout[0], x: 3, y: 3 } // Move the telescope panel

    vm.onLayoutUpdate(updatedLayout)

    // Check if the layout store's updateLayout was called with the new layout
    expect(mockLayoutStore.updateLayout).toHaveBeenCalledWith(updatedLayout)
  })

  it('correctly formats panel names', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Cast to unknown first, then to the specific type
    const vm = wrapper.vm as unknown as {
      getPanelName: (item: Record<string, unknown>) => string
    }

    // Test telescope panel name formatting
    const telescopeName = vm.getPanelName({ deviceType: 'telescope', deviceNum: 0 })
    expect(telescopeName).toBe('Telescope 0')

    // Test camera panel name formatting
    const cameraName = vm.getPanelName({ deviceType: 'camera', deviceNum: 1 })
    expect(cameraName).toBe('Camera 1')

    // Test generic panel name formatting
    const genericName = vm.getPanelName({ i: '123' })
    expect(genericName).toBe('Panel 123')
  })

  it('handles device removal correctly', async () => {
    const wrapper = mount(MainPanelsMigrated)
    await flushPromises()

    // Get the deviceRemoved handler callback
    const deviceRemovedHandler = mockUnifiedStore.on.mock.calls.find(
      (call) => call[0] === 'deviceRemoved'
    )?.[1]

    if (deviceRemovedHandler) {
      // Call the handler with a device ID to remove
      deviceRemovedHandler('telescope-123')

      // Force layout update
      await wrapper.vm.$nextTick()

      // Check if the layout is being updated to remove the device panel
      expect(mockLayoutStore.updateLayout).toHaveBeenCalled()
    }
  })
})
