// Status: Legacy - Prototype Component // This is the workspace panel prototype that: // - Tests
panel content generation // - Provides mock device panels // - Demonstrates panel layout concepts //
- NOTE: Superseded by new panel system implementation

<script setup lang="ts">
// Define props for the workspace panel
interface Props {
  deviceType: string
  name: string
}

const props = defineProps<Props>()

// Get appropriate panel content based on device type
function getPanelContent(deviceType: string) {
  switch (deviceType.toLowerCase()) {
    case 'camera':
      return {
        title: 'Camera Panel',
        content: getCameraContent()
      }
    case 'telescope':
      return {
        title: 'Telescope Panel',
        content: getTelescopeContent()
      }
    case 'focuser':
      return {
        title: 'Focuser Panel',
        content: getFocuserContent()
      }
    case 'filterwheel':
      return {
        title: 'Filter Wheel Panel',
        content: getFilterWheelContent()
      }
    case 'weather':
      return {
        title: 'Weather Panel',
        content: getWeatherContent()
      }
    case 'catalog':
      return {
        title: 'Object Catalog Panel',
        content: getCatalogContent()
      }
    default:
      return {
        title: 'Generic Panel',
        content:
          '<div class="generic-content">No specific content available for this device type</div>'
      }
  }
}

// Get the panel content for this device type
const panelContent = getPanelContent(props.deviceType)

// Mock content for different panel types
function getCameraContent() {
  return `
    <div class="camera-content">
      <div class="image-display">
        <div class="mock-image">
          <div class="star star1"></div>
          <div class="star star2"></div>
          <div class="star star3"></div>
          <div class="star star4"></div>
          <div class="star star5"></div>
        </div>
      </div>
      <div class="camera-controls">
        <div class="control-group">
          <label>Exposure</label>
          <div class="control-row">
            <input type="range" min="0.1" max="300" step="0.1" value="1.0" />
            <span>1.0 s</span>
          </div>
        </div>
        <div class="control-group">
          <label>Gain</label>
          <div class="control-row">
            <input type="range" min="0" max="100" value="50" />
            <span>50</span>
          </div>
        </div>
        <div class="btn-group">
          <button class="btn-primary">Capture</button>
          <button class="btn-secondary">Live View</button>
        </div>
      </div>
    </div>
  `
}

function getTelescopeContent() {
  return `
    <div class="telescope-content">
      <div class="telescope-info">
        <div class="info-row">
          <div class="info-label">RA:</div>
          <div class="info-value">05h 35m 17s</div>
        </div>
        <div class="info-row">
          <div class="info-label">Dec:</div>
          <div class="info-value">-05° 23' 28"</div>
        </div>
        <div class="info-row">
          <div class="info-label">Altitude:</div>
          <div class="info-value">37.8°</div>
        </div>
        <div class="info-row">
          <div class="info-label">Azimuth:</div>
          <div class="info-value">142.6°</div>
        </div>
      </div>
      <div class="motion-controls">
        <div class="control-pad">
          <button class="pad-button north">N</button>
          <button class="pad-button east">E</button>
          <button class="pad-button west">W</button>
          <button class="pad-button south">S</button>
          <div class="pad-center"></div>
        </div>
        <div class="speed-control">
          <label>Speed</label>
          <select>
            <option>Guide</option>
            <option selected>Center</option>
            <option>Find</option>
            <option>Slew</option>
          </select>
        </div>
      </div>
    </div>
  `
}

function getFocuserContent() {
  return `
    <div class="focuser-content">
      <div class="focuser-position">
        <div class="position-value">24,567</div>
        <div class="position-label">Position</div>
      </div>
      <div class="focuser-controls">
        <button class="move-button out">◀</button>
        <div class="step-size">
          <input type="number" value="100" min="1" max="10000" />
          <span>Step</span>
        </div>
        <button class="move-button in">▶</button>
      </div>
      <div class="focuser-auto">
        <button class="auto-focus-button">Auto Focus</button>
      </div>
    </div>
  `
}

function getFilterWheelContent() {
  return `
    <div class="filterwheel-content">
      <div class="filters-carousel">
        <div class="filter-item selected">L</div>
        <div class="filter-item">R</div>
        <div class="filter-item">G</div>
        <div class="filter-item">B</div>
        <div class="filter-item">Ha</div>
      </div>
      <div class="filter-controls">
        <button class="prev-filter">Previous</button>
        <button class="next-filter">Next</button>
      </div>
    </div>
  `
}

function getWeatherContent() {
  return `
    <div class="weather-content">
      <div class="weather-data">
        <div class="weather-item">
          <div class="weather-value">12.4°C</div>
          <div class="weather-label">Temperature</div>
        </div>
        <div class="weather-item">
          <div class="weather-value">67%</div>
          <div class="weather-label">Humidity</div>
        </div>
        <div class="weather-item">
          <div class="weather-value">1013 hPa</div>
          <div class="weather-label">Pressure</div>
        </div>
        <div class="weather-item">
          <div class="weather-value">3.2 m/s</div>
          <div class="weather-label">Wind</div>
        </div>
      </div>
      <div class="weather-status safe">
        <div class="status-indicator"></div>
        <div class="status-text">Safe for Imaging</div>
      </div>
    </div>
  `
}

