<script setup lang="ts">
import LogDisplayView from '@/views/LogDisplayView.vue';
// If you have a specific PanelHeader component, import it here, e.g.:
// import PanelHeader from '@/components/layout/PanelHeader.vue'; 
</script>

<template>
  <div class="log-panel">
    <!-- 
      Header removed as it's redundant with SlideUpLogContainer's header.
    -->
    <div class="panel-content">
      <LogDisplayView />
    </div>
  </div>
</template>

<style scoped>
.log-panel {
  display: flex;
  flex-direction: column;
  height: 100%;

  /* background-color: transparent; */
  overflow: hidden;
}

/* Panel header styles removed */

.panel-content {
  flex-grow: 1;
  overflow: hidden; /* LogDisplayView will handle its own scrolling */
  padding: 0; /* Remove padding if LogDisplayView has its own */

  /* 
    If LogDisplayView does not have its own padding and you want it here:
    padding: 1rem;
    overflow-y: auto; 
  */
}

</style> 