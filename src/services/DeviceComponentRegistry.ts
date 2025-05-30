// Status: New Service
// This service implements a central component registry pattern that:
// - Manages device component instances
// - Ensures components are only created once
// - Maintains device state across layout changes
// - Provides a consistent way to reference device components

import log from '@/plugins/logger'

import { ref, markRaw } from 'vue'
import type { Component } from 'vue'
import SimplifiedCameraPanel from '@/components/devices/SimplifiedCameraPanel.vue'
import SimplifiedTelescopePanel from '@/components/devices/SimplifiedTelescopePanel.vue'
import SimplifiedFocuserPanel from '@/components/devices/SimplifiedFocuserPanel.vue'
import SimplifiedFilterWheelPanel from '@/components/devices/SimplifiedFilterWheelPanel.vue'
import SimplifiedCoverCalibratorPanel from '@/components/devices/SimplifiedCoverCalibratorPanel.vue'
import SimplifiedDomePanel from '@/components/devices/SimplifiedDomePanel.vue'
import SimplifiedObservingConditionsPanel from '@/components/devices/SimplifiedObservingConditionsPanel.vue'
import SimplifiedRotatorPanel from '@/components/devices/SimplifiedRotatorPanel.vue'
import SimplifiedSafetyMonitorPanel from '@/components/devices/SimplifiedSafetyMonitorPanel.vue'
import SimplifiedSwitchPanel from '@/components/devices/SimplifiedSwitchPanel.vue'

// Types
export interface DeviceComponentRef {
  id: string
  type: string
  component: Component
  isVisible: boolean
  isMaximized: boolean
  currentCell: string | null
  createdAt: number
  lastActive: number
  assignmentCount: number
}

// Performance metrics
interface PerformanceMetrics {
  componentCreations: number
  assignmentChanges: number
  assignmentsPerDevice: Record<string, number>
  unregisteredComponents: number
  averageAssignmentTime: number
  totalAssignmentTime: number
  assignmentCount: number
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
  registry = ref<Record<string, DeviceComponentRef>>({})

  // Registered component types
  private componentMap: Record<string, Component> = {
    camera: markRaw(SimplifiedCameraPanel),
    telescope: markRaw(SimplifiedTelescopePanel),
    focuser: markRaw(SimplifiedFocuserPanel),
    filterwheel: markRaw(SimplifiedFilterWheelPanel),
    covercalibrator: markRaw(SimplifiedCoverCalibratorPanel),
    dome: markRaw(SimplifiedDomePanel),
    observingconditions: markRaw(SimplifiedObservingConditionsPanel),
    rotator: markRaw(SimplifiedRotatorPanel),
    safetymonitor: markRaw(SimplifiedSafetyMonitorPanel),
    switch: markRaw(SimplifiedSwitchPanel)
  }

  // Performance metrics
  private metrics: PerformanceMetrics = {
    componentCreations: 0,
    assignmentChanges: 0,
    assignmentsPerDevice: {},
    unregisteredComponents: 0,
    averageAssignmentTime: 0,
    totalAssignmentTime: 0,
    assignmentCount: 0
  }

