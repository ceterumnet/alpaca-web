// Status: Good - Core UI Component // This is the icon system implementation that: // - Provides a
unified interface for all app icons // - Supports custom sizing and colors // - Implements type-safe
icon selection // - Maintains consistent styling across the app // - Integrates with the design token system

<script lang="ts">
import { defineComponent, h, shallowRef, watchEffect, type Component } from 'vue'
// Import all icon components from Tabler Icons
import * as TablerIcons from '@tabler/icons-vue'

// Updated IconType to reflect a selection of Tabler icon names (props will still be kebab-case)
export type IconType =
  | 'camera' // IconCamera
  | 'building-observatory' // IconBuildingObservatory (for dome)
  | 'telescope' // IconTelescope
  | 'sun' // IconSun
  | 'moon' // IconMoon
  | 'question-mark' // IconQuestionMark (for device-unknown)
  | 'search' // IconSearch
  | 'focus-2' // IconFocus2 (for focus)
  | 'filter' // IconFilter
  | 'cloud' // IconCloud
  | 'chevron-left' // IconChevronLeft
  | 'chevron-right' // IconChevronRight
  | 'settings' // IconSettings (for gear)
  | 'exposure' // IconExposure
  | 'x' // IconX (for close)
  | 'arrows-maximize' // IconArrowsMaximize (for expand)
  | 'arrows-minimize' // IconArrowsMinimize (for collapse)
  | 'layout-sidebar-left-collapse' // IconLayoutSidebarLeftCollapse (for compact view)
  | 'layout-sidebar-left-expand' // IconLayoutSidebarLeftExpand (for detailed view)
  | 'maximize' // IconMaximize (for fullscreen)
  | 'plug-connected' // IconPlugConnected (for connected)
  | 'plug-x' // IconPlugX (for disconnected)
  | 'arrow-up' // IconArrowUp
  | 'arrow-down' // IconArrowDown
  | 'arrow-left' // IconArrowLeft
  | 'arrow-right' // IconArrowRight
  | 'player-stop' // IconPlayerStop (for stop)
  | 'target-arrow' // IconTargetArrow (for tracking-on)
  | 'target-off' // IconTargetOff (for tracking-off)
  | 'home' // IconHome
  | 'files' // IconFiles
  | 'history' // IconHistory
  | 'bell' // IconBell
  | 'refresh' // IconRefresh (for reset & sync)
  | 'sliders-horizontal' // IconSlidersHorizontal (for sliders)
  | 'parking-circle' // IconParkingCircle (for park)
  | 'player-play' // IconPlayerPlay (for unpark - conceptually opposite of park/stop)
  // Keep old names for CSS compatibility, but map them in setup or use new names in templates
  // Retaining old names for simpler CSS class matching for now.
  // The mapping to Tabler components will handle the new names.
  | 'device-unknown' // Will map to IconQuestionMark or similar
  | 'gear' // Will map to IconSettings
  | 'close' // Will map to IconX
  | 'expand' // Will map to IconArrowsMaximize
  | 'collapse' // Will map to IconArrowsMinimize
  | 'compact' // Will map to IconLayoutSidebarLeftCollapse
  | 'detailed'// Will map to IconLayoutSidebarLeftExpand
  | 'fullscreen' // Will map to IconMaximize
  | 'disconnected' // Will map to IconPlugX
  | 'stop' // Will map to IconPlayerStop
  | 'tracking-on' // Will map to IconTargetArrow
  | 'tracking-off' // Will map to IconTargetOff
  | 'reset' // Will map to IconRefresh
  | 'park' // Will map to IconParkingCircle
  | 'unpark' // Will map to IconPlayerPlay
  | 'sync'; // Will map to IconRefresh

