/* eslint-disable vue/one-component-per-file */
import { defineComponent, h } from 'vue'

// Helper function to create SVG icon components
const createIcon = (path: string) => {
  return defineComponent({
    name: 'IconComponent',
    props: {
      size: {
        type: String,
        default: '24'
      },
      color: {
        type: String,
        default: 'currentColor'
      }
    },
    setup(props, { attrs }) {
      return () =>
        h(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            width: props.size,
            height: props.size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: props.color,
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            ...attrs
          },
          [h('path', { d: path })]
        )
    }
  })
}

// Create multiple paths SVG icon
const createMultiPathIcon = (paths: string[]) => {
  return defineComponent({
    name: 'IconComponent',
    props: {
      size: {
        type: String,
        default: '24'
      },
      color: {
        type: String,
        default: 'currentColor'
      }
    },
    setup(props, { attrs }) {
      return () =>
        h(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            width: props.size,
            height: props.size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: props.color,
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            ...attrs
          },
          paths.map((p) => h('path', { d: p }))
        )
    }
  })
}

// Device Icons
export const Telescope = createMultiPathIcon([
  'M12 3v10M8 13h8',
  'M17 8a5 5 0 0 0-10 0',
  'M12 13v8M9 21h6'
])

export const Camera = createMultiPathIcon([
  'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z',
  'M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'
])

export const Filter = createMultiPathIcon([
  'M4 3h16a1 1 0 0 1 1 1v1.586a1 1 0 0 1-.293.707l-6.415 6.414a1 1 0 0 0-.292.707v6.305a1 1 0 0 1-1.243.97l-2-.5a1 1 0 0 1-.757-.97v-5.805a1 1 0 0 0-.293-.707L3.292 6.293A1 1 0 0 1 3 5.586V4a1 1 0 0 1 1-1z'
])

export const Focus = createMultiPathIcon([
  'M12 8v8M8 12h8',
  'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'
])

// UI Icons
export const Search = createIcon('M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z')

export const Lightning = createIcon('M13 10V3L4 14h7v7l9-11h-7z')

export const Settings = createMultiPathIcon([
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z'
])

export const Sun = createMultiPathIcon([
  'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41'
])

export const Moon = createIcon('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z')

export const ChevronLeft = createIcon('M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z')

export const ChevronRight = createIcon('M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z')

export const Gear = createMultiPathIcon([
  'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'
])

export const Exposure = createMultiPathIcon([
  'M15 17v2h2v-2h2v-2h-2v-2h-2v2h-2v2h2zm5-15H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM5 5h6v2H5V5zm15 15H4L20 4v16z'
])

export const Close = createIcon(
  'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
)

export const Expand = createIcon('M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z')

export const Collapse = createIcon('M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z')

export const Compact = createIcon(
  'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z'
)

export const Detailed = createIcon(
  'M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z'
)

export const Fullscreen = createIcon(
  'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'
)

export const Connected = createIcon(
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'
)

export const Disconnected = createIcon(
  'M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z'
)

export const ArrowUp = createIcon('M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z')

export const ArrowDown = createIcon('M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z')

export const ArrowLeft = createIcon('M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z')

export const ArrowRight = createIcon('M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z')

export const Stop = createIcon('M6 6h12v12H6z')

export const TrackingOn = createMultiPathIcon([
  'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4zm4.51-8.95C17.41 8.99 18 10.43 18 12c0 1.57-.59 3.01-1.49 4.95C18.68 16.8 20 14.97 20 13c0-1.97-1.32-3.8-3.49-3.95zm-9.02 0C5.32 9.05 4 10.88 4 13c0 1.97 1.32 3.8 3.49 3.95C6.59 15.01 6 13.57 6 12c0-1.57.59-3.01 1.49-4.95z'
])

export const TrackingOff = createMultiPathIcon([
  'M12 6c-3.86 0-7 3.14-7 7s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm0 2c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zm0-4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9h-2c0 3.87-3.13 7-7 7s-7-3.13-7-7 3.13-7 7-7v-2z'
])

export const Home = createIcon('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z')

export const Files = createIcon(
  'M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z'
)

export const History = createIcon(
  'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z'
)

export const Dome = createMultiPathIcon([
  'M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z'
])

export const Cloud = createIcon(
  'M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z'
)

export const DeviceUnknown = createIcon(
  'M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z'
)
