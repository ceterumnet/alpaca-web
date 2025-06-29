<script setup lang="ts">
import log from '@/plugins/logger'
import { ref, watch } from 'vue'
import CameraExposureControl from './features/CameraExposureControl.vue'
import CameraImageDisplay from './features/CameraImageDisplay.vue'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  exposureMin: {
    type: Number,
    required: true
  },
  exposureMax: {
    type: Number,
    required: true
  }
})

// State
const imageData = ref<ArrayBuffer>(new ArrayBuffer(0))
const exposureInProgress = ref(false)

// Handlers for exposure control events
const handleExposureStarted = (params: { duration: number; isLight: boolean }) => {
  exposureInProgress.value = true
  log.debug({ deviceIds: [props.deviceId] }, `Exposure started: ${params.duration}s, Light: ${params.isLight}`)
}

const handleExposureComplete = () => {
  exposureInProgress.value = false
  log.debug({ deviceIds: [props.deviceId] }, 'Exposure complete')
}

const handleImageDownloaded = (data: ArrayBuffer) => {
  imageData.value = data
  log.debug({ deviceIds: [props.deviceId] }, `Image downloaded: ${data.byteLength} bytes`)
}

const handleError = (error: string) => {
  log.error({ deviceIds: [props.deviceId] }, 'Camera error:', error)
}

// Handle histogram generation
const handleHistogramGenerated = (histogram: number[]) => {
  log.debug({ deviceIds: [props.deviceId] }, 'Histogram generated with', histogram.length, 'bins')
}

// Reset state when device changes
watch(
  () => props.deviceId,
  () => {
    imageData.value = new ArrayBuffer(0)
    exposureInProgress.value = false
  }
)
</script>

<template>
  <div class="aw-camera-controls">
    <div class="aw-camera-controls__exposure-section">
      <CameraExposureControl
        :device-id="deviceId"
        :exposure-min="exposureMin"
        :exposure-max="exposureMax"
        @exposure-started="handleExposureStarted"
        @exposure-complete="handleExposureComplete"
        @image-downloaded="handleImageDownloaded"
        @error="handleError"
      />
    </div>

    <div class="aw-camera-controls__image-section">
      <CameraImageDisplay :image-data="imageData" @histogram-generated="handleHistogramGenerated" />
    </div>
  </div>
</template>

<style scoped>
.aw-camera-controls {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-md);

  /* padding: 0; */
  width: 100%;
}

.aw-camera-controls__exposure-section {
  width: 100%;
}

.aw-camera-controls__image-section {
  width: 100%;
}
</style>
