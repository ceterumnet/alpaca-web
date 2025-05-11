import { createRouter, createWebHistory } from 'vue-router'
import DevicesView from '../views/DevicesView.vue'
import ImageAnalysis from '../views/ImageAnalysis.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: DevicesView
    },
    {
      path: '/devices',
      name: 'devices',
      redirect: '/'
    },
    {
      path: '/img-analysis',
      name: 'image-analysis',
      component: ImageAnalysis
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    },
    {
      path: '/layout-builder',
      name: 'layout-builder',
      component: () => import('../views/LayoutBuilderView.vue')
    },
    {
      path: '/panel-layout',
      name: 'panel-layout',
      component: () => import('../views/PanelLayoutView.vue')
    },
    {
      path: '/ui-components',
      name: 'component-showcase',
      component: () => import('../views/ComponentShowcase.vue')
    }
  ]
})

export default router
