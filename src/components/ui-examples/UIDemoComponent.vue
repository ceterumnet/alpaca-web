<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SidebarExample from './SidebarExample.vue'
import DiscoveryExample from './DiscoveryExample.vue'

// UI state
const activeComponent = ref('discovery')
const isDarkMode = ref(false)

// Toggle dark theme
function handleToggleTheme() {
  isDarkMode.value = !isDarkMode.value

  // Apply dark mode class to document for global CSS
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark-theme')
  } else {
    document.documentElement.classList.remove('dark-theme')
  }
}

// Check if document already has dark theme class on mount
onMounted(() => {
  if (document.documentElement.classList.contains('dark-theme')) {
    isDarkMode.value = true
  }
})
</script>

<template>
  <div class="ui-demo" :class="{ 'dark-theme': isDarkMode }">
    <header class="demo-header">
      <h1>AlpacaWeb UI Component Examples</h1>
      <div class="demo-controls">
        <button
          class="demo-button"
          :class="{ active: activeComponent === 'sidebar' }"
          @click="activeComponent = 'sidebar'"
        >
          Show Sidebar
        </button>
        <button
          class="demo-button"
          :class="{ active: activeComponent === 'discovery' }"
          @click="activeComponent = 'discovery'"
        >
          Show Discovery Panel
        </button>
        <button class="demo-button theme-toggle" @click="handleToggleTheme">
          {{ isDarkMode ? 'Light Theme' : 'Dark Theme' }}
        </button>
      </div>
    </header>

    <main class="demo-content p-4">
      <div class="container mx-auto">
        <!-- Typography Demo -->
        <section class="demo-section">
          <h2>Typography</h2>
          <div class="demo-sample-text">
            <h1>Heading Level 1</h1>
            <h2>Heading Level 2</h2>
            <h3>Heading Level 3</h3>
            <h4>Heading Level 4</h4>
            <p>
              This is a paragraph of text. The quick brown fox jumps over the lazy dog. This
              paragraph demonstrates the base font size and line height used throughout the
              application.
            </p>
            <p>
              <strong>This text is bold.</strong> <em>This text is italicized.</em>
              <a href="#">This is a link.</a>
              <span class="text-secondary">This text uses the secondary color.</span>
            </p>
          </div>
        </section>

        <!-- Button Demo -->
        <section class="demo-section">
          <h2>Buttons</h2>
          <h3>Standard Buttons</h3>
          <div class="button-examples">
            <button class="btn btn-primary">Primary Button</button>
            <button class="btn btn-secondary">Secondary Button</button>
            <button class="btn btn-success">Success Button</button>
            <button class="btn btn-warning">Warning Button</button>
            <button class="btn btn-danger">Danger Button</button>
            <button class="btn btn-primary" disabled>Disabled Button</button>
          </div>

          <h3>Icon Buttons</h3>
          <div class="button-examples">
            <button class="btn btn-primary">
              <span class="icon">🏠</span>
              Home
            </button>
            <button class="btn btn-secondary">
              <span class="icon">⚙️</span>
              Settings
            </button>
            <button class="btn btn-danger">
              <span class="icon">🗑️</span>
              Delete
            </button>
          </div>
        </section>

        <!-- Forms Demo -->
        <section class="demo-section">
          <h2>Form Elements</h2>
          <div class="form-examples">
            <div>
              <label for="text-input">Text Input</label>
              <input id="text-input" type="text" placeholder="Enter text here" />
            </div>

            <div>
              <label for="select-input">Select Input</label>
              <select id="select-input">
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </select>
            </div>

            <div>
              <label> <input type="checkbox" /> Checkbox </label>
            </div>

            <div>
              <label> <input type="radio" name="radio-group" /> Radio Option 1 </label>
              <label> <input type="radio" name="radio-group" /> Radio Option 2 </label>
            </div>
          </div>
        </section>

        <!-- Colors Demo -->
        <section class="demo-section">
          <h2>Colors</h2>
          <div class="colors-demo">
            <div class="color-sample primary">Primary Color</div>
            <div class="color-sample primary-light">Primary Light</div>
            <div class="color-sample primary-dark">Primary Dark</div>
            <div class="color-sample success">Success Color</div>
            <div class="color-sample warning">Warning Color</div>
            <div class="color-sample error">Error Color</div>
            <div class="color-sample bg">Background Color</div>
            <div class="color-sample text">Text Color</div>
          </div>
        </section>

        <!-- Panel Component Demo -->
        <div v-if="activeComponent === 'sidebar'">
          <SidebarExample :is-dark-mode="isDarkMode" />
        </div>
        <div v-if="activeComponent === 'discovery'">
          <DiscoveryExample :is-dark-mode="isDarkMode" />
        </div>
      </div>
    </main>
  </div>
</template>

<style>
.dark-theme {
  /* We don't need these demo variables anymore since we're using our global ones */
  --demo-bg-color: var(--aw-bg-color);
  --demo-text-color: var(--aw-text-color);
  --demo-panel-bg-color: var(--aw-panel-bg-color);
  --demo-highlight-color: var(--aw-primary-color);
  --demo-border-color: var(--aw-panel-border-color);
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
}

.ui-demo {
  min-height: 100vh;
  background-color: var(--aw-bg-color);
  color: var(--aw-text-color);
}

.demo-header {
  padding: 20px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.demo-header h1 {
  margin: 0 0 20px 0;
  font-size: var(--font-size-2xl);
  text-align: center;
}

.demo-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.demo-button {
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--aw-panel-menu-bar-color);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all 0.2s ease;
}

.demo-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.demo-button.active {
  background-color: var(--aw-panel-resize-bg-color);
}

.demo-button.theme-toggle {
  background-color: var(--aw-panel-resize-bg-color);
}

.demo-section {
  padding: 2rem;
  margin-bottom: 2rem;
  background: var(--aw-panel-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.demo-section h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: var(--font-size-xl);
  color: var(--aw-text-color);
}

.demo-section h3 {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  font-size: var(--font-size-lg);
  color: var(--aw-text-color);
}

.demo-section p {
  margin-bottom: 1rem;
  line-height: var(--line-height-normal);
}

.button-examples,
.form-examples {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.demo-sample-text p {
  margin-bottom: var(--spacing-md);
}
</style>

<style scoped>
.demo-content {
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Form Examples */
.form-examples {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.form-examples > div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-weight: var(--font-weight-medium);
  margin-bottom: 4px;
}

/* Color Samples */
.colors-demo {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.color-sample {
  padding: 20px;
  border-radius: 4px;
  color: white;
  text-align: center;
  font-weight: var(--font-weight-medium);
}

.color-sample.primary {
  background-color: var(--aw-primary-color);
}

.color-sample.primary-light {
  background-color: var(--aw-primary-light);
}

.color-sample.primary-dark {
  background-color: var(--aw-primary-dark);
}

.color-sample.success {
  background-color: var(--aw-success-color);
}

.color-sample.warning {
  background-color: var(--aw-warning-color);
}

.color-sample.error {
  background-color: var(--aw-error-color);
}

.color-sample.bg {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border: 1px solid var(--aw-panel-border-color);
}

.color-sample.text {
  background-color: var(--aw-text-color);
  color: var(--aw-bg-color);
}

.text-secondary {
  color: var(--aw-text-secondary-color);
}

.p-4 {
  padding: 1rem;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}
</style>
