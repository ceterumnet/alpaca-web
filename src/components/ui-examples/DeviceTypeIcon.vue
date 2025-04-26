<script setup lang="ts">
import { Telescope, Camera, Filter, Focus } from './icons'

// Props
const props = defineProps({
  type: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value: string) => ['small', 'medium', 'large'].includes(value)
  }
})

// Compute the icon component based on device type
const getIconComponent = () => {
  const deviceType = props.type.toLowerCase()

  switch (deviceType) {
    case 'telescope':
      return Telescope
    case 'camera':
      return Camera
    case 'filterwheel':
      return Filter
    case 'focuser':
      return Focus
    default:
      return Telescope
  }
}
</script>

<template>
  <component :is="getIconComponent()" :class="['device-type-icon', `size-${size}`]" />
</template>

<style scoped>
.device-type-icon {
  display: inline-flex;
  color: inherit;
}

.size-small {
  width: 16px;
  height: 16px;
}

.size-medium {
  width: 24px;
  height: 24px;
}

.size-large {
  width: 32px;
  height: 32px;
}
</style>
