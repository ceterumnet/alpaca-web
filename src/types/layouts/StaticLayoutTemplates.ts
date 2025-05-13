// Static layout templates for the application
// These are predefined layouts that can be used as starting points

// Define interfaces for layout cells and templates
export interface LayoutCell {
  id: string
  row: number
  col: number
  rowSpan?: number
  colSpan?: number
  width?: number
  deviceType?: string
  name?: string
}

export interface LayoutTemplate {
  id: string
  name: string
  rows: number
  cols: number
  cells: LayoutCell[]
}

// Shared static layout templates
export const staticLayouts: LayoutTemplate[] = [
  {
    id: '2x2',
    name: '2x2 Grid',
    rows: 2,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0 },
      { id: 'cell-2', row: 0, col: 1 },
      { id: 'cell-3', row: 1, col: 0 },
      { id: 'cell-4', row: 1, col: 1 }
    ]
  },
  {
    id: '1x2',
    name: '1x2 Grid',
    rows: 1,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0 },
      { id: 'cell-2', row: 0, col: 1 }
    ]
  },
  {
    id: '3x2',
    name: '3x2 Grid',
    rows: 3,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0 },
      { id: 'cell-2', row: 0, col: 1 },
      { id: 'cell-3', row: 1, col: 0 },
      { id: 'cell-4', row: 1, col: 1 },
      { id: 'cell-5', row: 2, col: 0 },
      { id: 'cell-6', row: 2, col: 1 }
    ]
  },
  {
    id: 'hybrid-50',
    name: 'Hybrid 50/50',
    rows: 2,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0, rowSpan: 2, colSpan: 1 },
      { id: 'cell-2', row: 0, col: 1 },
      { id: 'cell-3', row: 1, col: 1 }
    ]
  },
  {
    id: 'hybrid-60',
    name: 'Hybrid 60/40',
    rows: 2,
    cols: 2,
    cells: [
      { id: 'cell-1', row: 0, col: 0, rowSpan: 2, colSpan: 1, width: 60 },
      { id: 'cell-2', row: 0, col: 1, width: 40 },
      { id: 'cell-3', row: 1, col: 1, width: 40 }
    ]
  }
]
