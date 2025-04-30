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
          'history'
        ].includes(value)
      },
      default: 'device-unknown'
    },
    size: {
      type: String,
      default: '24'
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
        class: [`icon--${props.type}`],
        size: props.size,
        color: 'currentColor'
      })
  }
})
</script>

<template>
  <div class="icon" :class="`icon--${type}`"></div>
</template>

<style scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
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

.icon--tracking-on {
  color: var(--tracking-on-icon-color, #4caf50);
}

.icon--tracking-off {
  color: var(--tracking-off-icon-color, #f44336);
}

.icon--home {
  color: var(--home-icon-color, #2196f3);
}

.icon--files {
  color: var(--files-icon-color, #ff9800);
}

.icon--history {
  color: var(--history-icon-color, #9e9e9e);
}
</style>
