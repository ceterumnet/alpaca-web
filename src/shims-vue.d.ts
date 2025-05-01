// Status: Good - Core Type Definition
// This is the Vue type definition file that:
// - Provides TypeScript type declarations for Vue files
// - Enables TypeScript support for .vue files
// - Defines module augmentations
// - Ensures proper type checking
// - Maintains TypeScript compatibility

/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Path aliases
declare module '@/components/*' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@/stores/*' {
  const module: any
  export default module
}

declare module '@/utils/*' {
  const module: any
  export default module
}
