// Status: New Service
// This service implements a central component registry pattern that:
// - Manages device component instances
// - Ensures components are only created once
// - Maintains device state across layout changes
// - Provides a consistent way to reference device components

import { ref, markRaw } from 'vue'
import type { Component } from 'vue'
import SimplifiedCameraPanel from '@/components/devices/SimplifiedCameraPanel.vue'
import SimplifiedTelescopePanel from '@/components/devices/SimplifiedTelescopePanel.vue'
import SimplifiedFocuserPanel from '@/components/devices/SimplifiedFocuserPanel.vue'

// Types
interface DeviceComponentRef {
  id: string
  type: string
  component: Component
  isVisible: boolean
  currentCell: string | null
}

/**
 * Device Component Registry Service
 *
 * This service maintains a registry of device components to ensure
 * they are only instantiated once and their state is preserved
 * across layout changes.
 */
class DeviceComponentRegistry {
  // Registry of device components
  private registry = ref<Record<string, DeviceComponentRef>>({})

  // Registered component types
  private componentMap: Record<string, Component> = {
    camera: markRaw(SimplifiedCameraPanel),
    telescope: markRaw(SimplifiedTelescopePanel),
    focuser: markRaw(SimplifiedFocuserPanel)
  }

  /**
   * Register a device component
   *
   * @param deviceId - The unique device ID
   * @param deviceType - The type of device (camera, telescope, etc.)
   * @returns The component reference
   */
  registerDevice(deviceId: string, deviceType: string): DeviceComponentRef {
    const normalizedType = deviceType.toLowerCase()
    const key = `${normalizedType}-${deviceId}`

    // Return existing component if it exists
    if (this.registry.value[key]) {
      return this.registry.value[key]
    }

    // Get the component based on device type
    const component = this.componentMap[normalizedType]

    if (!component) {
      throw new Error(`No component registered for device type "${normalizedType}"`)
    }

    // Create new component reference
    const componentRef: DeviceComponentRef = {
      id: deviceId,
      type: normalizedType,
      component: markRaw(component),
      isVisible: false,
      currentCell: null
    }

    // Add to registry
    this.registry.value[key] = componentRef
    console.log(`[DeviceComponentRegistry] Registered device component: ${normalizedType}-${deviceId}`)

    return componentRef
  }

  /**
   * Get a component for a device
   *
   * @param deviceId - The unique device ID
   * @param deviceType - The type of device (camera, telescope, etc.)
   * @returns The component or null if not found
   */
  getComponent(deviceId: string, deviceType: string): Component | null {
    const normalizedType = deviceType.toLowerCase()
    const key = `${normalizedType}-${deviceId}`

    // Return component if it exists
    if (this.registry.value[key]) {
      return this.registry.value[key].component
    }

    // Try to register if it doesn't exist
    try {
      const ref = this.registerDevice(deviceId, normalizedType)
      return ref.component
    } catch (error) {
      console.error(`[DeviceComponentRegistry] Error getting component: ${error}`)
      return null
    }
  }

  /**
   * Assign a device to a cell
   *
   * @param deviceId - The unique device ID
   * @param deviceType - The type of device (camera, telescope, etc.)
   * @param cellId - The cell ID to assign this device to
   */
  assignToCell(deviceId: string, deviceType: string, cellId: string): void {
    const normalizedType = deviceType.toLowerCase()
    const key = `${normalizedType}-${deviceId}`

    // Get or create the component reference
    let componentRef: DeviceComponentRef

    if (this.registry.value[key]) {
      componentRef = this.registry.value[key]
    } else {
      componentRef = this.registerDevice(deviceId, normalizedType)
    }

    // Clear previous assignments for this cell
    Object.values(this.registry.value).forEach((ref) => {
      if (ref.currentCell === cellId) {
        ref.currentCell = null
        ref.isVisible = false
      }
    })

    // Update assignment
    componentRef.currentCell = cellId
    componentRef.isVisible = true

    console.log(`[DeviceComponentRegistry] Assigned ${normalizedType}-${deviceId} to cell ${cellId}`)
  }

  /**
   * Get all registered devices
   *
   * @returns Array of device component references
   */
  getAllDevices(): DeviceComponentRef[] {
    return Object.values(this.registry.value)
  }

  /**
   * Get visible devices
   *
   * @returns Array of visible device component references
   */
  getVisibleDevices(): DeviceComponentRef[] {
    return Object.values(this.registry.value).filter((ref) => ref.isVisible)
  }

  /**
   * Get device assigned to a cell
   *
   * @param cellId - The cell ID
   * @returns The device component reference or null if not found
   */
  getDeviceForCell(cellId: string): DeviceComponentRef | null {
    const device = Object.values(this.registry.value).find((ref) => ref.currentCell === cellId)
    return device || null
  }

  /**
   * Remove a device from the registry
   *
   * @param deviceId - The unique device ID
   * @param deviceType - The type of device (camera, telescope, etc.)
   */
  unregisterDevice(deviceId: string, deviceType: string): void {
    const normalizedType = deviceType.toLowerCase()
    const key = `${normalizedType}-${deviceId}`

    if (this.registry.value[key]) {
      delete this.registry.value[key]
      console.log(`[DeviceComponentRegistry] Unregistered device component: ${normalizedType}-${deviceId}`)
    }
  }

  /**
   * Clear all device assignments but keep components
   */
  clearAssignments(): void {
    Object.values(this.registry.value).forEach((ref) => {
      ref.currentCell = null
      ref.isVisible = false
    })

    console.log('[DeviceComponentRegistry] Cleared all device assignments')
  }
}

// Create singleton instance
const deviceComponentRegistry = new DeviceComponentRegistry()

export default deviceComponentRegistry
