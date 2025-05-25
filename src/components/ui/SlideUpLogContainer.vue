<script setup lang="ts">
import { ref } from 'vue';
import LogPanel from '@/components/ui/LogPanel.vue';
import Icon from '@/components/ui/Icon.vue'; // Assuming Icon component is available and styled

const showLogs = ref(false);

const toggleLogs = () => {
  showLogs.value = !showLogs.value;
};

// Placeholder for tear-out functionality
const tearOutLogs = () => {
  alert('Tear-out functionality to be implemented.');
  // Logic will involve window.open() with a dedicated route for LogDisplayView
};
</script>

<template>
  <div>
    <!-- This button would ideally be placed in a more global/fixed position like App.vue or a layout footer -->
    <!-- For now, it's here for self-containment of the toggle logic -->
    <button class="aw-button aw-button--secondary toggle-log-button" @click="toggleLogs">
      <Icon :type="showLogs ? 'chevron-down' : 'chevron-up'" size="18" />
      {{ showLogs ? 'Hide Logs' : 'Show Logs' }}
    </button>

    <transition name="slide-up">
      <div v-if="showLogs" class="slide-up-log-container">
        <div class="container-header">
          <span class="container-title">Application Log Stream</span>
          <div class="container-actions">
            <!-- Add other controls like resizer/height presets later -->
            <button class="aw-button aw-button--icon-only aw-button--subtle" title="Tear out logs" @click="tearOutLogs">
              <Icon type="external-link" size="18" />
            </button>
            <button class="aw-button aw-button--icon-only aw-button--subtle" title="Close logs" @click="toggleLogs">
              <Icon type="x" size="20" />
            </button>
          </div>
        </div>
        <div class="container-content">
          <LogPanel />
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.toggle-log-button {
  position: fixed;
  bottom: var(--aw-spacing-md);
  right: var(--aw-spacing-md);
  z-index: var(--aw-z-index-overlay);
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);

  /* Assuming --aw-button--secondary provides background, color, border */

  /* Add display: flex and gap if Icon and text need alignment */
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
}

.slide-up-log-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40vh; /* Initial height, can be made dynamic later */
  max-height: 80vh;
  background-color: var(--aw-panel-bg-color);
  border-top: 1px solid var(--aw-color-border);
  /* stylelint-disable-next-line function-disallowed-list */
  box-shadow: 0 -2px 10px rgb(0 0 0 / 10%); /* This might need a themeable shadow token later */
  z-index: var(--aw-z-index-overlay-panel);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Important for LogPanel which might have its own overflow */
  /* stylelint-disable-next-line declaration-property-value-disallowed-list */
  border-radius: 0; /* Explicitly no radius here if not desired */
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  background-color: var(--aw-panel-header-bg-color);
  color: var(--aw-panel-header-text-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
  flex-shrink: 0; /* Prevent header from shrinking */
}

.container-title {
  font-size: 1rem; /* Consider var(--aw-font-size-base) if available */
  font-weight: var(--aw-font-weight-bold);
}

.container-actions {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.aw-button.aw-button--icon-only.aw-button--subtle {
  /* stylelint-disable-next-line declaration-property-value-no-unknown */
  background-color: none;
  color: var(--aw-panel-header-text);
  border: none;
  padding: var(--aw-spacing-xs);
}

.aw-button.aw-button--icon-only.aw-button--subtle:hover {
  background-color: var(--aw-color-overlay-light-hover);
}

.container-content {
  flex-grow: 1;
  overflow: hidden;
}

/* Slide-up Transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.slide-up-enter-to,
.slide-up-leave-from {
  transform: translateY(0);
}
</style> 