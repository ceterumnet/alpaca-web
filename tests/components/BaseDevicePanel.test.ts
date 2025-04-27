import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BaseDevicePanel from '../../src/components/panels/BaseDevicePanel.vue'

// Mock the UnifiedStore
vi.mock('../../src/stores/UnifiedStore', () => {
  const mockGetDeviceById = vi.fn()
  const mockConnectDevice = vi.fn()
  const mockDisconnectDevice = vi.fn()

  return {
    default: vi.fn().mockImplementation(() => ({
      getDeviceById: mockGetDeviceById,
      connectDevice: mockConnectDevice,
      disconnectDevice: mockDisconnectDevice
    }))
  }
})

describe('BaseDevicePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without errors', () => {
    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Device Panel'
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('exposes the expected methods', () => {
    const wrapper = mount(BaseDevicePanel, {
      props: {
        deviceId: 'test-device',
        title: 'Test Device Panel'
      }
    })

    const exposedMethods = Object.keys(wrapper.vm)
    expect(exposedMethods).toContain('handleConnect')
    expect(exposedMethods).toContain('handleModeChange')
    expect(exposedMethods).toContain('device')
    expect(exposedMethods).toContain('isConnected')
    expect(exposedMethods).toContain('deviceType')
  })
})
