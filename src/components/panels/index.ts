// Status: Good - Core Component
// This is the panel system registry that:
// - Exports core panel components
// - Provides component registration
// - Maintains component consistency
// - Supports panel system extensibility

import BasePanel from './BasePanel.vue'
import BaseDevicePanel from './BaseDevicePanel.vue'
import ResponsivePanel from './ResponsivePanel.vue'
import CameraControls from './CameraControls.vue'
import type { App } from 'vue'

// Export components individually
export { BasePanel, BaseDevicePanel, ResponsivePanel, CameraControls }

// Export as default
export default {
  install(app: App) {
    app.component('BasePanel', BasePanel)
    app.component('BaseDevicePanel', BaseDevicePanel)
    app.component('ResponsivePanel', ResponsivePanel)
    app.component('CameraControls', CameraControls)
  }
}
