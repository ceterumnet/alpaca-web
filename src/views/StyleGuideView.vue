<template>
  <div class="style-guide-view aw-bg-background aw-text-text-primary">
    <header class="aw-py-lg aw-px-xl aw-bg-surface">
      <h1 class="aw-text-3xl aw-font-bold">UI Style Guide</h1>
      <p class="aw-text-text-secondary aw-mt-sm">
        This page showcases the various UI components and their variants available in the application.
      </p>
      <div class="aw-mt-md">
        <label for="theme-switcher" class="aw-mr-sm">Toggle Theme:</label>
        <select id="theme-switcher" v-model="currentTheme" class="aw-p-sm aw-border aw-border-border aw-rounded aw-bg-surface" @change="switchTheme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    </header>

    <main class="aw-p-xl aw-space-y-xl">
      <!-- Icons Section -->
      <section class="aw-p-lg aw-bg-surface aw-rounded-md aw-shadow">
        <h2 class="aw-text-2xl aw-font-semibold aw-mb-md">Icons</h2>
        
        <div class="aw-mb-md">
          <h3 class="aw-text-lg aw-font-medium aw-mb-sm">Standard Size (24px)</h3>
          <div class="aw-flex aw-flex-wrap aw-gap-md">
            <Icon type="camera" size="24" />
            <Icon type="telescope" size="24" />
            <Icon type="settings" size="24" />
            <Icon type="home" size="24" />
            <Icon type="sun" size="24" />
            <Icon type="moon" size="24" />
            <Icon type="alert-triangle" size="24" />
            <Icon type="check" size="24" />
            <Icon type="x" size="24" />
          </div>
        </div>

        <div class="aw-mb-md">
          <h3 class="aw-text-lg aw-font-medium aw-mb-sm">Large Size (32px)</h3>
          <div class="aw-flex aw-flex-wrap aw-gap-md">
            <Icon type="camera" size="32" />
            <Icon type="settings" size="32" />
            <Icon type="home" size="32" />
            <Icon type="alert-triangle" size="32" />
          </div>
        </div>

        <div class="aw-mb-md">
          <h3 class="aw-text-lg aw-font-medium aw-mb-sm">Small Size (16px)</h3>
          <div class="aw-flex aw-flex-wrap aw-gap-md">
            <Icon type="camera" size="16" />
            <Icon type="settings" size="16" />
            <Icon type="home" size="16" />
            <Icon type="alert-triangle" size="16" />
          </div>
        </div>

        <p class="aw-mt-sm aw-text-text-secondary">Refer to Icon.vue for all available icon types and props.</p>
      </section>

      <!-- Other component sections will be added back here later -->

    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import Icon from '@/components/ui/Icon.vue';

// Other component imports will be added back later
// import ToastNotification from '@/components/ui/ToastNotification.vue';
// import SettingsPanel from '@/components/ui/SettingsPanel.vue';
// import DiscoveryIndicator from '@/components/navigation/DiscoveryIndicator.vue';

export default defineComponent({
  name: 'StyleGuideView',
  components: {
    Icon,
    // ToastNotification,
    // SettingsPanel,
    // DiscoveryIndicator,
  },
  setup() {
    const currentTheme = ref('light'); // Default to light theme

    const applyTheme = (themeName: string) => {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', themeName);
        currentTheme.value = themeName;
        localStorage.setItem('theme', themeName);
      }
    };

    const switchTheme = () => {
      applyTheme(currentTheme.value);
    };

    onMounted(() => {
      if (typeof localStorage !== 'undefined') {
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
      }
    });

    return {
      currentTheme,
      switchTheme,
    };
  },
});
</script>

<style scoped>
.style-guide-view {
  min-height: 100vh;
}

/* Basic styling for the showcase sections, can be expanded */
h1, h2, h3 {
  color: var(--aw-color-text-heading, var(--aw-color-text-primary)); /* Fallback if heading specific token not present */
}

/* Ensure the theme switcher dropdown is also themed appropriately */
#theme-switcher {
  background-color: var(--aw-color-input-background, var(--aw-color-surface));
  color: var(--aw-color-input-text, var(--aw-color-text-primary));
  border-color: var(--aw-color-input-border, var(--aw-color-border));
}
</style> 