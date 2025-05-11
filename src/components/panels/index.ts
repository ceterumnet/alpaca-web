// Status: Good - Core Component
// This is the panel system registry that:
// - Exports core panel components
// - Provides component registration
// - Maintains component consistency
// - Supports panel system extensibility

import CameraControls from './CameraControls.vue'
import type { App } from 'vue'

// Export components individually
export { CameraControls }

// Export as default
export default {
  install(app: App) {
    app.component('CameraControls', CameraControls)
  }
}