export default defineComponent({
  name: 'IconComponent',

  props: {
    type: {
      type: String as () => IconType,
      required: false,
      // Validator can be simplified or rely on TypeScript and default,
      // but keeping it for now ensures only planned icons are used.
      // This list should ideally be generated or kept in sync with IconType
      validator: (value: string): boolean => {
        return [
          'camera', 'building-observatory', 'telescope', 'sun', 'moon',
          'question-mark', 'search', 'focus-2', 'filter', 'cloud',
          'chevron-left', 'chevron-right', 'settings', 'exposure', 'x',
          'arrows-maximize', 'arrows-minimize', 'layout-sidebar-left-collapse',
          'layout-sidebar-left-expand', 'maximize', 'plug-connected', 'plug-x',
          'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
          'player-stop', 'target-arrow', 'target-off', 'home', 'files',
          'history', 'bell', 'refresh', 'sliders-horizontal', 'parking-circle',
          'player-play',
          // Old names for compatibility, these will be mapped
          'device-unknown', 'gear', 'close', 'expand', 'collapse', 'compact',
          'detailed', 'fullscreen', 'disconnected', 'stop', 'tracking-on',
          'tracking-off', 'reset', 'park', 'unpark', 'sync'
        ].includes(value)
      },
      default: 'question-mark' // Default to a Tabler icon
    },
    size: {
      type: String, // Tabler icons accept size as number or string
      default: '24'
    },
    color: {
      type: String,
      default: '' // currentColor will be used by Tabler if not specified
    },
    strokeWidth: { // Tabler specific prop
      type: [String, Number],
      default: '2'
    }
  },

  setup(props) {
    const IconToRender = shallowRef<Component>(TablerIcons.IconQuestionMark as Component);

    watchEffect(() => {
      const typeMap: Record<string, string> = {
        'device-unknown': 'question-mark',
        'dome': 'building-observatory',
        'focus': 'focus-2',
        'gear': 'settings',
        'close': 'x',
        'expand': 'arrows-maximize',
        'collapse': 'arrows-minimize',
        'compact': 'layout-sidebar-left-collapse',
        'detailed': 'layout-sidebar-left-expand',
        'fullscreen': 'maximize',
        'disconnected': 'plug-x',
        'stop': 'player-stop',
        'tracking-on': 'target-arrow',
        'tracking-off': 'target-off',
        'reset': 'refresh',
        'sliders': 'sliders-horizontal',
        'park': 'parking-circle',
        'unpark': 'player-play',
        'sync': 'refresh'
      };

      const currentPropType = props.type || 'question-mark';
      const iconName = typeMap[currentPropType] || currentPropType;

      const pascalCaseName = ('Icon' + iconName
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')) as keyof typeof TablerIcons;

      const ResolvedIcon = TablerIcons[pascalCaseName];
      
      if (ResolvedIcon && (typeof ResolvedIcon === 'function' || typeof ResolvedIcon === 'object')) {
        IconToRender.value = ResolvedIcon as Component;
      } else {
        // console.warn(`Tabler Icon not found for type: ${props.type} (mapped to ${iconName}, resolved to ${pascalCaseName}). Falling back to IconQuestionMark.`);
        IconToRender.value = TablerIcons.IconQuestionMark as Component;
      }
    });

    return () =>
      h(IconToRender.value, {
        // The class `aw-icon--${props.type}` is crucial for existing scoped CSS color overrides.
        // We use the original props.type here to ensure CSS matching.
        class: [`aw-icon--${props.type}`],
        size: props.size, // Pass size to Tabler icon
        color: props.color || 'currentColor', // Pass color, Tabler uses currentColor if empty
        strokeWidth: props.strokeWidth // Pass strokeWidth
      })
  }
})
</script>

<template>
  <div class="aw-icon" :class="`aw-icon--${type}`"></div>
</template>

<style scoped>
/* Base styles for .aw-icon container - can remain as is if they don't conflict */
.aw-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* The width/height here might be overridden by Tabler's default or the size prop.
     If direct control over the container is needed, adjust.
     Tabler icons usually manage their own size via SVG attributes. */
  width: var(--aw-icon-size, 24px);
  height: var(--aw-icon-size, 24px);
}

/*
  The specific color overrides below using .aw-icon--[type] should still work
  as long as the Tabler SVG components use `stroke="currentColor"` or `fill="currentColor"`,
  which is typical for icon libraries designed for CSS customization.
  The `color` prop passed to the Tabler component will be `currentColor` by default if not set,
  or the specific color from these CSS rules if they apply due to the parent .aw-icon class.
*/

/* Device-related icons */
.aw-icon--camera { /* Mapped to IconCamera */
  color: var(--aw-device-camera-color, var(--aw-color-success-500));
}

.aw-icon--dome, /* Mapped to IconBuildingObservatory */
.aw-icon--building-observatory {
  color: var(--aw-device-dome-color, var(--aw-color-primary-500));
}

.aw-icon--telescope { /* Mapped to IconTelescope */
  color: var(--aw-device-telescope-color, var(--aw-color-primary-700));
}

.aw-icon--filter { /* Mapped to IconFilter */
  color: var(--aw-device-filter-color, var(--aw-color-warning-700));
}

.aw-icon--focus, /* Mapped to IconFocus2 */
.aw-icon--focus-2 {
  color: var(--aw-device-focus-color, var(--aw-color-primary-300));
}

.aw-icon--device-unknown, /* Mapped to IconQuestionMark */
.aw-icon--question-mark {
  color: var(--aw-device-unknown-color, var(--aw-color-neutral-500));
}

/* Celestial icons */
.aw-icon--sun { /* Mapped to IconSun */
  color: var(--aw-celestial-sun-color, var(--aw-color-warning-500));
}

