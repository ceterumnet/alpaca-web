<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useSidebarStore } from '../stores/SidebarStore'
import type { Theme } from '../stores/SidebarStore'
import IconComponent from './Icon.vue'
import type { IconType } from './Icon.vue'

export default defineComponent({
  name: 'AppSidebar',

  components: {
    Icon: IconComponent
  },

  setup() {
    const store = useSidebarStore()

    const isVisible = computed(() => store.isSidebarVisible)
    const devices = computed(() => store.devices)
    const selectedDeviceId = computed(() => store.selectedDeviceId)
    const currentTheme = computed(() => store.theme)

    const themeIcon = computed(() =>
      currentTheme.value === 'light' ? ('moon' as IconType) : ('sun' as IconType)
    )

    const themeLabel = computed(() => (currentTheme.value === 'light' ? 'Dark Mode' : 'Light Mode'))

    const getDeviceIconType = (deviceType: string): IconType => {
      if (deviceType === 'camera' || deviceType === 'dome') {
        return deviceType as IconType
      }
      return 'device-unknown' as IconType
    }

    const toggleSidebar = () => store.toggleSidebar()

    const selectDevice = (deviceId: string) => {
      store.selectDevice(deviceId)
    }

    const toggleTheme = () => {
      const newTheme: Theme = currentTheme.value === 'light' ? 'dark' : 'light'
      store.setTheme(newTheme)
    }

    return {
      isVisible,
      devices,
      selectedDeviceId,
      themeIcon,
      themeLabel,
      getDeviceIconType,
      toggleSidebar,
      selectDevice,
      toggleTheme
    }
  }
})
</script>

<template>
  <div class="app-sidebar" :class="{ 'app-sidebar--collapsed': !isVisible }">
    <div class="app-sidebar__header">
      <h2 class="app-sidebar__title">Alpaca</h2>
      <button class="app-sidebar__toggle" @click="toggleSidebar">
        {{ isVisible ? '«' : '»' }}
      </button>
    </div>

    <div v-if="isVisible" class="app-sidebar__content">
      <div class="app-sidebar__section">
        <h3 class="app-sidebar__section-title">Devices</h3>
        <ul class="app-sidebar__device-list">
          <li
            v-for="device in devices"
            :key="device.id"
            class="app-sidebar__device-item"
            :class="{ 'app-sidebar__device-item--active': device.id === selectedDeviceId }"
            @click="selectDevice(device.id)"
          >
            <Icon :type="getDeviceIconType(device.type)" />
            <span>{{ device.name }}</span>
            <span
              class="app-sidebar__connection-status"
              :class="{ 'app-sidebar__connection-status--connected': device.connected }"
            >
              {{ device.connected ? 'Connected' : 'Disconnected' }}
            </span>
          </li>
        </ul>
      </div>

      <div class="app-sidebar__section">
        <h3 class="app-sidebar__section-title">Settings</h3>
        <ul class="app-sidebar__settings-list">
          <li class="app-sidebar__setting-item" @click="toggleTheme">
            <Icon :type="themeIcon" />
            <span>{{ themeLabel }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-sidebar {
  width: 300px;
  height: 100%;
  background-color: var(--sidebar-bg);
  color: var(--sidebar-text);
  border-right: 1px solid var(--border-color);
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
}

.app-sidebar--collapsed {
  width: 50px;
}

.app-sidebar__header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.app-sidebar__title {
  margin: 0;
  font-size: 1.2rem;
}

.app-sidebar__toggle {
  background: none;
  border: none;
  color: var(--sidebar-text);
  cursor: pointer;
  font-size: 1.2rem;
}

.app-sidebar__content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.app-sidebar__section {
  margin-bottom: 24px;
}

.app-sidebar__section-title {
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 12px;
  color: var(--sidebar-title);
}

.app-sidebar__device-list,
.app-sidebar__settings-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.app-sidebar__device-item,
.app-sidebar__setting-item {
  padding: 10px 12px;
  border-radius: 4px;
  margin-bottom: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-sidebar__device-item:hover,
.app-sidebar__setting-item:hover {
  background-color: var(--hover-color);
}

.app-sidebar__device-item--active {
  background-color: var(--active-item-bg);
  color: var(--active-item-text);
}

.app-sidebar__connection-status {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--disconnected-color);
}

.app-sidebar__connection-status--connected {
  color: var(--connected-color);
}
</style>
