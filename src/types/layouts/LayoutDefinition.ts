// Status: Good - Core Type Definition
// This module provides layout type definitions that:
// - Defines core layout interfaces and types
// - Supports responsive design with viewport-specific layouts
// - Provides grid-based layout system
// - Implements panel positioning and sizing
// - Maintains layout persistence structure

/**
 * Types for the panel layout system
 */

/**
 * Position and dimensions of a panel in a layout
 */
export interface PanelPosition {
  panelId: string
  x: number
  y: number
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  deviceType?: string // Type of device assigned to this panel position
}

/**
 * Layout configuration for a specific device type (desktop, tablet, mobile)
 */
export interface DeviceLayout {
  deviceType: 'desktop' | 'tablet' | 'mobile'
  positions: PanelPosition[]
}

/**
 * Definition of a complete layout with configurations for different device types
 */
export interface LayoutDefinition {
  id: string
  name: string
  description?: string
  layouts: DeviceLayout[]
  isDefault?: boolean
  createdBy?: string
  createdAt?: number
  updatedAt?: number
  icon?: string
}

/**
 * Cell in a layout grid
 */
export interface LayoutCell {
  id: string
  deviceType: string | null
  name: string
  priority: 'primary' | 'secondary' | 'tertiary'
  width: number // Percentage width within row
}

/**
 * Row in a layout grid
 */
export interface LayoutRow {
  id: string
  cells: LayoutCell[]
  height: number // Height as percentage of container
}

/**
 * Grid-based layout for a specific viewport
 */
export interface GridLayout {
  rows: LayoutRow[]
  panelIds: string[] // Keeps track of all panels included in this layout
}

/**
 * Complete layout definition with configurations for different viewports
 */
export interface GridLayoutDefinition {
  id: string
  name: string
  description?: string
  layouts: Record<'desktop' | 'tablet' | 'mobile', GridLayout>
  isDefault?: boolean
  createdBy?: string
  createdAt?: number
  updatedAt?: number
  icon?: string
}

/**
 * Available viewport types for responsive layouts
 */
export type Viewport = 'desktop' | 'tablet' | 'mobile'
