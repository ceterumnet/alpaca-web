import { createRouter, createWebHistory } from 'vue-router'
import SettingsView from '../views/SettingsView.vue'
import StyleGuideView from '../views/StyleGuideView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
    },
    {
      path: '/style-guide',
      name: 'style-guide',
      component: StyleGuideView
    }
  ]
})

export default router
