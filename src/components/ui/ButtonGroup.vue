<template>
  <div class="button-group" :class="groupClass">
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
      [`button-group--${props.size}`]: true,
      'button-group--vertical': props.vertical
    }))

    return {
      groupClass
    }
  }
})
</script>

<style scoped>
.button-group {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
}

.button-group--vertical {
  flex-direction: column;
}

.button-group :deep(.app-button) {
  border-radius: 0;
  margin: 0;
}

.button-group--vertical :deep(.app-button:not(:last-child)) {
  border-bottom: 1px solid var(--color-border);
}

.button-group:not(.button-group--vertical) :deep(.app-button:not(:last-child)) {
  border-right: 1px solid var(--color-border);
}
</style>
