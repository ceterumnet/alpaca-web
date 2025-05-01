// Component Showcase
// This component provides a visual catalog of all UI elements used throughout the application
// with implementation examples in both light and dark theme.

<template>
  <div class="component-showcase">
    <header class="showcase-header">
      <h1>Alpaca Web UI Component Showcase</h1>
      <div class="theme-toggle">
        <span class="theme-label">Theme:</span>
        <button 
          class="theme-button"
          :class="{ active: !isDarkTheme }"
          @click="setLightTheme"
        >
          <Icon type="sun" />
          Light
        </button>
        <button 
          class="theme-button"
          :class="{ active: isDarkTheme }"
          @click="setDarkTheme"
        >
          <Icon type="moon" />
          Dark (Astronomy)
        </button>
      </div>
    </header>

    <main class="showcase-content">
      <section class="showcase-section">
        <h2>Colors</h2>
        <div class="color-grid">
          <div class="color-category">
            <h3>Neutral</h3>
            <div class="color-swatches">
              <div 
                v-for="level in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]" 
                :key="`neutral-${level}`"
                class="color-swatch"
                :style="{ backgroundColor: `var(--aw-color-neutral-${level})` }"
              >
                <span class="swatch-label">{{ level }}</span>
              </div>
            </div>
          </div>
          
          <div class="color-category">
            <h3>Primary</h3>
            <div class="color-swatches">
              <div 
                v-for="level in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]" 
                :key="`primary-${level}`"
                class="color-swatch"
                :style="{ backgroundColor: `var(--aw-color-primary-${level})` }"
              >
                <span class="swatch-label">{{ level }}</span>
              </div>
            </div>
          </div>

          <div class="color-category">
            <h3>Semantic</h3>
            <div class="color-swatches">
              <div 
                v-for="(color, index) in ['success', 'warning', 'error']" 
                :key="`semantic-${index}`"
                class="color-swatch semantic-swatch"
                :style="{ backgroundColor: `var(--aw-color-${color}-500)` }"
              >
                <span class="swatch-label">{{ color }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="showcase-section">
        <h2>Buttons</h2>
        <h3>Variants</h3>
        <div class="component-row">
          <div v-for="variant in buttonVariants" :key="variant" class="component-example">
            <h4>{{ variant }}</h4>
            <AppButton :variant="variant">{{ variant }}</AppButton>
          </div>
        </div>

        <h3>Sizes</h3>
        <div class="component-row">
          <div v-for="size in buttonSizes" :key="size" class="component-example">
            <h4>{{ size }}</h4>
            <AppButton :size="size">{{ size }}</AppButton>
          </div>
        </div>

        <h3>States</h3>
        <div class="component-row">
          <div class="component-example">
            <h4>Default</h4>
            <AppButton>Default</AppButton>
          </div>
          <div class="component-example">
            <h4>Disabled</h4>
            <AppButton disabled>Disabled</AppButton>
          </div>
          <div class="component-example">
            <h4>Loading</h4>
            <AppButton loading>Loading</AppButton>
          </div>
          <div class="component-example">
            <h4>With Icon</h4>
            <AppButton icon="gear">Settings</AppButton>
          </div>
        </div>
      </section>

      <section class="showcase-section">
        <h2>Icons</h2>
        <div class="icon-grid">
          <div 
            v-for="iconType in iconTypes" 
            :key="iconType" 
            class="icon-item"
          >
            <Icon :type="iconType" />
            <span class="icon-label">{{ iconType }}</span>
          </div>
        </div>
      </section>

      <!-- Additional component sections will be added here as they're migrated -->
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import AppButton from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import type { IconType } from '@/components/ui/Icon.vue'
import type { ButtonVariant, ButtonSize } from '@/components/ui/Button.vue'

export default defineComponent({
  name: 'ComponentShowcase',
  
  components: {
    AppButton,
    Icon
  },
  
  setup() {
    const isDarkTheme = ref(false)
    
    const setDarkTheme = () => {
      document.documentElement.classList.add('dark-theme')
      isDarkTheme.value = true
    }
    
    const setLightTheme = () => {
      document.documentElement.classList.remove('dark-theme')
      isDarkTheme.value = false
    }
    
    const buttonVariants: ButtonVariant[] = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger']
    const buttonSizes: ButtonSize[] = ['small', 'medium', 'large']
    
    // Icon types based on the IconType type
    const iconTypes: IconType[] = [
      'camera',
      'dome',
      'sun',
      'moon',
      'device-unknown',
      'search',
      'focus',
      'filter',
      'cloud',
      'chevron-left',
      'chevron-right',
      'gear',
      'exposure',
      'close',
      'expand',
      'collapse',
      'compact',
      'detailed',
      'fullscreen',
      'connected',
      'disconnected',
      'arrow-up',
      'arrow-down',
      'arrow-left',
      'arrow-right',
      'stop',
      'tracking-on',
      'tracking-off',
      'home',
      'files',
      'history'
    ]
    
    return {
      isDarkTheme,
      setDarkTheme,
      setLightTheme,
      buttonVariants,
      buttonSizes,
      iconTypes
    }
  }
})
</script>

<style scoped>
.component-showcase {
  padding: var(--aw-spacing-md);
  width: 100%;
  color: var(--aw-text-color);
}

.showcase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--aw-spacing-xl);
  padding-bottom: var(--aw-spacing-md);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.showcase-header h1 {
  font-size: 1.8rem;
  margin: 0;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.theme-label {
  font-weight: 500;
}

.theme-button {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  padding: var(--aw-spacing-xs) var(--aw-spacing-md);
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  background-color: var(--aw-panel-bg-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-button.active {
  background-color: var(--aw-color-primary-500);
  color: var(--aw-button-primary-text);
  border-color: var(--aw-color-primary-500);
}

.showcase-section {
  margin-bottom: var(--aw-spacing-xl);
  padding: var(--aw-spacing-lg);
  background-color: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-md);
  box-shadow: var(--aw-shadow-sm);
}

.showcase-section h2 {
  margin-top: 0;
  margin-bottom: var(--aw-spacing-md);
  padding-bottom: var(--aw-spacing-xs);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.showcase-section h3 {
  margin-top: var(--aw-spacing-lg);
  margin-bottom: var(--aw-spacing-sm);
  font-size: 1.2rem;
}

.color-grid {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-lg);
}

.color-category h3 {
  margin-top: 0;
  margin-bottom: var(--aw-spacing-sm);
}

.color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-sm);
}

.color-swatch {
  width: 80px;
  height: 80px;
  border-radius: var(--aw-border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  box-shadow: var(--aw-shadow-sm);
  position: relative;
}

.color-swatch:hover {
  transform: scale(1.05);
}

.swatch-label {
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.semantic-swatch {
  width: 120px;
}

.component-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-lg);
  margin-bottom: var(--aw-spacing-lg);
}

.component-example {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-xs);
}

.component-example h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--aw-spacing-md);
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--aw-spacing-xs);
  padding: var(--aw-spacing-sm);
  border-radius: var(--aw-border-radius-sm);
  background-color: var(--aw-panel-hover-bg-color);
  transition: all 0.2s ease;
}

.icon-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--aw-shadow-sm);
}

.icon-label {
  font-size: 0.75rem;
  color: var(--aw-text-secondary-color);
  text-align: center;
}
</style> 