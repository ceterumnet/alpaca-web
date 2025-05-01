// Export all panel definitions
import CameraPanel from './CameraPanel'
import TelescopePanel from './TelescopePanel'
import FocuserPanel from './FocuserPanel'
import CatalogPanel from './CatalogPanel'
import { InteractionType } from './types'

// Panel definitions mapping
const PanelDefinitions = {
  camera: CameraPanel,
  telescope: TelescopePanel,
  focuser: FocuserPanel,
  catalog: CatalogPanel
}

// Type export for panel definitions
export type { PanelDefinition, PanelFeature } from './types'

// Export interaction types
export { InteractionType }

// Export panel definitions
export default PanelDefinitions
