<script setup lang="ts">
// import '@primevue/themes'
import { computed, onMounted } from 'vue'
import { useUIPreferencesStore } from './stores/useUIPreferencesStore'
import './assets/colors.css' // Import the CSS
import NavigationBarMigrated from './components/NavigationBarMigrated.vue'
import NotificationCenterMigrated from './components/NotificationCenterMigrated.vue'

// Get stores
const uiStore = useUIPreferencesStore()

// Define theme styles based on dark mode
const themeStyles = computed(() => {
  if (uiStore.isDarkMode) {
    return {
      // Dark theme styling is applied via CSS class, no need to set inline styles
      'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  } else {
    return {
      // Light theme styling is applied via CSS class, no need to set inline styles
      'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  }
})

onMounted(() => {
  console.log('App mounted')

  // Check for stored preference
  const storedPref = localStorage.getItem('dark-theme-preference')
  if (storedPref !== null) {
    uiStore.isDarkMode = storedPref === 'true'
  }

  // Apply theme on initial load
  if (uiStore.isDarkMode) {
    document.documentElement.classList.add('dark-theme')
  } else {
    document.documentElement.classList.remove('dark-theme')
  }

  console.log('Initial dark mode:', uiStore.isDarkMode)
  console.log('Has dark-theme class:', document.documentElement.classList.contains('dark-theme'))
})
</script>

<template>
  <div class="app-container" :class="{ 'dark-theme': uiStore.isDarkMode }" :style="themeStyles">
    <!-- Main content area without sidebar -->
    <div class="app-content">
      <!-- Use the migrated navigation bar component -->
      <NavigationBarMigrated />

      <main class="main-content">
        <!-- Router view with transition -->
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <!-- Global notification center -->
      <NotificationCenterMigrated />
    </div>
  </div>
</template>

<style>
/* Global styles */
:root {
  --header-height: 60px;

  /* Font sizes */
  --font-size-xs: 0.75rem; /* 12px */
  --font-size-sm: 0.875rem; /* 14px */
  --font-size-base: 1rem; /* 16px */
  --font-size-lg: 1.125rem; /* 18px */
  --font-size-xl: 1.25rem; /* 20px */
  --font-size-2xl: 1.5rem; /* 24px */

  /* Font weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 600;
  --font-weight-extrabold: 700;

  /* Line heights */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Spacing */
  --spacing-xs: 0.25rem; /* 4px */
  --spacing-sm: 0.5rem; /* 8px */
  --spacing-md: 1rem; /* 16px */
  --spacing-lg: 1.5rem; /* 24px */
  --spacing-xl: 2rem; /* 32px */
}

body {
  margin: 0;
  padding: 0;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  background-color: var(--aw-bg-color);
  color: var(--aw-color);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

/* Typography classes */
h1,
h2,
h3,
h4,
h5,
h6 {
  margin-top: 0;
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--aw-text-color);
}

h1 {
  font-size: var(--font-size-2xl);
}

h2 {
  font-size: var(--font-size-xl);
}

h3 {
  font-size: var(--font-size-lg);
}

p {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
}

/* Add transition styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Base form elements */
input,
select,
textarea,
button {
  font-family: inherit;
  font-size: var(--font-size-base);
  color: var(--aw-text-color);
}

input,
select,
textarea {
  background-color: var(--aw-input-bg-color);
  border: 1px solid var(--aw-input-border-color);
  border-radius: 4px;
  padding: var(--spacing-xs) var(--spacing-sm);
  transition: border-color 0.2s ease;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--aw-primary-color);
}

/* Button styles */
button {
  cursor: pointer;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: 4px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  font-weight: var(--font-weight-medium);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: 4px;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-primary {
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border: 1px solid transparent;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--aw-button-primary-hover-bg);
}

.btn-secondary {
  background-color: var(--aw-button-secondary-bg);
  color: var(--aw-button-secondary-text);
  border: 1px solid transparent;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--aw-button-secondary-hover-bg);
}

.btn-success {
  background-color: var(--aw-button-success-bg);
  color: var(--aw-button-success-text);
  border: 1px solid transparent;
}

.btn-success:hover:not(:disabled) {
  background-color: var(--aw-button-success-hover-bg);
}

.btn-warning {
  background-color: var(--aw-button-warning-bg);
  color: var(--aw-button-warning-text);
  border: 1px solid transparent;
}

.btn-warning:hover:not(:disabled) {
  background-color: var(--aw-button-warning-hover-bg);
}

.btn-danger {
  background-color: var(--aw-button-danger-bg);
  color: var(--aw-button-danger-text);
  border: 1px solid transparent;
}

.btn-danger:hover:not(:disabled) {
  background-color: var(--aw-button-danger-hover-bg);
}

.btn:disabled,
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Fix for scrollbars */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--aw-panel-scrollbar-color-1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--aw-panel-scrollbar-color-2);
}
</style>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--aw-bg-color);
  color: var(--aw-color);
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background-color: var(--aw-panels-bg-color);
}
</style>