  /**
   * Register a device component
   *
   * @param deviceId - The unique device ID
   * @param deviceType - The type of device (camera, telescope, etc.)
   * @returns The component reference
   */
  registerDevice(deviceId: string, deviceType: string): DeviceComponentRef {
    const startTime = performance.now()
    const normalizedType = deviceType.toLowerCase()
    const key = `${normalizedType}-${deviceId}`

    // Return existing component if it exists
    if (this.registry.value[key]) {
      // Update last active time
      this.registry.value[key].lastActive = Date.now()
      return this.registry.value[key]
    }

    // Get the component based on device type
    const component = this.componentMap[normalizedType]

    if (!component) {
      log.error(
        `[DeviceComponentRegistry] registerDevice FAILED: No component found in componentMap for normalizedType "${normalizedType}" (original deviceType: "${deviceType}", deviceId: "${deviceId}"). Available mapped types: ${Object.keys(this.componentMap).join(', ')}`
      )
      throw new Error(`No component registered for device type "${normalizedType}"`)
    }

    // Create new component reference
    const componentRef: DeviceComponentRef = {
      id: deviceId,
      type: normalizedType,
      component: markRaw(component),
      isVisible: false,
      isMaximized: false,
      currentCell: null,
      createdAt: Date.now(),
      lastActive: Date.now(),
      assignmentCount: 0
    }

    // Add to registry
    this.registry.value[key] = componentRef
    log.info({ deviceIds: [deviceId] }, `[DeviceComponentRegistry] Registered device component: ${normalizedType}-${deviceId}`)

    // Update metrics
    this.metrics.componentCreations++
    this.metrics.assignmentsPerDevice[key] = 0

    // Log performance
    const elapsedTime = performance.now() - startTime
    log.info({ deviceIds: [deviceId] }, `[DeviceComponentRegistry] Component registration took ${elapsedTime.toFixed(2)}ms`)

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
    const originalDeviceType = deviceType // Keep original for logging
    const normalizedType = deviceType ? deviceType.toLowerCase() : ''

    if (!normalizedType) {
      log.warn(
        { deviceIds: [deviceId] },
        `[DeviceComponentRegistry] getComponent received invalid deviceType: original="${originalDeviceType}" normalized="${normalizedType}" for deviceId: "${deviceId}". Returning null.`
      )
      return null
    }
    const key = `${normalizedType}-${deviceId}`

    // Return component if it exists
    if (this.registry.value[key]) {
      // Update last active time
      this.registry.value[key].lastActive = Date.now()
      log.debug({ deviceIds: [deviceId] }, `[DeviceComponentRegistry] getComponent: Returning existing component for key "${key}"`)
      return this.registry.value[key].component
    }

    log.debug(
      { deviceIds: [deviceId] },
      `[DeviceComponentRegistry] getComponent: Component for key "${key}" not in registry. Attempting to register.`
    )
    try {
      const ref = this.registerDevice(deviceId, normalizedType) // Pass normalizedType
      log.info(
        { deviceIds: [deviceId] },
        `[DeviceComponentRegistry] getComponent: Successfully registered and returning new component for key "${key}"`
      )
      return ref.component
    } catch (error) {
      // This catch is crucial. It happens if registerDevice throws (e.g., type not in componentMap after all checks).
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error(
        {
          deviceIds: [deviceId],
          errorMessage
        },
        `[DeviceComponentRegistry] getComponent FAILED for key "${key}". Error during internal registerDevice call. Original deviceType: "${originalDeviceType}", Normalized: "${normalizedType}". Error:`,
        errorMessage
      )
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
    const startTime = performance.now()
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
    componentRef.lastActive = Date.now()
    componentRef.assignmentCount++

    // Update metrics
    this.metrics.assignmentChanges++
    this.metrics.assignmentsPerDevice[key] = (this.metrics.assignmentsPerDevice[key] || 0) + 1

    // Track assignment time for performance metrics
    const elapsedTime = performance.now() - startTime
    this.metrics.totalAssignmentTime += elapsedTime
    this.metrics.assignmentCount++
    this.metrics.averageAssignmentTime = this.metrics.totalAssignmentTime / this.metrics.assignmentCount

    log.info(
      { deviceIds: [deviceId] },
      `[DeviceComponentRegistry] Assigned ${normalizedType}-${deviceId} to cell ${cellId} (took ${elapsedTime.toFixed(2)}ms)`
    )
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
      this.metrics.unregisteredComponents++
      log.info({ deviceIds: [deviceId] }, `[DeviceComponentRegistry] Unregistered device component: ${normalizedType}-${deviceId}`)
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

    log.info('[DeviceComponentRegistry] Cleared all device assignments')
  }

  /**
   * Get performance metrics for the registry
   *
   * @returns The current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Log performance metrics to console
   */
  logPerformanceMetrics(): void {
    log.debug('=== DeviceComponentRegistry Performance Metrics ===')
    log.debug(`Total components created: ${this.metrics.componentCreations}`)
    log.debug(`Total assignment changes: ${this.metrics.assignmentChanges}`)
    log.debug(`Components unregistered: ${this.metrics.unregisteredComponents}`)
    log.debug(`Average assignment time: ${this.metrics.averageAssignmentTime.toFixed(2)}ms`)

    // Log devices with most assignments
    const sortedDevices = Object.entries(this.metrics.assignmentsPerDevice)
      .sort(([, aCount], [, bCount]) => bCount - aCount)
      .slice(0, 5)

    log.debug('Top devices by assignment count:')
    sortedDevices.forEach(([device, count]) => {
      log.debug(`  ${device}: ${count} assignments`)
    })

    // Log components by age
    const componentsByAge = Object.values(this.registry.value)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, 5)

    log.debug('Oldest components:')
    componentsByAge.forEach((component) => {
      const ageInMinutes = (Date.now() - component.createdAt) / (1000 * 60)
      log.debug(`  ${component.type}-${component.id}: ${ageInMinutes.toFixed(1)} minutes old, assigned ${component.assignmentCount} times`)
    })

    log.debug('=================================================')
  }

  /**
   * Set maximized state for a device component
   *
   * @param deviceId - The unique device ID
   * @param deviceType - The type of device (camera, telescope, etc.)
   * @param isMaximized - Whether the component should be maximized
   */
  setMaximized(deviceId: string, deviceType: string, isMaximized: boolean): void {
    const normalizedType = deviceType.toLowerCase()
    const key = `${normalizedType}-${deviceId}`

    // Clear other maximized panels if setting to true
    if (isMaximized) {
      Object.values(this.registry.value).forEach((ref) => {
        ref.isMaximized = false
      })
    }

    if (this.registry.value[key]) {
      this.registry.value[key].isMaximized = isMaximized
      log.debug({ deviceIds: [deviceId] }, `[DeviceComponentRegistry] Set maximized state for ${normalizedType}-${deviceId}: ${isMaximized}`)
    }
  }

  /**
   * Check if any panel is currently maximized
   *
   * @returns Boolean indicating if any panel is maximized
   */
  hasMaximizedPanel(): boolean {
    return Object.values(this.registry.value).some((ref) => ref.isMaximized)
  }

  /**
   * Get the current maximized panel if any
   *
   * @returns The maximized device component reference or null if none
   */
  getMaximizedPanel(): DeviceComponentRef | null {
    return Object.values(this.registry.value).find((ref) => ref.isMaximized) || null
  }
}

// Create singleton instance
const deviceComponentRegistry = new DeviceComponentRegistry()

export default deviceComponentRegistry
