// Status: Good - Core Component
// This is the panel system index that:
// - Exports all panel definitions
// - Provides centralized panel registration
// - Maintains panel system organization
// - Supports panel system extensibility
// - Ensures proper panel type exports

import type { PanelDefinition } from '../types/panels/PanelDefinition'
import CameraPanel from './CameraPanel'
import TelescopePanel from './TelescopePanel'
import FocuserPanel from './FocuserPanel'
import FilterWheelPanel from './FilterWheelPanel'
import DomePanel from './DomePanel'
import RotatorPanel from './RotatorPanel'
import ObservingConditionsPanel from './ObservingConditionsPanel'
import SafetyMonitorPanel from './SafetyMonitorPanel'
import SwitchPanel from './SwitchPanel'
import CoverCalibratorPanel from './CoverCalibratorPanel'

// Map of panel definitions by device type
const panelDefinitions: Record<string, PanelDefinition> = {
  camera: CameraPanel,
  telescope: TelescopePanel,
  focuser: FocuserPanel,
  filterwheel: FilterWheelPanel,
  dome: DomePanel,
  rotator: RotatorPanel,
  observingconditions: ObservingConditionsPanel,
  safetymonitor: SafetyMonitorPanel,
  switch: SwitchPanel,
  covercalibrator: CoverCalibratorPanel
}

/**
 * Get a panel definition by device type
 * @param deviceType The ASCOM device type
 * @returns The panel definition or undefined if not found
 */
export function getPanelDefinition(deviceType: string): PanelDefinition | undefined {
  return panelDefinitions[deviceType.toLowerCase()]
}

/**
 * Get all available panel definitions
 * @returns Array of all panel definitions
 */
export function getAllPanelDefinitions(): PanelDefinition[] {
  return Object.values(panelDefinitions)
}

/**
 * Check if a panel definition exists for a device type
 * @param deviceType The ASCOM device type
 * @returns True if a panel definition exists
 */
export function hasPanelDefinition(deviceType: string): boolean {
  return deviceType.toLowerCase() in panelDefinitions
}

export {
  CameraPanel,
  TelescopePanel,
  FocuserPanel,
  FilterWheelPanel,
  DomePanel,
  RotatorPanel,
  ObservingConditionsPanel,
  SafetyMonitorPanel,
  SwitchPanel,
  CoverCalibratorPanel
}

export default panelDefinitions