.aw-icon--moon { /* Mapped to IconMoon */
  color: var(--aw-celestial-moon-color, var(--aw-color-neutral-400));
}

.aw-icon--cloud { /* Mapped to IconCloud */
  color: var(--aw-celestial-cloud-color, var(--aw-color-primary-300));
}

/* Navigation icons */
.aw-icon--chevron-left, /* Mapped to IconChevronLeft */
.aw-icon--chevron-right, /* Mapped to IconChevronRight */
.aw-icon--arrow-up, /* Mapped to IconArrowUp */
.aw-icon--arrow-down, /* Mapped to IconArrowDown */
.aw-icon--arrow-left, /* Mapped to IconArrowLeft */
.aw-icon--arrow-right { /* Mapped to IconArrowRight */
  color: var(--aw-navigation-icon-color, var(--aw-color-neutral-600));
}

.aw-icon--home { /* Mapped to IconHome */
  color: var(--aw-navigation-home-color, var(--aw-color-primary-500));
}

.aw-icon--search { /* Mapped to IconSearch */
  color: var(--aw-navigation-search-color, var(--aw-color-neutral-600));
}

.aw-icon--files { /* Mapped to IconFiles */
  color: var(--aw-navigation-files-color, var(--aw-color-warning-500));
}

.aw-icon--history { /* Mapped to IconHistory */
  color: var(--aw-navigation-history-color, var(--aw-color-neutral-500));
}

/* Control icons */
.aw-icon--gear, /* Mapped to IconSettings */
.aw-icon--settings {
  color: var(--aw-control-gear-color, var(--aw-color-neutral-600));
}

.aw-icon--exposure { /* Mapped to IconExposure */
  color: var(--aw-control-exposure-color, var(--aw-color-error-500));
}

.aw-icon--close, /* Mapped to IconX */
.aw-icon--x,
.aw-icon--expand, /* Mapped to IconArrowsMaximize */
.aw-icon--arrows-maximize,
.aw-icon--collapse, /* Mapped to IconArrowsMinimize */
.aw-icon--arrows-minimize {
  color: var(--aw-control-ui-color, var(--aw-color-neutral-600));
}

.aw-icon--compact, /* Mapped to IconLayoutSidebarLeftCollapse */
.aw-icon--layout-sidebar-left-collapse,
.aw-icon--detailed, /* Mapped to IconLayoutSidebarLeftExpand */
.aw-icon--layout-sidebar-left-expand,
.aw-icon--fullscreen, /* Mapped to IconMaximize */
.aw-icon--maximize {
  color: var(--aw-control-view-color, var(--aw-color-neutral-600));
}

.aw-icon--stop, /* Mapped to IconPlayerStop */
.aw-icon--player-stop {
  color: var(--aw-control-stop-color, var(--aw-color-error-500));
}

/* Status icons */
.aw-icon--connected, /* Mapped to IconPlugConnected */
.aw-icon--plug-connected {
  color: var(--aw-status-connected-color, var(--aw-color-success-500));
}

.aw-icon--disconnected, /* Mapped to IconPlugX */
.aw-icon--plug-x {
  color: var(--aw-status-disconnected-color, var(--aw-color-error-500));
}

.aw-icon--tracking-on, /* Mapped to IconTargetArrow */
.aw-icon--target-arrow {
  color: var(--aw-status-tracking-on-color, var(--aw-color-success-500));
}

.aw-icon--tracking-off, /* Mapped to IconTargetOff */
.aw-icon--target-off {
  color: var(--aw-status-tracking-off-color, var(--aw-color-error-500));
}

/* Added notification icons and other controls */
.aw-icon--bell { /* Mapped to IconBell */
  color: var(--aw-notification-bell-color, var(--aw-color-warning-500));
}

.aw-icon--reset, /* Mapped to IconRefresh */
.aw-icon--refresh, /* Also for sync */
.aw-icon--sync {
  color: var(--aw-control-reset-color, var(--aw-color-error-500));
}

.aw-icon--sliders, /* Mapped to IconSlidersHorizontal */
.aw-icon--sliders-horizontal {
  color: var(--aw-control-sliders-color, var(--aw-color-neutral-600)); /* Added a new var here, can be same as gear or different */
}

.aw-icon--park, /* Mapped to IconParkingCircle */
.aw-icon--parking-circle {
  color: var(--aw-control-park-color, var(--aw-color-neutral-700)); /* Added new var */
}

.aw-icon--unpark, /* Mapped to IconPlayerPlay */
.aw-icon--player-play {
  color: var(--aw-control-unpark-color, var(--aw-color-success-600)); /* Added new var */
}
</style>
