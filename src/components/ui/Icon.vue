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
  | 'chevron-down' // IconChevronDown (Added)
  | 'chevron-up' // IconChevronUp (Added)
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
  | 'alert-triangle' // IconAlertTriangle (for warning/error)
  | 'temperature' // IconTemperature
  | 'shield' // IconShield
  | 'rotate-clockwise' // IconRotateClockwise
  | 'toggle-left' // IconToggleLeft
  | 'highlight' // IconHighlight
  | 'package' // IconPackage
  | 'trash' // IconTrash
  | 'alert-circle' // IconAlertCircle
  | 'info-circle' // IconInfoCircle
  | 'check' // IconCheck
  | 'layout-grid' // IconLayoutGrid
  | 'external-link' // IconExternalLink
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
      validator: (value: string): boolean => {
        return [
          'camera', 'building-observatory', 'telescope', 'sun', 'moon',
          'question-mark', 'search', 'focus-2', 'filter', 'cloud',
          'chevron-left', 'chevron-right', 'chevron-down', 'chevron-up', 'settings', 'exposure', 'x',
          'arrows-maximize', 'arrows-minimize', 'layout-sidebar-left-collapse',
          'layout-sidebar-left-expand', 'maximize', 'plug-connected', 'plug-x',
          'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
          'player-stop', 'target-arrow', 'target-off', 'home', 'files',
          'history', 'bell', 'refresh', 'sliders-horizontal', 'parking-circle',
          'player-play', 'alert-triangle',
          'temperature', 'shield', 'rotate-clockwise', 'toggle-left', 'highlight', 'package',
          'trash', 'alert-circle', 'info-circle', 'check', 'layout-grid', 'external-link',
          // Old names for compatibility, these will be mapped
          'device-unknown', 'gear', 'close', 'expand', 'collapse', 'compact',
          'detailed', 'fullscreen', 'disconnected', 'stop', 'tracking-on',
          'tracking-off', 'reset', 'park', 'unpark', 'sync'
        ].includes(value)
      },
      default: 'question-mark' // Default to a Tabler icon
    },
    size: {
      type: [String, Number], // Allow string or number for size
      default: 24 // Default to numeric 24 for pixels
    },
    color: {
      type: String,
      default: '' // currentColor will be used by Tabler if not specified
    },
    strokeWidth: { // Tabler specific prop
      type: [String, Number],
      default: 2 // Default to numeric 2
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
        IconToRender.value = TablerIcons.IconQuestionMark as Component;
      }
    });

    return () =>
      h('div', { // Wrapper div
        class: ['aw-icon', `aw-icon--${props.type}`],
        style: {
          width: `${props.size}px`,
          height: `${props.size}px`,
          display: 'inline-flex', // Ensure proper inline behavior and centering
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, [
        h(IconToRender.value, { // Tabler icon as a child
          size: props.size, // Pass size for Tabler's internal SVG attributes
          color: props.color || 'currentColor',
          strokeWidth: props.strokeWidth
        })
      ]);
  }
});
</script>

<style scoped>
/* Base styles for .aw-icon container */
/* The sizing and flex properties are now primarily handled by inline styles in the render function */
/* This class is kept for potential generic .aw-icon styling and for the type-specific color overrides below */
.aw-icon {
  /* display: inline-flex; align-items: center; justify-content: center; */
  /* width: var(--aw-icon-size, 24px); height: var(--aw-icon-size, 24px); */
  /* These can be uncommented if a CSS-driven default is preferred over inline styles, */
  /* but inline styles from props provide more direct control. */
}

/* Device-related icons */
.aw-icon--camera {
  color: var(--aw-device-camera-color, var(--aw-color-success-500));
}
.aw-icon--dome,
.aw-icon--building-observatory {
  color: var(--aw-device-dome-color, var(--aw-color-primary-500));
}
.aw-icon--telescope {
  color: var(--aw-device-telescope-color, var(--aw-color-primary-700));
}
.aw-icon--filter {
  color: var(--aw-device-filter-color, var(--aw-color-warning-700));
}
.aw-icon--focus,
.aw-icon--focus-2 {
  color: var(--aw-device-focus-color, var(--aw-color-primary-300));
}
.aw-icon--device-unknown,
.aw-icon--question-mark {
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

/* Navigation icons (Example - more might be needed) */
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

/* Control icons (Example - more might be needed) */
.aw-icon--gear,
.aw-icon--settings {
  color: var(--aw-control-gear-color, var(--aw-color-neutral-600));
}
.aw-icon--exposure {
  color: var(--aw-control-exposure-color, var(--aw-color-error-500));
}
.aw-icon--close,
.aw-icon--x {
  color: var(--aw-control-ui-color, var(--aw-color-neutral-600));
}

/* Status icons (Example - more might be needed) */
.aw-icon--connected,
.aw-icon--plug-connected {
  color: var(--aw-status-connected-color, var(--aw-color-success-500));
}
.aw-icon--disconnected,
.aw-icon--plug-x {
  color: var(--aw-status-disconnected-color, var(--aw-color-error-500));
}
.aw-icon--alert-triangle {
    color: var(--aw-status-warning-color, var(--aw-color-warning-500));
}
.aw-icon--info-circle {
    color: var(--aw-status-info-color, var(--aw-color-info-500));
}
.aw-icon--check {
    color: var(--aw-status-success-color, var(--aw-color-success-500));
}


/* Add more type-specific color rules here as needed, matching your IconType definitions */
/* and the --aw-color-* design tokens. */

</style>
