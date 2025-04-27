<script lang="ts">
import { defineComponent } from 'vue'

export type IconType =
  | 'camera'
  | 'dome'
  | 'sun'
  | 'moon'
  | 'device-unknown'
  | 'search'
  | 'focus'
  | 'filter'
  | 'cloud'
  | 'chevron-left'
  | 'chevron-right'
  | 'gear'
  | 'exposure'
  | 'close'
  | 'expand'
  | 'collapse'
  | 'compact'
  | 'detailed'
  | 'fullscreen'
  | 'connected'
  | 'disconnected'

export default defineComponent({
  name: 'IconComponent',

  props: {
    type: {
      type: String as () => IconType,
      required: true,
      validator: (value: string): boolean => {
        return [
          'camera',
          'dome',
          'sun',
          'moon',
          'device-unknown',
          'search',
          'focus',
          'filter',
          'cloud',
          'chevron-left',
          'chevron-right',
          'gear',
          'exposure',
          'close',
          'expand',
          'collapse',
          'compact',
          'detailed',
          'fullscreen',
          'connected',
          'disconnected'
        ].includes(value)
      },
      default: 'device-unknown'
    }
  }
})
</script>

<template>
  <div class="icon" :class="`icon--${type}`">
    <svg v-if="type === 'camera'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M9 3H15L17 5H21C22.1 5 23 5.9 23 7V19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V7C1 5.9 1.9 5 3 5H7L9 3ZM12 18C15.3 18 18 15.3 18 12C18 8.7 15.3 6 12 6C8.7 6 6 8.7 6 12C6 15.3 8.7 18 12 18Z"
      />
    </svg>
    <svg v-else-if="type === 'dome'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
      />
    </svg>
    <svg v-else-if="type === 'search'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 001.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 00-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 005.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      />
    </svg>
    <svg v-else-if="type === 'focus'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-14c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
      />
    </svg>
    <svg v-else-if="type === 'filter'" viewBox="0 0 24 24" width="24" height="24">
      <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
    </svg>
    <svg v-else-if="type === 'cloud'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
      />
    </svg>
    <svg v-else-if="type === 'chevron-left'" viewBox="0 0 24 24" width="24" height="24">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
    <svg v-else-if="type === 'chevron-right'" viewBox="0 0 24 24" width="24" height="24">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
    <svg v-else-if="type === 'gear'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
      />
    </svg>
    <svg v-else-if="type === 'exposure'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M15 17v2h2v-2h2v-2h-2v-2h-2v2h-2v2h2zm5-15H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM5 5h6v2H5V5zm15 15H4L20 4v16z"
      />
    </svg>
    <svg v-else-if="type === 'sun'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM2 13H4C4.55 13 5 12.55 5 12C5 11.45 4.55 11 4 11H2C1.45 11 1 11.45 1 12C1 12.55 1.45 13 2 13ZM20 13H22C22.55 13 23 12.55 23 12C23 11.45 22.55 11 22 11H20C19.45 11 19 11.45 19 12C19 12.55 19.45 13 20 13ZM11 2V4C11 4.55 11.45 5 12 5C12.55 5 13 4.55 13 4V2C13 1.45 12.55 1 12 1C11.45 1 11 1.45 11 2ZM11 20V22C11 22.55 11.45 23 12 23C12.55 23 13 22.55 13 22V20C13 19.45 12.55 19 12 19C11.45 19 11 19.45 11 20ZM5.99 4.58C5.6 4.19 4.96 4.19 4.58 4.58C4.19 4.97 4.19 5.61 4.58 5.99L5.64 7.05C6.03 7.44 6.67 7.44 7.05 7.05C7.44 6.66 7.44 6.02 7.05 5.64L5.99 4.58ZM18.36 16.95C17.97 16.56 17.33 16.56 16.95 16.95C16.56 17.34 16.56 17.98 16.95 18.36L18.01 19.42C18.4 19.81 19.04 19.81 19.42 19.42C19.81 19.03 19.81 18.39 19.42 18.01L18.36 16.95ZM19.42 5.99C19.81 5.6 19.81 4.96 19.42 4.58C19.03 4.19 18.39 4.19 18.01 4.58L16.95 5.64C16.56 6.03 16.56 6.67 16.95 7.05C17.34 7.44 17.98 7.44 18.36 7.05L19.42 5.99ZM7.05 18.36C7.44 17.97 7.44 17.33 7.05 16.95C6.66 16.56 6.02 16.56 5.64 16.95L4.58 18.01C4.19 18.4 4.19 19.04 4.58 19.42C4.97 19.81 5.61 19.81 5.99 19.42L7.05 18.36Z"
      />
    </svg>
    <svg v-else-if="type === 'moon'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M12 3C7.41 3 3.86 6.14 3.14 10.5C2.32 15.43 6.05 19.95 11 20C15.17 20.05 18.64 17.21 19.75 13.25C16.35 16.67 10.96 16.09 8.21 12.09C5.29 7.83 7.77 2 12 2C7.17 2 3.14 5.41 2.35 10.01C1.44 15.27 5.4 20.01 10.69 20C15.28 19.99 19 16.29 19 11.71C19 11.42 18.99 10.94 18.97 10.66C18.92 9.82 18.78 9 18.55 8.23C16.43 13.18 9.6 15.1 6.31 10.25C5.39 8.79 5 7.03 5 5.35C6.08 3.96 7.4 3 9 3C7.91 3 6.88 3.25 5.92 3.68C5.35 4.05 4.86 4.5 4.42 5C6.14 3.74 8 3 10 3C11.11 3 12.19 3.25 13.16 3.69C12.13 3.25 11.09 3 10 3H12Z"
      />
    </svg>
    <svg v-else-if="type === 'close'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
      />
    </svg>
    <svg v-else-if="type === 'expand'" viewBox="0 0 24 24" width="24" height="24">
      <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
    </svg>
    <svg v-else-if="type === 'collapse'" viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
    </svg>
    <svg v-else-if="type === 'compact'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
      />
    </svg>
    <svg v-else-if="type === 'detailed'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"
      />
    </svg>
    <svg v-else-if="type === 'fullscreen'" viewBox="0 0 24 24" width="24" height="24">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
    <svg v-else-if="type === 'connected'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
      />
    </svg>
    <svg v-else-if="type === 'disconnected'" viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z"
      />
    </svg>
    <svg v-else viewBox="0 0 24 24" width="24" height="24">
      <path
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z"
      />
    </svg>
  </div>
