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
import DeepSkyCatalogPanel from '@/components/panels/DeepSkyCatalogPanel.vue'

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

export interface PanelRegistryEntry {
  type: 'device' | 'utility'
  component: Component
  label: string
}

const panelRegistry: Record<string, PanelRegistryEntry> = {
  camera: { type: 'device', component: markRaw(SimplifiedCameraPanel), label: 'Camera' },
  telescope: { type: 'device', component: markRaw(SimplifiedTelescopePanel), label: 'Telescope' },
  focuser: { type: 'device', component: markRaw(SimplifiedFocuserPanel), label: 'Focuser' },
  filterwheel: { type: 'device', component: markRaw(SimplifiedFilterWheelPanel), label: 'Filter Wheel' },
  covercalibrator: { type: 'device', component: markRaw(SimplifiedCoverCalibratorPanel), label: 'Cover/Calibrator' },
  dome: { type: 'device', component: markRaw(SimplifiedDomePanel), label: 'Dome' },
  observingconditions: { type: 'device', component: markRaw(SimplifiedObservingConditionsPanel), label: 'Observing Conditions' },
  rotator: { type: 'device', component: markRaw(SimplifiedRotatorPanel), label: 'Rotator' },
  safetymonitor: { type: 'device', component: markRaw(SimplifiedSafetyMonitorPanel), label: 'Safety Monitor' },
  switch: { type: 'device', component: markRaw(SimplifiedSwitchPanel), label: 'Switch' },
  deepskycatalog: { type: 'utility', component: markRaw(DeepSkyCatalogPanel), label: 'Deep Sky Catalog' }
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
      // Update last active time
      this.registry.value[key].lastActive = Date.now()
      return this.registry.value[key]
    }

    // Get the component based on device type
    const component = panelRegistry[normalizedType].component

    if (!component) {
      log.error(
        `[DeviceComponentRegistry] registerDevice FAILED: No component found in componentMap for normalizedType "${normalizedType}" (original deviceType: "${deviceType}", deviceId: "${deviceId}"). Available mapped types: ${Object.keys(panelRegistry).join(', ')}`
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
    log.debug({ deviceIds: [deviceId] }, `[DeviceComponentRegistry] Registered device component: ${normalizedType}-${deviceId}`)


    return componentRef
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
    componentRef.lastActive = Date.now()
    componentRef.assignmentCount++
  }

}

// Create singleton instance
const deviceComponentRegistry = new DeviceComponentRegistry()

export default deviceComponentRegistry

// Universal panel instance registry (for state preservation)
interface PanelInstanceRef {
  cellId: string
  panelType: string
  component: Component
  createdAt: number
  lastActive: number
}

const panelInstances = ref<Record<string, PanelInstanceRef>>({})

export function getOrCreatePanelInstance(cellId: string, panelType: string): PanelInstanceRef {
  const key = `${panelType}-${cellId}`
  if (panelInstances.value[key]) {
    panelInstances.value[key].lastActive = Date.now()
    return panelInstances.value[key]
  }
  const entry = panelRegistry[panelType]
  if (!entry) throw new Error(`No panel registered for type ${panelType}`)
  const refObj: PanelInstanceRef = {
    cellId,
    panelType,
    component: markRaw(entry.component),
    createdAt: Date.now(),
    lastActive: Date.now()
  }
  panelInstances.value[key] = refObj
  return refObj
}

export { panelRegistry }
