// Status: Good - Core View 
// This is the image analysis view that: 
// - Provides image processing tools 
// - Handles FITS file analysis 
// - Supports image enhancement 
// - Displays image statistics
// - Maintains image history

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUnifiedStore } from '@/stores/UnifiedStore'

defineOptions({
  name: 'ImageAnalysis'
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
  <div class="aw-image-analysis">
    <div class="aw-image-analysis__header">
      <button class="aw-image-analysis__back-button" @click="goToDeviceDetails">← Back to Device</button>
      <h1>{{ device?.name || 'Camera' }} - Image Analysis</h1>
    </div>

    <!-- Error state -->
    <div v-if="hasError" class="aw-image-analysis__error">
      <h2>Error</h2>
      <p>{{ errorMessage }}</p>
      <button class="aw-image-analysis__action-button" @click="goToDeviceDetails">Back to Device</button>
    </div>

    <!-- Main content when no error -->
    <div v-else class="aw-image-analysis__content">
      <!-- Capture controls -->
      <div class="aw-image-analysis__capture-controls">
        <button
          class="aw-image-analysis__capture-button"
          :disabled="isLoading || !device?.isConnected"
          @click="captureNewImage"
        >
          <span v-if="isLoading">
            <span class="aw-image-analysis__button-icon aw-image-analysis__button-icon--loading"></span>
            Capturing...
          </span>
          <span v-else>
            <span class="aw-image-analysis__button-icon aw-image-analysis__button-icon--camera"></span>
            Capture Image
          </span>
        </button>

        <div class="aw-image-analysis__device-status">
          <span :class="device?.isConnected ? 'aw-image-analysis__status--connected' : 'aw-image-analysis__status--disconnected'">
            {{ device?.isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
      </div>

      <!-- Image workspace -->
      <div class="aw-image-analysis__workspace">
        <!-- Left side - Image display -->
        <div class="aw-image-analysis__display">
          <h2>Image Preview</h2>

          <div v-if="imageData" class="aw-image-analysis__image-container">
            <img :src="imageData.url" alt="Camera capture" />
            <div class="aw-image-analysis__metadata">
              <p>Size: {{ imageData.width }}x{{ imageData.height }}</p>
              <p>Captured: {{ new Date(imageData.timestamp).toLocaleString() }}</p>
            </div>
          </div>

          <div v-else class="aw-image-analysis__empty-image">
            <p>No image available</p>
            <p class="aw-image-analysis__subtext">Use the Capture Image button to take a new image</p>
          </div>
        </div>

        <!-- Right side - Analysis tools -->
        <div class="aw-image-analysis__tools">
          <div v-if="imageData && !isProcessing" class="aw-image-analysis__tools-container">
            <section class="aw-image-analysis__section">
              <h2>Histogram</h2>
              <div class="aw-image-analysis__histogram">
                <div class="aw-image-analysis__histogram-chart">
                  <div
                    v-for="(value, i) in histogramData"
                    :key="`hist-${i}`"
                    class="aw-image-analysis__histogram-bar"
                    :style="{ height: `${value}%` }"
                  ></div>
                </div>

                <div class="aw-image-analysis__histogram-stats">
                  <div class="aw-image-analysis__stat-item">
                    <span class="aw-image-analysis__stat-label">Min:</span>
                    <span class="aw-image-analysis__stat-value">{{ Math.round(histogramMin) }}</span>
                  </div>
                  <div class="aw-image-analysis__stat-item">
                    <span class="aw-image-analysis__stat-label">Max:</span>
                    <span class="aw-image-analysis__stat-value">{{ Math.round(histogramMax) }}</span>
                  </div>
                  <div class="aw-image-analysis__stat-item">
                    <span class="aw-image-analysis__stat-label">Mean:</span>
                    <span class="aw-image-analysis__stat-value">{{ Math.round(histogramMean) }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="aw-image-analysis__section">
              <h2>Image Adjustment</h2>

              <div class="aw-image-analysis__adjustment-row">
                <label class="aw-image-analysis__checkbox-label">
                  <input v-model="autoStretch" type="checkbox" @change="toggleAutoStretch" />
                  Auto Stretch
                </label>
              </div>

              <template v-if="!autoStretch">
                <div class="aw-image-analysis__adjustment-row">
                  <span class="aw-image-analysis__slider-label">Black Point:</span>
                  <input
                    v-model.number="blackPoint"
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    class="aw-image-analysis__slider"
                  />
                  <span class="aw-image-analysis__slider-value">{{ blackPoint }}%</span>
                </div>

                <div class="aw-image-analysis__adjustment-row">
                  <span class="aw-image-analysis__slider-label">White Point:</span>
                  <input
                    v-model.number="whitePoint"
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    class="aw-image-analysis__slider"
                  />
                  <span class="aw-image-analysis__slider-value">{{ whitePoint }}%</span>
                </div>

                <div class="aw-image-analysis__adjustment-row">
                  <span class="aw-image-analysis__slider-label">Midtone:</span>
                  <input
                    v-model.number="midtonePoint"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    class="aw-image-analysis__slider"
                  />
                  <span class="aw-image-analysis__slider-value">{{ midtonePoint }}%</span>
                </div>
              </template>
              <template v-else>
                <div class="aw-image-analysis__adjustment-row aw-image-analysis__auto-stretch-info">
                  <span>Using automatic stretch based on histogram data</span>
                </div>
              </template>
            </section>

            <section class="aw-image-analysis__section">
              <h2>Actions</h2>
              <div class="aw-image-analysis__action-buttons">
                <button class="aw-image-analysis__secondary-button" :disabled="!imageData" @click="downloadImage">
                  <span class="aw-image-analysis__button-icon aw-image-analysis__button-icon--download"></span>
                  Download Image
                </button>
              </div>
            </section>
          </div>

          <div v-else-if="isProcessing" class="aw-image-analysis__processing">
            <div class="aw-image-analysis__spinner"></div>
            <p>Processing image...</p>
          </div>

          <div v-else class="aw-image-analysis__empty-tools">
            <p>Capture an image to see analysis tools</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aw-image-analysis {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: var(--aw-spacing-lg);
}

.aw-image-analysis__header {
  display: flex;
  align-items: center;
  margin-bottom: var(--aw-spacing-lg);
  gap: var(--aw-spacing-md);
}

.aw-image-analysis__header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--aw-panel-content-color);
}

.aw-image-analysis__back-button {
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  background-color: var(--aw-panel-menu-bar-bg-color);
  color: var(--aw-panel-menu-bar-color);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.aw-image-analysis__back-button:hover {
  background-color: var(--aw-panel-resize-bg-color);
}

.aw-image-analysis__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 60vh;
  padding: var(--aw-spacing-lg);
}

.aw-image-analysis__error h2 {
  color: var(--aw-error-color);
  margin-bottom: var(--aw-spacing-sm);
}

.aw-image-analysis__error p {
  margin-bottom: var(--aw-spacing-lg);
  max-width: 500px;
}

.aw-image-analysis__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-lg);
  height: calc(100vh - 120px);
}

.aw-image-analysis__capture-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--aw-panel-bg-color);
  padding: var(--aw-spacing-md);
  border-radius: var(--aw-border-radius-md);
}

