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
