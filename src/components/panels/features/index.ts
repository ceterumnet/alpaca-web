// Status: Good - Core Component
// This is the feature components registry that:
// - Provides centralized component registration
// - Maps feature types to component implementations
// - Supports dynamic component resolution
// - Ensures type safety for component props
// - Maintains component consistency across panels

/**
 * Feature Components Registry
 *
 * Central registry for all panel feature components
 */
// Import components
import ActionButton from './ActionButton.vue'
import DynamicValue from './DynamicValue.vue'
import NumericSetting from './NumericSetting.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import SelectSetting from './SelectSetting.vue'
import CompactControl from './CompactControl.vue'
import CollapsibleSection from './CollapsibleSection.vue'
import ContextSensitiveControl from './ContextSensitiveControl.vue'
import CameraExposureControl from './CameraExposureControl.vue'
import CameraImageDisplay from './CameraImageDisplay.vue'
import DirectionalControl from './DirectionalControl.vue'
import type { App, Component } from 'vue'
import { useBaseControl } from './BaseControlMixin'

// Export all feature components
export {
  ActionButton,
  DynamicValue,
  NumericSetting,
  ToggleSwitch,
  SelectSetting,
  CompactControl,
  CollapsibleSection,
  ContextSensitiveControl,
  CameraExposureControl,
  CameraImageDisplay,
  DirectionalControl,
  // Utility exports
  useBaseControl
}

// Define component mapping for panel definitions - use type annotation to avoid issues
export const featureComponents: Record<string, Component> = {
  ActionButton,
  DynamicValue,
  NumericSetting,
  ToggleSwitch,
  SelectSetting,
  CompactControl,
  CollapsibleSection,
  ContextSensitiveControl,
  CameraExposureControl,
  CameraImageDisplay,
  DirectionalControl
}

// Register all feature components with Vue
export default {
  install(app: App) {
    app.component('ActionButton', ActionButton)
    app.component('DynamicValue', DynamicValue)
    app.component('NumericSetting', NumericSetting)
    app.component('ToggleSwitch', ToggleSwitch)
    app.component('SelectSetting', SelectSetting)
    app.component('CompactControl', CompactControl)
    app.component('CollapsibleSection', CollapsibleSection)
    app.component('ContextSensitiveControl', ContextSensitiveControl)
    app.component('CameraExposureControl', CameraExposureControl)
    app.component('CameraImageDisplay', CameraImageDisplay)
    app.component('DirectionalControl', DirectionalControl)
  }
}