</template>

<style scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.icon svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.icon--camera {
  color: var(--camera-icon-color, #4caf50);
}

.icon--dome {
  color: var(--dome-icon-color, #2196f3);
}

.icon--sun {
  color: var(--sun-icon-color, #ff9800);
}

.icon--moon {
  color: var(--moon-icon-color, #9c27b0);
}

.icon--search {
  color: var(--search-icon-color, #607d8b);
}

.icon--focus {
  color: var(--focus-icon-color, #03a9f4);
}

.icon--filter {
  color: var(--filter-icon-color, #795548);
}

.icon--cloud {
  color: var(--cloud-icon-color, #3f51b5);
}

.icon--chevron-left,
.icon--chevron-right {
  color: var(--chevron-icon-color, #9e9e9e);
}

.icon--gear {
  color: var(--gear-icon-color, #757575);
}

.icon--exposure {
  color: var(--exposure-icon-color, #f44336);
}

.icon--device-unknown {
  color: var(--unknown-icon-color, #9e9e9e);
}

.icon--close,
.icon--expand,
.icon--collapse {
  color: var(--control-icon-color, #757575);
}

.icon--compact,
.icon--detailed,
.icon--fullscreen {
  color: var(--mode-icon-color, #757575);
}

.icon--connected {
  color: var(--connected-icon-color, #4caf50);
}

.icon--disconnected {
  color: var(--disconnected-icon-color, #f44336);
}
</style>
