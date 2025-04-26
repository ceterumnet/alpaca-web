<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  name: 'UiDocumentation'
})

const components = ref([
  {
    name: 'EnhancedSidebar',
    description:
      'A responsive sidebar component for device navigation with filtering, grid/list views, and collapsible design.',
    props: [
      { name: 'devices', type: 'Array', description: 'List of devices to display' },
      { name: 'isDarkMode', type: 'Boolean', description: 'Whether to use dark mode styling' }
    ],
    events: [
      { name: 'toggle-theme', description: 'Emitted when theme toggle is clicked' },
      { name: 'toggle-device', description: 'Emitted when device connection toggle is clicked' },
      { name: 'device-action', description: 'Emitted when a device action button is clicked' },
      { name: 'toggle-sidebar', description: 'Emitted when sidebar is expanded/collapsed' }
    ]
  },
  {
    name: 'EnhancedDiscoveryPanel',
    description: 'A discovery panel for finding and connecting to Alpaca devices on the network.',
    props: [
      { name: 'servers', type: 'Array', description: 'List of available servers' },
      { name: 'devices', type: 'Array', description: 'List of discovered devices' },
      { name: 'isDiscovering', type: 'Boolean', description: 'Whether discovery is in progress' },
      { name: 'lastDiscoveryTime', type: 'Date', description: 'Timestamp of last discovery scan' }
    ],
    events: [
      { name: 'discover', description: 'Emitted when discovery scan is initiated' },
      { name: 'connect-device', description: 'Emitted when connecting to a device' },
      { name: 'add-server', description: 'Emitted when a manual server is added' }
    ]
  }
])
</script>

<template>
  <div class="documentation">
    <div class="doc-header">
      <h2>AlpacaWeb UI Component Documentation</h2>
      <p>
        This page provides documentation for the UI components included in the AlpacaWeb demo. These
        components are designed to provide a modern, responsive interface for astronomical device
        control.
      </p>
    </div>

    <div class="components-grid">
      <div v-for="component in components" :key="component.name" class="component-card">
        <h3>{{ component.name }}</h3>
        <p class="component-description">{{ component.description }}</p>

        <div class="component-details">
          <div class="props-section">
            <h4>Props</h4>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="prop in component.props" :key="prop.name">
                  <td>{{ prop.name }}</td>
                  <td>{{ prop.type }}</td>
                  <td>{{ prop.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="events-section">
            <h4>Events</h4>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="event in component.events" :key="event.name">
                  <td>{{ event.name }}</td>
                  <td>{{ event.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.documentation {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  color: var(--aw-panel-content-color);
}

.doc-header {
  margin-bottom: 30px;
  text-align: center;
}

.doc-header h2 {
  font-size: 1.8rem;
  margin-bottom: 10px;
  color: var(--aw-panel-content-color);
}

.components-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}

@media (min-width: 768px) {
  .components-grid {
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  }
}

.component-card {
  background-color: var(--aw-panel-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--aw-panel-border-color);
}

.component-card h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--aw-panel-content-color);
  font-size: 1.4rem;
}

.component-description {
  margin-bottom: 20px;
  line-height: 1.5;
}

.component-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.1rem;
  color: var(--aw-panel-content-color);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th {
  text-align: left;
  padding: 8px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  font-weight: 600;
}

td {
  padding: 8px;
  border-bottom: 1px solid var(--aw-panel-border-color);
}

tr:last-child td {
  border-bottom: none;
}
</style>
