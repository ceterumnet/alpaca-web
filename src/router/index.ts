import { createRouter, createWebHistory } from 'vue-router'
import ImageAnalysis from '../views/ImageAnalysis.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
      path: '/',
      name: 'home',
      component: () => import('../views/PanelLayoutView.vue')
    },
    {
      path: '/panel-layout',
      redirect: '/'
    }
  ]
})

export default router
