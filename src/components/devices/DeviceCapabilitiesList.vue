<template>
  <div class="device-capabilities">
    <h3 v-if="title" class="title">{{ title }}</h3>

    <!-- Capabilities section -->
    <div v-if="hasCapabilities" class="capabilities-section">
      <h4>Capabilities</h4>
      <ul class="capabilities-list">
        <li
          v-for="(value, key) in device.capabilities"
          :key="key.toString()"
          class="capability-item"
        >
          <span class="capability-name">{{ formatCapabilityName(key as string) }}:</span>
          <span class="capability-value" :class="{ supported: value, unsupported: !value }">
            {{ value ? 'Yes' : 'No' }}
          </span>
        </li>
      </ul>
    </div>

    <!-- Device attributes section (has* properties) -->
    <div v-if="hasAttributes" class="attributes-section">
      <h4>Device Attributes</h4>
      <ul class="attributes-list">
        <li
          v-for="(value, key) in device.deviceAttributes"
          :key="key.toString()"
          class="attribute-item"
        >
          <span class="attribute-name">{{ formatAttributeName(key as string) }}:</span>
          <span class="attribute-value">
            {{ formatAttributeValue(value) }}
          </span>
        </li>
      </ul>
    </div>

    <!-- Empty state -->
    <div v-if="!hasCapabilities && !hasAttributes" class="empty-state">
      <p>No capability information is available for this device.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Device } from '@/stores/types/deviceTypes'

const props = defineProps<{
  device: Device
  title?: string
}>()

// Check if device has capabilities
const hasCapabilities = computed(() => {
  return props.device.capabilities && Object.keys(props.device.capabilities).length > 0
})

// Check if device has attributes
const hasAttributes = computed(() => {
  return props.device.deviceAttributes && Object.keys(props.device.deviceAttributes).length > 0
})

// Format capability name for display
function formatCapabilityName(key: string): string {
  if (!key) return ''

  // Remove 'can' prefix
  let name = key.toLowerCase().startsWith('can') ? key.substring(3) : key

  // Convert camelCase to space-separated words
  name = name.replace(/([A-Z])/g, ' $1').toLowerCase()

  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// Format attribute name for display
function formatAttributeName(key: string): string {
  if (!key) return ''

  // Remove 'has' prefix
  let name = key.toLowerCase().startsWith('has') ? key.substring(3) : key

  // Convert camelCase to space-separated words
  name = name.replace(/([A-Z])/g, ' $1').toLowerCase()

  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// Format attribute value based on type
function formatAttributeValue(value: unknown): string {
  if (value === undefined || value === null) return 'Not available'

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    // For numbers with decimal places, format with 2 decimal places
    return Number.isInteger(value) ? value.toString() : value.toFixed(2)
  }

  return String(value)
}
</script>

<style scoped>
.device-capabilities {
  margin: 1rem 0;
  padding: 0.5rem;
  background-color: var(--color-background-soft);
  border-radius: 0.5rem;
}

.title {
  margin-top: 0;
  color: var(--color-heading);
  font-size: 1.2rem;
}

h4 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  color: var(--color-heading);
}

.capabilities-list,
.attributes-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.capability-item,
.attribute-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--color-border);
}

.capability-name,
.attribute-name {
  font-weight: 500;
}

.capability-value,
.attribute-value {
  font-family: var(--font-family-mono);
}

.supported {
  color: var(--color-success, green);
  font-weight: bold;
}

.unsupported {
  color: var(--color-text-muted, #666);
}

.empty-state {
  color: var(--color-text-muted, #666);
  font-style: italic;
  text-align: center;
  padding: 1rem;
}
</style>
