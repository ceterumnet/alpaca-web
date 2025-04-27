<script lang="ts">
import { defineComponent, computed } from 'vue'
import Icon from '@/components/Icon.vue'
import type { IconType } from '@/components/Icon.vue'
import { useUIPreferencesStore } from '@/stores/useUIPreferencesStore'
import UnifiedStore from '@/stores/UnifiedStore'
import type { Device } from '@/stores/UnifiedStore'

export default defineComponent({
  name: 'AppSidebarMigrated',

  components: {
    Icon
  },

  setup() {
    // Direct usage of UnifiedStore without adapter
    const unifiedStore = new UnifiedStore()

    // UI Preferences store for sidebar visibility state
    const uiPreferencesStore = useUIPreferencesStore()

    // Group devices by their type/category
    const devicesByCategory = computed(() => {
      const categories: Record<string, Device[]> = {}

      unifiedStore.devices.forEach((device) => {
        if (!categories[device.type]) {
          categories[device.type] = []
        }
        categories[device.type].push(device)
      })

      return categories
    })

    // Get appropriate icon based on device type
    const getIconForDeviceType = (type: string): IconType => {
      const iconMap: Record<string, IconType> = {
        telescope: 'search',
        camera: 'camera',
        focuser: 'focus',
        filter_wheel: 'filter',
        dome: 'dome',
        weather: 'cloud',
        // Add more device types and their corresponding icons as needed
        default: 'device-unknown'
      }

      return iconMap[type] || iconMap.default
    }

    return {
      unifiedStore,
      devicesByCategory,
      getIconForDeviceType,
      isSidebarVisible: computed(() => uiPreferencesStore.isSidebarVisible),
      toggleSidebar: () => uiPreferencesStore.toggleSidebar()
    }
  }
})
</script>

<template>
  <div class="sidebar" :class="{ 'sidebar-collapsed': !isSidebarVisible }">
    <!-- Sidebar header -->
    <div class="sidebar-header">
      <h2 v-if="isSidebarVisible">Devices</h2>
      <button class="collapse-toggle" @click="toggleSidebar">
        <Icon :type="isSidebarVisible ? 'chevron-left' : 'chevron-right'" />
      </button>
    </div>

    <!-- Sidebar content (expanded view) -->
    <div v-if="isSidebarVisible" class="sidebar-content">
      <div v-for="(devices, category) in devicesByCategory" :key="category" class="device-category">
        <h3 class="category-title">{{ category }}</h3>
        <div
          v-for="device in devices"
          :key="device.id"
          class="device-item"
          :class="{ 'device-connected': device.isConnected }"
        >
          <div class="device-icon">
            <Icon :type="getIconForDeviceType(device.type)" />
          </div>
          <div class="device-info">
            <div class="device-name">{{ device.name }}</div>
            <div class="device-status">
              {{ device.isConnected ? 'Connected' : 'Disconnected' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Collapsed view -->
    <div v-else class="sidebar-collapsed-content">
      <div v-for="device in unifiedStore.devices" :key="device.id">
        <div
          class="collapsed-device-item"
          :class="{ 'device-connected': device.isConnected }"
          :title="device.name"
        >
          <Icon :type="getIconForDeviceType(device.type)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  height: 100%;
  width: 250px;
  background-color: var(--color-background-secondary);
  transition: width 0.3s ease;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.collapse-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.sidebar-content {
  padding: 16px;
}

.device-category {
  margin-bottom: 24px;
}

.category-title {
  font-size: 0.9rem;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.device-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
}

.device-item:hover {
  background-color: var(--color-background-hover);
}

.device-connected {
  border-left: 3px solid var(--color-primary);
}

.device-icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.device-info {
  flex: 1;
}

.device-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.device-status {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.sidebar-collapsed-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.collapsed-device-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-bottom: 12px;
  cursor: pointer;
}

.collapsed-device-item:hover {
  background-color: var(--color-background-hover);
}
</style>
