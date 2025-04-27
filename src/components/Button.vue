<template>
  <button
    class="app-button"
    :class="buttonClass"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <div v-if="loading" class="app-button__loading-icon" />
    <app-icon v-else-if="icon" :type="icon" class="app-button__icon" />
    <span v-if="$slots.default" class="app-button__text">
      <slot></slot>
    </span>
  </button>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import type { PropType } from 'vue'
import AppIcon from './Icon.vue'
import type { IconType } from './Icon.vue'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'
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
      validator: (value: string) => ['primary', 'secondary', 'tertiary', 'danger'].includes(value)
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
      [`app-button--${props.variant}`]: true,
      [`app-button--${props.size}`]: true,
      'app-button--icon-only': props.icon && !slots.default,
      'app-button--loading': props.loading,
      'app-button--disabled': props.disabled
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
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  border: 1px solid transparent;
}

.app-button--small {
  padding: 4px 12px;
  font-size: 0.875rem;
}

.app-button--large {
  padding: 12px 24px;
  font-size: 1.125rem;
}

.app-button--primary {
  background-color: var(--color-primary);
  color: white;
}

.app-button--primary:hover:not(.app-button--disabled) {
  background-color: var(--color-primary-dark);
}

.app-button--secondary {
  background-color: var(--color-background);
  border-color: var(--color-border);
  color: var(--color-text);
}

.app-button--secondary:hover:not(.app-button--disabled) {
  background-color: var(--color-background-hover);
}

.app-button--tertiary {
  background-color: transparent;
  color: var(--color-primary);
}

.app-button--tertiary:hover:not(.app-button--disabled) {
  background-color: var(--color-background-hover);
}

.app-button--danger {
  background-color: var(--color-danger);
  color: white;
}

.app-button--danger:hover:not(.app-button--disabled) {
  background-color: var(--color-danger-dark);
}

.app-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.app-button__icon {
  margin-right: 8px;
}

.app-button--icon-only {
  padding: 8px;
}

.app-button--icon-only.app-button--small {
  padding: 4px;
}

.app-button--icon-only.app-button--large {
  padding: 12px;
}

.app-button__loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
