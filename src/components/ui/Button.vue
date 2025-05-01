// Status: Good - Core UI Component 
// This is the core button implementation that: 
// - Provides consistent button styling and behavior 
// - Supports multiple variants (primary, secondary, tertiary, danger, success, warning) 
// - Handles loading and disabled states 
// - Integrates with the icon system 
// - Implements proper accessibility features

<template>
  <button
    class="aw-button"
    :class="buttonClass"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <div v-if="loading" class="aw-button__loading-icon" />
    <app-icon v-else-if="icon" :type="icon" class="aw-button__icon" />
    <span v-if="$slots.default" class="aw-button__text">
      <slot></slot>
    </span>
  </button>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import type { PropType } from 'vue'
import AppIcon from './Icon.vue'
import type { IconType } from './Icon.vue'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning'
export type ButtonSize = 'small' | 'medium' | 'large'

export default defineComponent({
  name: 'AppButton',

  components: {
    AppIcon
  },

  props: {
    variant: {
      type: String as PropType<ButtonVariant>,
      default: 'primary',
      validator: (value: string) => 
        ['primary', 'secondary', 'tertiary', 'danger', 'success', 'warning'].includes(value)
    },
    size: {
      type: String as PropType<ButtonSize>,
      default: 'medium',
      validator: (value: string) => ['small', 'medium', 'large'].includes(value)
    },
    disabled: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    icon: {
      type: String as PropType<IconType>,
      default: undefined
    }
  },

  emits: ['click'],

  setup(props, { emit, slots }) {
    const buttonClass = computed(() => ({
      [`aw-button--${props.variant}`]: true,
      [`aw-button--${props.size}`]: true,
      'aw-button--icon-only': props.icon && !slots.default,
      'aw-button--loading': props.loading,
      'aw-button--disabled': props.disabled
    }))

    const handleClick = (event: MouseEvent) => {
      if (!props.disabled && !props.loading) {
        emit('click', event)
      }
    }

    return {
      buttonClass,
      handleClick
    }
  }
})
</script>

<style scoped>
/* Component-specific styles only - global button styles in /src/assets/components/buttons.css */
.aw-button__icon {
  margin-right: var(--aw-spacing-xs);
}

.aw-button__text {
  /* Any button text-specific styling */
}
</style>
