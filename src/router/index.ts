import { createRouter, createWebHistory } from 'vue-router'
import DevicesViewMigrated from '../views/DevicesViewMigrated.vue'
import DevicePageMigrated from '../views/DevicePageMigrated.vue'
import ImageAnalysisMigrated from '../views/ImageAnalysisMigrated.vue'
import SettingsViewMigrated from '../views/SettingsViewMigrated.vue'
import DiscoveryViewMigrated from '../views/DiscoveryViewMigrated.vue'
import UIDemoView from '../views/UIDemoView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: DevicesViewMigrated
    },
    {
      path: '/ui-demo',
      name: 'demo',
      component: UIDemoView
    },
    {
      path: '/devices',
      name: 'devices',
      component: DevicesViewMigrated
    },
    {
      path: '/devices/:id',
      name: 'device-detail',
      component: DevicePageMigrated
    },
    {
      path: '/discovery',
      name: 'discovery',
      component: DiscoveryViewMigrated
    },
    {
      path: '/img-analysis',
      name: 'image-analysis',
      component: ImageAnalysisMigrated
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsViewMigrated
    }
  ]
})

export default router
