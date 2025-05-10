<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Telescope'
  }
})

const emit = defineEmits(['device-change'])

// Handle device selection changes
const handleDeviceChange = (newDeviceId: string) => {
  emit('device-change', newDeviceId)
}

// Tracking state
const tracking = ref(false)
const toggleTracking = () => {
  tracking.value = !tracking.value
  // In actual implementation, would call Alpaca API here
}

// Tracking rate options
const trackingRates = [
  { value: 0, label: 'Sidereal' },
  { value: 1, label: 'Lunar' },
  { value: 2, label: 'Solar' },
  { value: 3, label: 'King' }
]
const selectedTrackingRate = ref(0)

// Coordinates (in actual implementation these would come from device)
const rightAscension = ref(12.34)
const declination = ref(45.67)
const altitude = ref(30.5)
const azimuth = ref(220.7)

// Format right ascension as HH:MM:SS
const formattedRA = computed(() => {
  const value = rightAscension.value
  const hours = Math.floor(value)
  const minutes = Math.floor((value - hours) * 60)
  const seconds = Math.floor(((value - hours) * 60 - minutes) * 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// Format declination as +/-DD:MM:SS
const formattedDec = computed(() => {
  const value = declination.value
  const sign = value >= 0 ? '+' : '-'
  const absDec = Math.abs(value)
  const degrees = Math.floor(absDec)
  const minutes = Math.floor((absDec - degrees) * 60)
  const seconds = Math.floor(((absDec - degrees) * 60 - minutes) * 60)
  return `${sign}${degrees.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// Simple slew to coordinates
const targetRA = ref(0)
const targetDec = ref(0)
const slewToCoordinates = () => {
  console.log(`Slewing to RA: ${targetRA.value}, Dec: ${targetDec.value}`)
  // In actual implementation, would call Alpaca API here
}

// Direction control buttons for manual slew
const moveDirection = (direction: string) => {
  console.log(`Moving telescope: ${direction}`)
  // In actual implementation, would call Alpaca API here
}

// Advanced functions
const parkTelescope = () => {
  console.log('Parking telescope')
  // In actual implementation, would call Alpaca API here
}

const unparkTelescope = () => {
  console.log('Unparking telescope')
  // In actual implementation, would call Alpaca API here
}

const findHome = () => {
  console.log('Finding home position')
  // In actual implementation, would call Alpaca API here
}
</script>

<template>
  <div class="simplified-panel">
    <!-- Header with title and device selector -->
    <div class="panel-header">
      <h2>{{ props.title }}</h2>
      <select :value="props.deviceId" @change="(e: Event) => handleDeviceChange((e.target as HTMLSelectElement).value)">
        <option value="telescope1">Telescope 1</option>
        <option value="telescope2">Telescope 2</option>
        <option value="demo-telescope">Demo Telescope</option>
      </select>
    </div>
    
    <!-- Main panel content with sections -->
    <div class="panel-content">
      <!-- Position section -->
      <div class="panel-section">
        <h3>Position</h3>
        <div class="coordinate-display">
          <div class="coordinate">
            <span class="label">RA:</span>
            <span class="value">{{ formattedRA }}</span>
          </div>
          <div class="coordinate">
            <span class="label">Dec:</span>
            <span class="value">{{ formattedDec }}</span>
          </div>
        </div>
        <div class="coordinate-display">
          <div class="coordinate">
            <span class="label">Alt:</span>
            <span class="value">{{ altitude.toFixed(2) }}°</span>
          </div>
          <div class="coordinate">
            <span class="label">Az:</span>
            <span class="value">{{ azimuth.toFixed(2) }}°</span>
          </div>
        </div>
      </div>
      
      <!-- Movement section -->
      <div class="panel-section">
        <h3>Movement</h3>
        <div class="slew-coordinates">
          <div class="slew-input">
            <label>Target RA:</label>
            <input v-model="targetRA" type="number" min="0" max="24" step="0.01">
          </div>
          <div class="slew-input">
            <label>Target Dec:</label>
            <input v-model="targetDec" type="number" min="-90" max="90" step="0.01">
          </div>
          <button class="action-button" @click="slewToCoordinates">Slew</button>
        </div>
        
        <!-- Direction control pad -->
        <div class="direction-control">
          <div class="direction-row">
            <button class="direction-button" @click="moveDirection('up')">▲</button>
          </div>
          <div class="direction-row">
            <button class="direction-button" @click="moveDirection('left')">◄</button>
            <button class="direction-button" @click="moveDirection('stop')">■</button>
            <button class="direction-button" @click="moveDirection('right')">►</button>
          </div>
          <div class="direction-row">
            <button class="direction-button" @click="moveDirection('down')">▼</button>
          </div>
        </div>
      </div>
      
      <!-- Tracking section -->
      <div class="panel-section">
        <h3>Tracking</h3>
        <div class="tracking-control">
          <div class="tracking-toggle">
            <span class="label">Tracking:</span>
            <label class="toggle">
              <input v-model="tracking" type="checkbox" @change="toggleTracking">
              <span class="slider"></span>
            </label>
          </div>
          <div class="tracking-rate">
            <span class="label">Rate:</span>
            <select v-model="selectedTrackingRate">
              <option v-for="rate in trackingRates" :key="rate.value" :value="rate.value">
                {{ rate.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Advanced section -->
      <div class="panel-section">
        <h3>Advanced</h3>
        <div class="advanced-buttons">
          <button class="action-button" @click="parkTelescope">Park</button>
          <button class="action-button" @click="unparkTelescope">Unpark</button>
          <button class="action-button" @click="findHome">Find Home</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.simplified-panel {
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border-radius: var(--aw-border-radius, 8px);
  border: 1px solid var(--aw-panel-border-color, #444);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0px 8px;
  border-bottom: 1px solid var(--aw-panel-border-color, #444);
  background-color: var(--aw-panel-header-bg-color, #333);
}

.panel-header h2 {
  margin: 0;
  font-size: 0.8rem;
}

.panel-header select {
  background-color: var(--aw-panel-content-bg-color, #3a3a3a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
  padding: 0;
  margin: 4px 0;
}

.panel-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.panel-section {
  margin-bottom: 20px;
  background-color: var(--aw-panel-content-bg-color, #3a3a3a);
  border-radius: 6px;
  padding: 12px;
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1rem;
  border-bottom: 1px solid var(--aw-panel-border-color, #444);
  padding-bottom: 6px;
}

.coordinate-display {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.coordinate {
  display: flex;
  flex-direction: column;
  width: 48%;
}

.label {
  color: var(--aw-text-secondary-color, #aaa);
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.value {
  font-size: 1.1rem;
  font-weight: 500;
}

.slew-coordinates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.slew-input {
  flex: 1;
  min-width: 120px;
}

.slew-input label {
  display: block;
  margin-bottom: 4px;
  color: var(--aw-text-secondary-color, #aaa);
  font-size: 0.9rem;
}

.slew-input input {
  width: 100%;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
  padding: 4px 8px;
}

.action-button {
  background-color: var(--aw-primary-color, #0077cc);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-weight: 500;
}

.action-button:hover {
  background-color: var(--aw-primary-hover-color, #0066b3);
}

.direction-control {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.direction-row {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin: 2px 0;
}

.direction-button {
  width: 40px;
  height: 40px;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.direction-button:hover {
  background-color: var(--aw-panel-hover-bg-color, #3d3d3d);
}

.tracking-control {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tracking-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  border: 1px solid var(--aw-panel-border-color, #444);
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--aw-text-secondary-color, #aaa);
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--aw-primary-color, #0077cc);
}

input:checked + .slider:before {
  transform: translateX(20px);
  background-color: white;
}

.tracking-rate {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tracking-rate select {
  background-color: var(--aw-panel-bg-color, #2a2a2a);
  color: var(--aw-text-color, #f0f0f0);
  border: 1px solid var(--aw-panel-border-color, #444);
  border-radius: 4px;
  padding: 4px 8px;
  width: 120px;
}

.advanced-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style> 