// Status: Good - Core UI Component // This is the button group implementation that: // - Provides
consistent button grouping // - Supports vertical and horizontal layouts // - Handles proper spacing
and borders // - Maintains consistent styling with Button component // - Supports different size
variants

<template>
  <div class="aw-button-group" :class="groupClass">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'ButtonGroup',

  props: {
    size: {
      type: String,
      default: 'medium',
      validator: (value: string) => ['small', 'medium', 'large'].includes(value)
    },
    vertical: {
      type: Boolean,
      default: false
    }
  },

  setup(props) {
    const groupClass = computed(() => ({
      [`aw-button-group--${props.size}`]: true,
      'aw-button-group--vertical': props.vertical
    }))

    return {
      groupClass
    }
  }
})
</script>

<style scoped>
.aw-button-group {
  display: inline-flex;
  border-radius: var(--aw-border-radius-sm);
  overflow: hidden;
}

.aw-button-group--vertical {
  flex-direction: column;
}

/* Target the buttons inside the group */
.aw-button-group :deep(.aw-button) {
  border-radius: 0;
  margin: 0;
}

/* Add dividers between buttons */
.aw-button-group--vertical :deep(.aw-button:not(:last-child)) {
  border-bottom: 1px solid var(--aw-input-border-color);
}

.aw-button-group:not(.aw-button-group--vertical) :deep(.aw-button:not(:last-child)) {
  border-right: 1px solid var(--aw-input-border-color);
}

/* Size variants */
.aw-button-group--small :deep(.aw-button) {
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  font-size: 0.85rem;
}

.aw-button-group--large :deep(.aw-button) {
  padding: var(--aw-spacing-sm) var(--aw-spacing-lg);
  font-size: 1.1rem;
}
</style>
