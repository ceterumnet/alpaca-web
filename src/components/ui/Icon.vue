// Status: Good - Core UI Component // This is the icon system implementation that: // - Provides a
unified interface for all app icons // - Supports custom sizing and colors // - Implements type-safe
icon selection // - Maintains consistent styling across the app // - Integrates with the design token system

<script lang="ts">
import { defineComponent, h } from 'vue'
import * as IconComponents from '@/components/icons'

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
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'stop'
  | 'tracking-on'
  | 'tracking-off'
  | 'home'
  | 'files'
  | 'history'
  | 'bell'
  | 'reset'

export default defineComponent({
  name: 'IconComponent',

  props: {
    type: {
      type: String as () => IconType,
      required: false,
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
          'disconnected',
          'arrow-up',
          'arrow-down',
          'arrow-left',
          'arrow-right',
          'stop',
          'tracking-on',
          'tracking-off',
          'home',
          'files',
          'history',
          'bell',
          'reset'
        ].includes(value)
      },
      default: 'device-unknown'
    },
    size: {
      type: String,
      default: '24'
    },
    color: {
      type: String,
      default: ''
    }
  },

  setup(props) {
    const getIconComponent = () => {
      // Convert kebab-case to PascalCase
      const pascalCaseName = props.type
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')

      // Special cases
      const iconMap: Record<string, string> = {
        DeviceUnknown: 'DeviceUnknown',
        ChevronLeft: 'ChevronLeft',
        ChevronRight: 'ChevronRight',
        ArrowUp: 'ArrowUp',
        ArrowDown: 'ArrowDown',
        ArrowLeft: 'ArrowLeft',
        ArrowRight: 'ArrowRight',
        TrackingOn: 'TrackingOn',
        TrackingOff: 'TrackingOff'
      }

      // Get the icon component
      const componentName = iconMap[pascalCaseName] || pascalCaseName
      return (
        IconComponents[componentName as keyof typeof IconComponents] || IconComponents.DeviceUnknown
      )
    }

    return () =>
      h(getIconComponent(), {
        class: [`aw-icon--${props.type}`],
        size: props.size,
        color: props.color || 'currentColor'
      })
  }
})
</script>

<template>
  <div class="aw-icon" :class="`aw-icon--${type}`"></div>
</template>

<style scoped>
.aw-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--aw-icon-size, 24px);
  height: var(--aw-icon-size, 24px);
}

/* Device-related icons */
.aw-icon--camera {
  color: var(--aw-device-camera-color, var(--aw-color-success-500));
}

.aw-icon--dome {
  color: var(--aw-device-dome-color, var(--aw-color-primary-500));
}

.aw-icon--telescope {
  color: var(--aw-device-telescope-color, var(--aw-color-primary-700));
}

.aw-icon--filter {
  color: var(--aw-device-filter-color, var(--aw-color-warning-700));
}

.aw-icon--focus {
  color: var(--aw-device-focus-color, var(--aw-color-primary-300));
}

.aw-icon--device-unknown {
  color: var(--aw-device-unknown-color, var(--aw-color-neutral-500));
}

/* Celestial icons */
.aw-icon--sun {
  color: var(--aw-celestial-sun-color, var(--aw-color-warning-500));
}

.aw-icon--moon {
  color: var(--aw-celestial-moon-color, var(--aw-color-neutral-400));
}

.aw-icon--cloud {
  color: var(--aw-celestial-cloud-color, var(--aw-color-primary-300));
}

/* Navigation icons */
.aw-icon--chevron-left,
.aw-icon--chevron-right,
.aw-icon--arrow-up,
.aw-icon--arrow-down,
.aw-icon--arrow-left,
.aw-icon--arrow-right {
  color: var(--aw-navigation-icon-color, var(--aw-color-neutral-600));
}

.aw-icon--home {
  color: var(--aw-navigation-home-color, var(--aw-color-primary-500));
}

.aw-icon--search {
  color: var(--aw-navigation-search-color, var(--aw-color-neutral-600));
}

.aw-icon--files {
  color: var(--aw-navigation-files-color, var(--aw-color-warning-500));
}

.aw-icon--history {
  color: var(--aw-navigation-history-color, var(--aw-color-neutral-500));
}

/* Control icons */
.aw-icon--gear {
  color: var(--aw-control-gear-color, var(--aw-color-neutral-600));
}

.aw-icon--exposure {
  color: var(--aw-control-exposure-color, var(--aw-color-error-500));
}

.aw-icon--close,
.aw-icon--expand,
.aw-icon--collapse {
  color: var(--aw-control-ui-color, var(--aw-color-neutral-600));
}

.aw-icon--compact,
.aw-icon--detailed,
.aw-icon--fullscreen {
  color: var(--aw-control-view-color, var(--aw-color-neutral-600));
}

.aw-icon--stop {
  color: var(--aw-control-stop-color, var(--aw-color-error-500));
}

/* Status icons */
.aw-icon--connected {
  color: var(--aw-status-connected-color, var(--aw-color-success-500));
}

.aw-icon--disconnected {
  color: var(--aw-status-disconnected-color, var(--aw-color-error-500));
}

.aw-icon--tracking-on {
  color: var(--aw-status-tracking-on-color, var(--aw-color-success-500));
}

.aw-icon--tracking-off {
  color: var(--aw-status-tracking-off-color, var(--aw-color-error-500));
}

/* Added notification icons */
.aw-icon--bell {
  color: var(--aw-notification-bell-color, var(--aw-color-warning-500));
}

.aw-icon--reset {
  color: var(--aw-control-reset-color, var(--aw-color-error-500));
}
</style>
