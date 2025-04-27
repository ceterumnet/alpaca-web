import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ImageAnalysisMigrated from '../ImageAnalysisMigrated.vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import type { UnifiedDevice } from '@/types/DeviceTypes'

// Mock the Icon component
vi.mock('@/components/Icon.vue', () => ({
  default: {
    template: '<span data-testid="icon"></span>',
    props: ['type']
  }
}))

// Create a mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/image-analysis/:id',
      name: 'ImageAnalysis',
      component: ImageAnalysisMigrated
    },
    {
      path: '/device-migrated/:id',
      name: 'DeviceDetail',
      component: { template: '<div>Device Detail</div>' }
    }
  ]
})

// Create a basic mock first
const mockUnifiedStore = {
  getDeviceById: vi.fn(),
  devicesList: []
}

vi.mock('@/stores/UnifiedStore', () => ({
  useUnifiedStore: vi.fn(),
  default: vi.fn().mockImplementation(() => mockUnifiedStore)
}))

describe('ImageAnalysisMigrated', () => {
  const mockDevices: Record<string, UnifiedDevice> = {
    'camera-123': {
      id: 'camera-123',
      name: 'Test Camera',
      type: 'camera',
      isConnected: true,
      isConnecting: false,
      isDisconnecting: false,
      properties: {}
    },
    'telescope-456': {
      id: 'telescope-456',
      name: 'Test Telescope',
      type: 'telescope',
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      properties: {}
    }
  }

  let mockStore: ReturnType<typeof useUnifiedStore>

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup the route
    router.push('/image-analysis/camera-123')

    // Setup mock store
    mockStore = useUnifiedStore()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should display the device name in the header', async () => {
    // Configure mock to return camera device
    vi.mocked(mockStore.getDeviceById).mockReturnValue(mockDevices['camera-123'])

    const wrapper = mount(ImageAnalysisMigrated, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Should display camera name in header
    expect(wrapper.find('.analysis-header h1').text()).toContain('Test Camera')
  })

  it('should show error when device is not found', async () => {
    // Configure mock to return null (device not found)
    vi.mocked(mockStore.getDeviceById).mockReturnValue(null)

    const wrapper = mount(ImageAnalysisMigrated, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Should show error state
    expect(wrapper.find('.error-container').exists()).toBe(true)
    expect(wrapper.text()).toContain('Device with ID camera-123 not found')
  })

  it('should show error when device is not a camera', async () => {
    // Configure mock to return telescope instead of camera
    vi.mocked(mockStore.getDeviceById).mockReturnValue(mockDevices['telescope-456'])

    const wrapper = mount(ImageAnalysisMigrated, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Should show error state
    expect(wrapper.find('.error-container').exists()).toBe(true)
    expect(wrapper.text()).toContain('Selected device is not a camera')
  })

  it('should disable the capture button when device is disconnected', async () => {
    // Configure mock to return disconnected camera
    const disconnectedCamera = { ...mockDevices['camera-123'], isConnected: false }
    vi.mocked(mockStore.getDeviceById).mockReturnValue(disconnectedCamera)

    const wrapper = mount(ImageAnalysisMigrated, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Capture button should be disabled
    const captureButton = wrapper.find('.capture-button')
    expect(captureButton.attributes('disabled')).toBeDefined()
  })

  it('should enable the capture button when device is connected', async () => {
    // Configure mock to return connected camera
    vi.mocked(mockStore.getDeviceById).mockReturnValue(mockDevices['camera-123'])

    const wrapper = mount(ImageAnalysisMigrated, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Capture button should be enabled
    const captureButton = wrapper.find('.capture-button')
    expect(captureButton.attributes('disabled')).toBeUndefined()
  })

  it('should navigate back to device detail when back button is clicked', async () => {
    // Configure mock to return camera device
    vi.mocked(mockStore.getDeviceById).mockReturnValue(mockDevices['camera-123'])

    const wrapper = mount(ImageAnalysisMigrated, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Click back button
    await wrapper.find('.back-button').trigger('click')
    await flushPromises()

    // Should navigate to device detail
    expect(router.currentRoute.value.path).toBe('/device-migrated/camera-123')
  })

  it('should show loading state when capturing an image', async () => {
    // Configure mock to return camera device
    vi.mocked(mockStore.getDeviceById).mockReturnValue(mockDevices['camera-123'])

    // Mock setTimeout to resolve immediately
    vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb()
      return 0 as any
    })

    const wrapper = mount(ImageAnalysisMigrated, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Click capture button
    const captureButton = wrapper.find('.capture-button')
    await captureButton.trigger('click')

    // Should show loading state
    expect(wrapper.text()).toContain('Capturing...')
  })

  it('should toggle auto stretch when checkbox is clicked', async () => {
    // Configure mock to return camera device
    vi.mocked(mockStore.getDeviceById).mockReturnValue(mockDevices['camera-123'])

    // Mock setTimeout to resolve immediately
    vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb()
      return 0 as any
    })

    // Create spy for console.log to verify stretch application
    const consoleSpy = vi.spyOn(console, 'log')

    const wrapper = mount(ImageAnalysisMigrated, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    // Capture an image to show analysis tools
    await wrapper.find('.capture-button').trigger('click')
    await flushPromises()

    // Auto stretch is true by default, so we're turning it off
    const autoStretchCheckbox = wrapper.find('input[type="checkbox"]')
    await autoStretchCheckbox.setValue(false)

    // Should have called applyImageStretch with custom params
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Apply custom stretch'))

    // Turn auto stretch back on
    await autoStretchCheckbox.setValue(true)

    // Should have called applyImageStretch with auto params
    expect(consoleSpy).toHaveBeenCalledWith('Apply auto stretch')
  })
})
