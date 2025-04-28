<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUnifiedStore } from '../stores/UnifiedStore'

defineOptions({
  name: 'ImageAnalysisMigrated'
})

// Router and store setup
const route = useRoute()
const router = useRouter()
const store = useUnifiedStore()

// Get device ID from route params
const deviceId = computed(() => route.params.id as string)

// Get the camera device from the store
const device = computed(() => store.getDeviceById(deviceId.value))

// Image data and UI state
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const imageData = ref<null | {
  width: number
  height: number
  url: string
  timestamp: string
  metadata: Record<string, string>
}>(null)

// Image analysis state
const histogramData = ref<number[]>([])
const histogramMin = ref(0)
const histogramMax = ref(0)
const histogramMean = ref(0)
const isProcessing = ref(false)

// Image display settings
const autoStretch = ref(true)
const blackPoint = ref(0)
const whitePoint = ref(100)
const midtonePoint = ref(50)

// Function to go back to device details
const goToDeviceDetails = () => {
  router.push(`/device-migrated/${deviceId.value}`)
}

// Function to capture a new image
const captureNewImage = async () => {
  if (!device.value || !device.value.isConnected) {
    hasError.value = true
    errorMessage.value = 'Device is not connected'
    return
  }

  try {
    isLoading.value = true
    hasError.value = false

    // In a real implementation, this would communicate with the camera
    // Here we'll simulate image capture with a sample image

    // Simulate an API request delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Simulated image data from camera
    imageData.value = {
      width: 1280,
      height: 960,
      url: 'https://placehold.co/1280x960?text=Sample+Image',
      timestamp: new Date().toISOString(),
      metadata: {
        exposureTime: '2.0',
        gain: '100',
        temperature: '-10.0'
      }
    }

    // Generate sample histogram data
    generateSampleHistogramData()
  } catch (error) {
    hasError.value = true
    errorMessage.value = error instanceof Error ? error.message : 'Failed to capture image'
  } finally {
    isLoading.value = false
  }
}

// Function to generate sample histogram data
const generateSampleHistogramData = () => {
  isProcessing.value = true

  // Create a histogram with 256 bins (8-bit image)
  const histogram = Array(256).fill(0)

  // Simulated histogram - bell curve
  for (let i = 0; i < histogram.length; i++) {
    // Bell curve formula
    histogram[i] = Math.round(100 * Math.exp(-Math.pow(i - 128, 2) / 2000))
  }

  // Calculate histogram statistics
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE
  let total = 0
  let count = 0

  for (let i = 0; i < histogram.length; i++) {
    if (histogram[i] > 0) {
      min = Math.min(min, i)
      max = Math.max(max, i)
      total += i * histogram[i]
      count += histogram[i]
    }
  }

  // Update histogram data
  histogramData.value = histogram
  histogramMin.value = min
  histogramMax.value = max
  histogramMean.value = count > 0 ? total / count : 0

  isProcessing.value = false
}

// Function to apply image stretch
const applyImageStretch = () => {
  if (!autoStretch.value) {
    // Custom stretch logic would be implemented here
    console.log(
      `Apply custom stretch: black=${blackPoint.value}%, white=${whitePoint.value}%, midtone=${midtonePoint.value}%`
    )
  } else {
    // Auto stretch logic would be implemented here
    console.log('Apply auto stretch')
  }
}

// Function to download the processed image
const downloadImage = () => {
  if (!imageData.value) return

  // In a real implementation, this would create a processed image download
  // Here we'll just alert to show it would work
  alert('Image download would be implemented here')
}

// Function to toggle auto stretch
const toggleAutoStretch = () => {
  // Toggle the auto stretch value (this is redundant with v-model, but kept for clarity)
  autoStretch.value = !autoStretch.value

  // Always apply the stretch when toggling, regardless of new state
  applyImageStretch()
}