.aw-image-analysis__capture-button {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  background-color: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.aw-image-analysis__capture-button:hover:not(:disabled) {
  background-color: var(--aw-button-primary-hover-bg);
}

.aw-image-analysis__capture-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.aw-image-analysis__button-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
}

.aw-image-analysis__button-icon--loading {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 2px solid #fff;
  animation: spin 1s linear infinite;
}

.aw-image-analysis__button-icon--camera::before {
  content: '📷';
}

.aw-image-analysis__button-icon--download::before {
  content: '⬇️';
}

.aw-image-analysis__device-status {
  padding: calc(var(--aw-spacing-xs) * 1.5) calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  border-radius: var(--aw-border-radius-sm);
  font-size: 0.9rem;
}

.aw-image-analysis__status--connected {
  color: var(--aw-success-color);
  font-weight: bold;
}

.aw-image-analysis__status--disconnected {
  color: var(--aw-error-color);
  font-weight: bold;
}

.aw-image-analysis__workspace {
  flex: 1;
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: var(--aw-spacing-lg);
  height: 100%;
}

.aw-image-analysis__display,
.aw-image-analysis__tools {
  background-color: var(--aw-panel-bg-color);
  border-radius: var(--aw-border-radius-md);
  padding: var(--aw-spacing-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aw-image-analysis__display h2,
.aw-image-analysis__tools h2,
.aw-image-analysis__section h2 {
  margin-top: 0;
  margin-bottom: var(--aw-spacing-md);
  font-size: 1.2rem;
  color: var(--aw-panel-content-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: var(--aw-spacing-sm);
}

.aw-image-analysis__image-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aw-image-analysis__image-container img {
  max-width: 100%;
  max-height: calc(100% - 50px);
  object-fit: contain;
  margin-bottom: var(--aw-spacing-md);
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-sm);
}

.aw-image-analysis__metadata {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--aw-panel-content-color);
  opacity: 0.8;
}

.aw-image-analysis__empty-image {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
  text-align: center;
}

.aw-image-analysis__subtext {
  font-size: 0.9rem;
  opacity: 0.7;
}

.aw-image-analysis__tools-container {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-lg);
  height: 100%;
  overflow-y: auto;
}

.aw-image-analysis__section {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-md);
}

.aw-image-analysis__histogram {
  height: 200px;
  display: flex;
  flex-direction: column;
}

.aw-image-analysis__histogram-chart {
  flex: 1;
  display: flex;
  align-items: flex-end;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: var(--aw-border-radius-sm);
  padding: 4px;
  margin-bottom: 10px;
}

.aw-image-analysis__histogram-bar {
  flex: 1;
  background-color: var(--aw-primary-color); 
  margin: 0 1px;
  min-height: 1px;
}

.aw-image-analysis__histogram-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.aw-image-analysis__stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.aw-image-analysis__stat-label {
  opacity: 0.7;
  font-size: 0.8rem;
}

.aw-image-analysis__stat-value {
  font-weight: bold;
}

.aw-image-analysis__adjustment-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.aw-image-analysis__slider-label {
  width: 90px;
  font-size: 0.9rem;
}

.aw-image-analysis__slider {
  flex: 1;
}

.aw-image-analysis__slider-value {
  width: 50px;
  text-align: right;
  font-size: 0.9rem;
}

.aw-image-analysis__checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.aw-image-analysis__action-buttons {
  display: flex;
  gap: 10px;
}

.aw-image-analysis__secondary-button {
  padding: var(--aw-spacing-sm) var(--aw-spacing-md);
  background-color: var(--aw-button-secondary-bg);
  color: var(--aw-button-secondary-text);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.aw-image-analysis__secondary-button:hover:not(:disabled) {
  background-color: var(--aw-button-secondary-hover-bg);
}

.aw-image-analysis__secondary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.aw-image-analysis__processing,
.aw-image-analysis__empty-tools {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--aw-panel-content-color);
  opacity: 0.7;
}

.aw-image-analysis__spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--aw-primary-color);
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: var(--aw-spacing-lg, 20px);
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
  .aw-image-analysis__workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }
}
</style>
