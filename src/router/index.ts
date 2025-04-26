import { createRouter, createWebHistory } from 'vue-router'
import DemoPage from '../components/ui-examples/DemoPage.vue'
import HomeView from '../components/Home.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/ui-demo',
      name: 'ui-demo',
      component: DemoPage
    },
    {
      path: '/devices',
      name: 'devices',
      component: () => import('../views/DevicesView.vue')
    },
    {
      path: '/devices/:id',
      name: 'device-detail',
      component: () => import('../views/DeviceDetailView.vue')
    },
    {
      path: '/discovery',
      name: 'discovery',
      component: () => import('../views/DiscoveryView.vue')
    }
  ]
})

export default router
