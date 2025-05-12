// Grid-based layout definition that supports cells spanning multiple rows/columns
// This is an extension of the existing layout system to support more complex layouts

import type { Viewport } from './LayoutDefinition'

// A cell in a grid-based layout
export interface GridCell {
  id: string
  deviceType: string
  name: string
  priority: 'primary' | 'secondary' | 'tertiary'

  // Grid positioning (all values are 1-based)
  gridRowStart: number
  gridRowEnd: number
  gridColumnStart: number
  gridColumnEnd: number
}

// The grid layout itself
export interface GridBasedLayout {
  // The number of rows and columns in the grid
  rows: number
  columns: number

  // All cells in this layout
  cells: GridCell[]

  // Size of each row as a percentage (array length should match rows)
  rowSizes: number[]

  // Size of each column as a percentage (array length should match columns)
  columnSizes: number[]
}

// Collection of grid layouts for different viewports
export interface GridLayoutDefinition {
  id: string
  name: string
  description?: string
  isDefault?: boolean

  // Grid layouts for each viewport
  layouts: Record<Viewport, GridBasedLayout>

  // Metadata
  createdAt: number
  updatedAt: number
}