function getCatalogContent() {
  return `
    <div class="catalog-content">
      <div class="search-input-container">
        <input type="text" placeholder="Search objects (e.g. M31, Andromeda)" class="search-input">
        <button class="search-button">🔍</button>
      </div>
      <div class="catalog-results">
        <div class="object-card selected">
          <div class="object-name">Andromeda Galaxy</div>
          <div class="object-id">M31 / NGC224</div>
          <div class="object-type">Galaxy</div>
        </div>
        <div class="object-card">
          <div class="object-name">Orion Nebula</div>
          <div class="object-id">M42 / NGC1976</div>
          <div class="object-type">Nebula</div>
        </div>
        <div class="object-card">
          <div class="object-name">Pleiades</div>
          <div class="object-id">M45</div>
          <div class="object-type">Open Cluster</div>
        </div>
      </div>
      <div class="catalog-actions">
        <button class="action-button send-to-scope">Send to Telescope</button>
      </div>
    </div>
  `
}
</script>

<template>
  <div class="workspace-panel">
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">{{ panelContent.title.charAt(0) }}</div>
        <div class="header-title">{{ props.name }}</div>
      </div>
      <div class="header-controls">
        <button class="header-button" title="Settings">⚙️</button>
        <button class="header-button connect-button" title="Connect">🔌</button>
      </div>
    </div>
    <div class="panel-content" v-html="panelContent.content"></div>
  </div>
</template>

<style scoped>
.workspace-panel {
  background-color: var(--aw-panel-bg-color);
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-icon {
  width: 24px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.header-title {
  font-weight: 500;
}

.header-controls {
  display: flex;
  gap: 0.25rem;
}

.header-button {
  width: 28px;
  height: 28px;
  border-radius: 0.25rem;
  border: none;
  background-color: rgba(0, 0, 0, 0.1);
  color: var(--aw-panel-menu-bar-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-button:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

.connect-button {
  background-color: rgba(76, 175, 80, 0.3);
}

.panel-content {
  flex: 1;
  padding: 1rem;
  overflow: auto;
  background-color: var(--aw-panel-content-bg-color);
}

/* Common styles for panel content */
:deep(.btn-primary) {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  border: none;
  background-color: var(--aw-primary-color);
  color: white;
  cursor: pointer;
}

:deep(.btn-secondary) {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  border: none;
  background-color: var(--aw-button-secondary-bg);
  color: var(--aw-button-secondary-text);
  cursor: pointer;
}

:deep(.telescope-content) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

:deep(.telescope-info) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

:deep(.info-row) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.info-label) {
  font-weight: 500;
  color: var(--aw-text-secondary-color);
}

:deep(.motion-controls) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

:deep(.control-pad) {
  position: relative;
  width: 150px;
  height: 150px;
}

:deep(.pad-button) {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background-color: var(--aw-button-secondary-bg);
  color: var(--aw-button-secondary-text);
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

:deep(.pad-button:hover) {
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
}

:deep(.pad-button.north) {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

:deep(.pad-button.south) {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}

:deep(.pad-button.east) {
  top: 50%;
  right: 0;
  transform: translateY(-50%);
}

:deep(.pad-button.west) {
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}

:deep(.pad-center) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--aw-panel-border-color);
}

:deep(.speed-control) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.camera-content) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

:deep(.image-display) {
  aspect-ratio: 3/2;
  background-color: #000;
  border-radius: 0.25rem;
  overflow: hidden;
  position: relative;
}

:deep(.mock-image) {
  width: 100%;
  height: 100%;
  position: relative;
}

:deep(.star) {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 0 10px 2px rgba(255, 255, 255, 0.7);
}

:deep(.star1) {
  top: 20%;
  left: 30%;
  width: 6px;
  height: 6px;
}

:deep(.star2) {
  top: 40%;
  left: 60%;
}

:deep(.star3) {
  top: 70%;
  left: 25%;
}

:deep(.star4) {
  top: 10%;
  left: 80%;
}

:deep(.star5) {
  top: 60%;
  left: 70%;
  width: 5px;
  height: 5px;
}

:deep(.camera-controls) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

:deep(.control-group) {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

:deep(.control-row) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.control-row input[type='range']) {
  flex: 1;
}

:deep(.btn-group) {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

:deep(.focuser-content),
:deep(.filterwheel-content),
:deep(.weather-content) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

/* Hide panel when the template changes */
.workspace-panel.hidden {
  opacity: 0;
  transform: scale(0.95);
  pointer-events: none;
}

/* Show panel with an animation */
.workspace-panel.animated {
  animation: panel-enter 0.3s ease forwards;
}

@keyframes panel-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Catalog styles */
.catalog-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.catalog-content .search-input-container {
  display: flex;
  gap: 0.5rem;
}

.catalog-content .search-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.catalog-content .search-button {
  padding: 0.5rem;
  background: #2196f3;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.catalog-content .catalog-results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.catalog-content .object-card {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
  cursor: pointer;
  transition: background 0.2s;
}

.catalog-content .object-card:hover {
  background: #f0f0f0;
}

.catalog-content .object-card.selected {
  background: #e3f2fd;
  border-color: #2196f3;
}

.catalog-content .object-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.catalog-content .object-id {
  font-size: 0.8rem;
  color: #666;
}

.catalog-content .object-type {
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
}

.catalog-content .catalog-actions {
  display: flex;
  justify-content: flex-end;
}

.catalog-content .action-button {
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.catalog-content .action-button:hover {
  background: #43a047;
}

.catalog-content .send-to-scope::before {
  content: '🔭 ';
}
</style>