// Watch for changes that require stretch reapplication
watch([blackPoint, whitePoint, midtonePoint], () => {
  if (!autoStretch.value) {
    applyImageStretch()
  }
})

// Initialize component
onMounted(() => {
  // Check if device exists and is a camera
  if (!device.value) {
    hasError.value = true
    errorMessage.value = `Device with ID ${deviceId.value} not found`
    return
  }

  if (device.value.type !== 'camera') {
    hasError.value = true
    errorMessage.value = 'Selected device is not a camera'
    return
  }
})
</script>

<template>
  <div class="image-analysis">
    <div class="analysis-header">
      <button class="back-button" @click="goToDeviceDetails">← Back to Device</button>
      <h1>{{ device?.name || 'Camera' }} - Image Analysis</h1>
    </div>

    <!-- Error state -->
    <div v-if="hasError" class="error-container">
      <h2>Error</h2>
      <p>{{ errorMessage }}</p>
      <button class="action-button" @click="goToDeviceDetails">Back to Device</button>
    </div>

    <!-- Main content when no error -->
    <div v-else class="analysis-content">
      <!-- Capture controls -->
      <div class="capture-controls">
        <button
          class="capture-button"
          :disabled="isLoading || !device?.isConnected"
          @click="captureNewImage"
        >
          <span v-if="isLoading">
            <span class="button-icon loading"></span>
            Capturing...
          </span>
          <span v-else>
            <span class="button-icon camera"></span>
            Capture Image
          </span>
        </button>

        <div class="device-status">
          <span :class="device?.isConnected ? 'connected' : 'disconnected'">
            {{ device?.isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
      </div>

      <!-- Image workspace -->
      <div class="image-workspace">
        <!-- Left side - Image display -->
        <div class="image-display">
          <h2>Image Preview</h2>

          <div v-if="imageData" class="image-container">
            <img :src="imageData.url" alt="Camera capture" />
            <div class="image-metadata">
              <p>Size: {{ imageData.width }}x{{ imageData.height }}</p>
              <p>Captured: {{ new Date(imageData.timestamp).toLocaleString() }}</p>
            </div>
          </div>

          <div v-else class="empty-image">
            <p>No image available</p>
            <p class="subtext">Use the Capture Image button to take a new image</p>
          </div>
        </div>

        <!-- Right side - Analysis tools -->
        <div class="analysis-tools">
          <div v-if="imageData && !isProcessing" class="tools-container">
            <section class="analysis-section">
              <h2>Histogram</h2>
              <div class="histogram-display">
                <div class="histogram-chart">
                  <div
                    v-for="(value, i) in histogramData"
                    :key="`hist-${i}`"
                    class="histogram-bar"
                    :style="{ height: `${value}%` }"
                  ></div>
                </div>

                <div class="histogram-stats">
                  <div class="stat-item">
                    <span class="stat-label">Min:</span>
                    <span class="stat-value">{{ Math.round(histogramMin) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Max:</span>
                    <span class="stat-value">{{ Math.round(histogramMax) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Mean:</span>
                    <span class="stat-value">{{ Math.round(histogramMean) }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="analysis-section">
              <h2>Image Adjustment</h2>

              <div class="adjustment-row">
                <label class="checkbox-label">
                  <input v-model="autoStretch" type="checkbox" @change="toggleAutoStretch" />
                  Auto Stretch
                </label>
              </div>

              <template v-if="!autoStretch">
                <div class="adjustment-row">
                  <span class="slider-label">Black Point:</span>
                  <input
                    v-model.number="blackPoint"
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    class="adjustment-slider"
                  />
                  <span class="slider-value">{{ blackPoint }}%</span>
                </div>

                <div class="adjustment-row">
                  <span class="slider-label">White Point:</span>
                  <input
                    v-model.number="whitePoint"
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    class="adjustment-slider"
                  />
                  <span class="slider-value">{{ whitePoint }}%</span>
                </div>

                <div class="adjustment-row">
                  <span class="slider-label">Midtone:</span>
                  <input
                    v-model.number="midtonePoint"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    class="adjustment-slider"
                  />
                  <span class="slider-value">{{ midtonePoint }}%</span>
                </div>
              </template>
              <template v-else>
                <div class="adjustment-row auto-stretch-info">
                  <span>Using automatic stretch based on histogram data</span>
                </div>
              </template>
            </section>

            <section class="analysis-section">
              <h2>Actions</h2>
              <div class="action-buttons">
                <button class="secondary-button" :disabled="!imageData" @click="downloadImage">
                  <span class="button-icon download"></span>
                  Download Image
                </button>
              </div>
            </section>
          </div>

          <div v-else-if="isProcessing" class="processing-indicator">
            <div class="loading-spinner"></div>
            <p>Processing image...</p>
          </div>

          <div v-else class="empty-tools">
            <p>Capture an image to see analysis tools</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-analysis {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
}

.analysis-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.analysis-header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--aw-panel-content-color);
}

.back-button {
  padding: 8px 16px;
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.back-button:hover {
  background-color: var(--aw-panel-resize-bg-color);
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 60vh;
  padding: 20px;
}

.error-container h2 {
  color: #f44336;
  margin-bottom: 10px;
}

.error-container p {
  margin-bottom: 20px;
  max-width: 500px;
}

.analysis-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 120px);
}

.capture-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--aw-panel-bg-color);
  padding: 16px;
  border-radius: 8px;
}

.capture-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: var(--aw-panel-action-color, #2196f3);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.capture-button:hover:not(:disabled) {
  background-color: #1976d2;
}

.capture-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
}

.button-icon.loading {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 2px solid #fff;
  animation: spin 1s linear infinite;
}

.button-icon.camera::before {
  content: '📷';
}

.button-icon.download::before {
  content: '⬇️';
}

.device-status {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.device-status .connected {
  color: #4caf50;
  font-weight: bold;
}

.device-status .disconnected {
  color: #f44336;
  font-weight: bold;
}

.image-workspace {
  flex: 1;
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  height: 100%;
}

.image-display,
.analysis-tools {
  background-color: var(--aw-panel-bg-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.image-display h2,
.analysis-tools h2,
section h2 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 1.2rem;
  color: var(--aw-panel-content-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: 8px;
}

.image-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.image-container img {
  max-width: 100%;
  max-height: calc(100% - 50px);
  object-fit: contain;
  margin-bottom: 16px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 8px;
}

.image-metadata {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--aw-panel-content-color);
  opacity: 0.8;
}

.empty-image {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
  text-align: center;
}

.subtext {
  font-size: 0.9rem;
  opacity: 0.7;
}

.tools-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

.analysis-section {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  padding: 16px;
}

.histogram-display {
  height: 200px;
  display: flex;
  flex-direction: column;
}

.histogram-chart {
  flex: 1;
  display: flex;
  align-items: flex-end;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 4px;
  margin-bottom: 10px;
}

.histogram-bar {
  flex: 1;
  background-color: rgba(33, 150, 243, 0.7);
  margin: 0 1px;
  min-height: 1px;
}

.histogram-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  opacity: 0.7;
  font-size: 0.8rem;
}

.stat-value {
  font-weight: bold;
}

.adjustment-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.slider-label {
  width: 90px;
  font-size: 0.9rem;
}

.adjustment-slider {
  flex: 1;
}

.slider-value {
  width: 50px;
  text-align: right;
  font-size: 0.9rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.secondary-button {
  padding: 8px 16px;
  background-color: rgba(33, 150, 243, 0.2);
  color: var(--aw-panel-content-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.secondary-button:hover:not(:disabled) {
  background-color: rgba(33, 150, 243, 0.3);
}

.secondary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.processing-indicator,
.empty-tools {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--aw-panel-action-color, #2196f3);
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .image-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }
}
</style>
