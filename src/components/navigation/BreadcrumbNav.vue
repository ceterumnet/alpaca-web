// Status: Updated - Core Navigation Component // This is the breadcrumb navigation implementation
that: // - Shows current location in application hierarchy // - Displays device context and panel
state // - Provides clear navigation path // - Supports responsive design // - Integrates with the
new navigation system

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { useEnhancedDiscoveryStore } from '@/stores/useEnhancedDiscoveryStore'
import Icon from '@/components/ui/Icon.vue'
import type { IconType } from '@/components/ui/Icon.vue'

defineOptions({
  name: 'BreadcrumbNav'
})

// Get router and stores
const route = useRoute()
const router = useRouter()
const unifiedStore = useUnifiedStore()
const discoveryStore = useEnhancedDiscoveryStore()

// Compute breadcrumb items based on route
const breadcrumbItems = computed(() => {
  const items = []

  // Add home as first item
  items.push({
    label: 'Home',
    path: '/',
    icon: 'home' as IconType
  })

  // Add device context if present
  if (route.params.deviceId) {
    const device = unifiedStore.getDeviceById(route.params.deviceId as string)
    if (device) {
      items.push({
        label: device.name,
        path: `/devices/${device.id}`,
        icon: device.type.toLowerCase() as unknown as IconType
      })
    }
  }

  // Add panel context if present
  if (route.params.panelId) {
    items.push({
      label: route.params.panelId,
      path: route.path,
      icon: 'files' as IconType
    })
  }

  return items
})

// Determine if we should show discovery actions based on context
const showDiscoveryAction = computed(() => {
  // Show discovery action on device pages or when there are no connected devices
  return route.path.includes('/devices') || unifiedStore.connectedDevices.length === 0
})

// Handle navigation
const navigateTo = (path: string) => {
  router.push(path)
}

// Trigger device discovery
const triggerDiscovery = async () => {
  try {
    await discoveryStore.discoverDevices()
    router.push('/discovery')
  } catch (error) {
    console.error('Discovery failed:', error)
  }
}
</script>

<template>
  <nav class="aw-breadcrumb" aria-label="Breadcrumb">
    <ol class="aw-breadcrumb__list">
      <li
        v-for="(item, index) in breadcrumbItems"
        :key="item.path"
        class="aw-breadcrumb__item"
        :class="{ 'aw-breadcrumb__item--active': index === breadcrumbItems.length - 1 }"
      >
        <button
          v-if="index < breadcrumbItems.length - 1"
          class="aw-breadcrumb__link"
          @click="navigateTo(item.path)"
        >
          <Icon :type="item.icon" class="aw-breadcrumb__icon" />
          <span class="aw-breadcrumb__label">{{ item.label }}</span>
        </button>
        <span v-else class="aw-breadcrumb__current">
          <Icon :type="item.icon" class="aw-breadcrumb__icon" />
          <span class="aw-breadcrumb__label">{{ item.label }}</span>
        </span>
        <Icon
          v-if="index < breadcrumbItems.length - 1"
          type="chevron-right"
          class="aw-breadcrumb__separator"
        />
      </li>
    </ol>

    <!-- Contextual discovery action -->
    <div v-if="showDiscoveryAction" class="aw-breadcrumb__actions">
      <button
        class="aw-breadcrumb__discovery-action"
        :title="
          discoveryStore.availableDevices.length > 0
            ? `${discoveryStore.availableDevices.length} devices available`
            : 'Find devices'
        "
        @click="triggerDiscovery"
      >
        <Icon type="search" class="aw-breadcrumb__action-icon" />
        <span class="aw-breadcrumb__action-label">Find Devices</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.aw-breadcrumb {
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  background-color: var(--aw-panel-bg-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.aw-breadcrumb__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--aw-spacing-xs);
}

.aw-breadcrumb__item {
  display: flex;
  align-items: center;
  font-size: var(--aw-font-size-sm, 0.875rem);
}

.aw-breadcrumb__link {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  color: var(--aw-panel-content-color);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.aw-breadcrumb__link:hover {
  background-color: var(--aw-panel-hover-bg-color);
}

.aw-breadcrumb__link:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 1px;
}

.aw-breadcrumb__current {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  color: var(--aw-panel-content-secondary-color);
}

.aw-breadcrumb__icon {
  width: 16px;
  height: 16px;
  opacity: 0.8;
}

.aw-breadcrumb__label {
  font-weight: 500;
}

.aw-breadcrumb__separator {
  width: 12px;
  height: 12px;
  opacity: 0.5;
  margin: 0 var(--aw-spacing-xs);
}

.aw-breadcrumb__actions {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.aw-breadcrumb__discovery-action {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  color: var(--aw-link-color);
  background-color: var(--aw-panel-hover-bg-color);
  border: none;
  font-size: var(--aw-font-size-xs, 0.75rem);
  cursor: pointer;
  transition: all 0.2s ease;
}

.aw-breadcrumb__discovery-action:hover {
  background-color: var(--aw-panel-button-hover-bg);
  transform: translateY(-1px);
}

.aw-breadcrumb__discovery-action:focus {
  outline: 2px solid var(--aw-color-primary-300);
  outline-offset: 1px;
}

.aw-breadcrumb__action-icon {
  width: 14px;
  height: 14px;
  opacity: 0.8;
}

.aw-breadcrumb__action-label {
  font-weight: 500;
}

/* Responsive styles */
@media (max-width: 768px) {
  .aw-breadcrumb {
    padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  }

  .aw-breadcrumb__label {
    display: none;
  }

  .aw-breadcrumb__link,
  .aw-breadcrumb__current {
    padding: var(--aw-spacing-xs);
  }

  .aw-breadcrumb__action-label {
    display: none;
  }

  .aw-breadcrumb__discovery-action {
    padding: var(--aw-spacing-xs);
  }
}
</style>
