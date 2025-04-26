<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MainPanels from './MainPanels.vue'

defineOptions({
  name: 'HomeView'
})

const router = useRouter()

const features = ref([
  {
    title: 'Device Management',
    description: 'Connect to and control your astronomical devices with our enhanced UI.',
    icon: '📡',
    route: '/devices'
  },
  {
    title: 'Device Discovery',
    description: 'Automatically discover and connect to Alpaca devices on your network.',
    icon: '🔍',
    route: '/discovery'
  },
  {
    title: 'UI Components',
    description: 'Explore our UI component library with the AlpacaWeb UI Demo.',
    icon: '🎨',
    route: '/ui-demo'
  }
])

const navigateTo = (route: string) => {
  router.push(route)
}
</script>

<template>
  <div class="home-view">
    <div class="welcome-section">
      <h1>Welcome to AlpacaWeb</h1>
      <p class="welcome-description">
        A modern web interface for controlling your astronomical devices using the Alpaca protocol.
      </p>
    </div>

    <div class="features-grid">
      <div
        v-for="feature in features"
        :key="feature.title"
        class="feature-card"
        @click="navigateTo(feature.route)"
      >
        <div class="feature-icon">{{ feature.icon }}</div>
        <h2>{{ feature.title }}</h2>
        <p>{{ feature.description }}</p>
        <div class="feature-action">Explore →</div>
      </div>
    </div>

    <div class="panels-section">
      <h2>Device Control Panels</h2>
      <div class="panels-container">
        <MainPanels />
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  padding: 20px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  gap: 40px;
}

.welcome-section {
  text-align: center;
  margin-bottom: 20px;
}

.welcome-section h1 {
  font-size: 2.2rem;
  color: var(--aw-panel-content-color);
  margin-bottom: 16px;
}

.welcome-description {
  font-size: 1.2rem;
  color: var(--aw-panel-content-color);
  max-width: 700px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.feature-card {
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 8px;
  padding: 24px;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  border-color: var(--aw-panel-resize-bg-color);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 16px;
}

.feature-card h2 {
  font-size: 1.4rem;
  color: var(--aw-panel-content-color);
  margin-top: 0;
  margin-bottom: 12px;
}

.feature-card p {
  color: var(--aw-panel-content-color);
  opacity: 0.9;
  line-height: 1.5;
  margin-bottom: 16px;
}

.feature-action {
  color: var(--aw-panel-resize-bg-color);
  font-weight: 600;
  display: inline-block;
  transition: transform 0.2s;
}

.feature-card:hover .feature-action {
  transform: translateX(4px);
}

.panels-section {
  width: 100%;
}

.panels-section h2 {
  font-size: 1.6rem;
  color: var(--aw-panel-content-color);
  margin-bottom: 20px;
}

.panels-container {
  height: 500px; /* Adjust height as needed */
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--aw-panel-bg-color);
}
</style>
