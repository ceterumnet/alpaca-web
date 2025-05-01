// Status: Good - Part of new panel system // This component handles image display and processing
with advanced features: // - ASCOM Alpaca image format support // - Image stretching and enhancement
// - Histogram generation and display // - Robust stretch handling for outlier rejection // -
Real-time image updates

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  processImageBytes,
  createStretchLUT,
  generateDisplayImage,
  calculateHistogram as calculateLibHistogram
} from '@/lib/ASCOMImageBytes'
import type { ProcessedImageData } from '@/lib/ASCOMImageBytes'

const props = defineProps({
  imageData: {
    type: Object as () => ArrayBuffer,
    default: () => new ArrayBuffer(0)
  },
  width: {
    type: Number,
    default: 0
  },
  height: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['histogram-generated'])

// State
const canvasRef = ref<HTMLCanvasElement | null>(null)
const histogramCanvas = ref<HTMLCanvasElement | null>(null)
const histogram = ref<number[]>([])
const minPixelValue = ref(0)
const maxPixelValue = ref(255)
const stretchMethod = ref<'none' | 'linear' | 'log'>('linear')
const autoStretch = ref(true)
// Add robust stretch settings to avoid outliers making everything black
const useRobustStretch = ref(true)
const robustPercentile = ref(98) // Exclude top 2% of pixels as outliers

// Store processed image data
const processedImage = ref<ProcessedImageData | null>(null)

// Draw the image on canvas
const drawImage = () => {
  if (!canvasRef.value || props.imageData.byteLength === 0) {
    return
  }

  // Process the image if not already done
  if (!processedImage.value) {
    processedImage.value = processImageBytes(props.imageData, props.width, props.height)
  }

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Set canvas dimensions to match image
  const imageWidth = processedImage.value.width
  const imageHeight = processedImage.value.height

  if (!imageWidth || !imageHeight) {
    console.warn('Invalid image dimensions:', imageWidth, 'x', imageHeight)
    return
  }

  canvas.width = imageWidth
  canvas.height = imageHeight

  // Create a lookup table for efficient conversion
  let min = autoStretch.value ? processedImage.value.minPixelValue : minPixelValue.value
  let max = autoStretch.value ? processedImage.value.maxPixelValue : maxPixelValue.value

  // Apply robust stretch if enabled
  if (autoStretch.value && useRobustStretch.value && processedImage.value.pixelData.length > 100) {
    const robustValues = calculateRobustPercentiles(
      processedImage.value.pixelData,
      processedImage.value.width,
      processedImage.value.height,
      robustPercentile.value
    )

    if (robustValues.max > robustValues.min) {
      min = robustValues.min
      max = robustValues.max
      console.log(`Applied robust stretch: min=${min}, max=${max}`)
    }
  }

  // Store min/max for user interface
  minPixelValue.value = min
  maxPixelValue.value = max

  // Create an efficient lookup table for the stretch method
  const lut = createStretchLUT(min, max, stretchMethod.value, processedImage.value.bitsPerPixel)

  // Generate display image data efficiently
  const imageData = generateDisplayImage(
    processedImage.value.pixelData,
    imageWidth,
    imageHeight,
    lut
  )

  // Create ImageData object for canvas
  const imgData = new ImageData(imageData, imageWidth, imageHeight)

  // Put the image data to canvas
  ctx.putImageData(imgData, 0, 0)
}

// Calculate robust percentiles for stretch
const calculateRobustPercentiles = (
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  width: number,
  height: number,
  upperPercentile: number = 98
) => {
  // Sample values for percentile calculation
  const validValues = []
  const pixelCount = width * height
  const sampleStep = Math.max(1, Math.floor(Math.sqrt(pixelCount / 10)))

  // Sample using column-major order (ASCOM format)
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const idx = x * height + y
      if (idx < data.length) {
        const pixel = Number(data[idx])
        if (isFinite(pixel) && !isNaN(pixel)) {
          validValues.push(pixel)
        }
      }
    }
  }

  if (validValues.length === 0) {
    return { min: 0, max: 65535 }
  }

  // Sort values for percentile calculation
  validValues.sort((a, b) => a - b)

  // Use lower percentile for min (1st percentile to ignore extreme dark pixels)
  const lowerIndex = Math.floor(validValues.length * 0.01)

  // Use robust percentile for max (to exclude extreme bright pixels)
  const upperIndex = Math.min(
    validValues.length - 1,
    Math.floor(validValues.length * (upperPercentile / 100))
  )

  // Get the values at these percentiles
  return {
    min: validValues[lowerIndex],
    max: validValues[upperIndex]
  }
}

// Calculate histogram from the image data
const calculateHistogram = () => {
  if (props.imageData.byteLength === 0) return []

  // Process the image if not already done
  if (!processedImage.value) {
    processedImage.value = processImageBytes(props.imageData, props.width, props.height)
  }

  // Verify we have valid data
  if (!processedImage.value || processedImage.value.pixelData.length === 0) {
    console.error('No valid image data for histogram calculation')
    return []
  }

  const imageWidth = processedImage.value.width
  const imageHeight = processedImage.value.height

  // Calculate range for histogram
  let min = autoStretch.value ? processedImage.value.minPixelValue : minPixelValue.value
  let max = autoStretch.value ? processedImage.value.maxPixelValue : maxPixelValue.value

  // Apply robust stretch if enabled
  if (autoStretch.value && useRobustStretch.value) {
    const robustValues = calculateRobustPercentiles(
      processedImage.value.pixelData,
      imageWidth,
      imageHeight,
      robustPercentile.value
    )

    if (robustValues.max > robustValues.min) {
      min = robustValues.min
      max = robustValues.max
    }
  }

  // Store min/max for stretching and UI
  if (autoStretch.value) {
    minPixelValue.value = min
    maxPixelValue.value = max
  }

  // Use library function to calculate histogram efficiently
  const hist = calculateLibHistogram(
    processedImage.value.pixelData,
    imageWidth,
    imageHeight,
    min,
    max,
    256
  )

  // Draw the histogram
  drawHistogram(hist)

  histogram.value = hist
  emit('histogram-generated', hist)
  return hist
}

// Draw the histogram on canvas
const drawHistogram = (histData: number[]) => {
  if (!histogramCanvas.value || histData.length === 0) return

  const canvas = histogramCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Find the maximum value for scaling
  const maxCount = Math.max(...histData)
  if (maxCount === 0) return

  // Set drawing style
  ctx.fillStyle = 'rgba(0, 120, 212, 0.8)'

  // Calculate bar width
  const barWidth = canvas.width / histData.length

  // Draw histogram bars
  for (let i = 0; i < histData.length; i++) {
    const barHeight = (histData[i] / maxCount) * canvas.height
    ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight)
  }
}

// Apply stretch settings and redraw
const applyStretch = () => {
  calculateHistogram()
  drawImage()
}

// Reset processed image when props change
watch(
  () => props.imageData,
  (newValue) => {
    if (newValue.byteLength > 0) {
      // Clear cached data and reprocess
      processedImage.value = null
      calculateHistogram()
      drawImage()
    }
  }
)

watch(
  () => [
    stretchMethod.value,
    minPixelValue.value,
    maxPixelValue.value,
    autoStretch.value,
    useRobustStretch.value,
    robustPercentile.value
  ],
  () => {
    applyStretch()
  }
)

// Initialize on mount
onMounted(() => {
  if (props.imageData.byteLength > 0) {
    calculateHistogram()
    drawImage()
  }
})
</script>

<template>
  <div class="camera-image-display">
    <div class="image-container">
      <canvas ref="canvasRef" class="image-canvas"></canvas>
      <div v-if="props.imageData.byteLength === 0" class="no-image">No image available</div>
    </div>

    <div class="image-controls">
      <div class="stretch-controls">
        <label>Stretch Method:</label>
        <select v-model="stretchMethod">
          <option value="none">None</option>
          <option value="linear">Linear</option>
          <option value="log">Logarithmic</option>
        </select>

        <div v-if="stretchMethod !== 'none'" class="range-controls">
          <div class="auto-stretch">
            <input id="auto-stretch" v-model="autoStretch" type="checkbox" />
            <label for="auto-stretch">Auto Stretch</label>
          </div>

          <!-- Add robust stretch option -->
          <div v-if="autoStretch" class="auto-stretch">
            <input id="robust-stretch" v-model="useRobustStretch" type="checkbox" />
            <label for="robust-stretch">Robust Stretch</label>

            <div v-if="useRobustStretch" class="slider-group">
              <label>Percentile:</label>
              <input v-model.number="robustPercentile" type="range" :min="50" :max="100" step="1" />
              <span>{{ robustPercentile }}%</span>
            </div>
          </div>

          <div v-if="!autoStretch" class="slider-group">
            <label>Min:</label>
            <input v-model.number="minPixelValue" type="range" :min="0" :max="65535" />
            <span>{{ minPixelValue }}</span>
          </div>

          <div v-if="!autoStretch" class="slider-group">
            <label>Max:</label>
            <input v-model.number="maxPixelValue" type="range" :min="0" :max="65535" />
            <span>{{ maxPixelValue }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="histogram.length > 0" class="histogram-display">
      <canvas ref="histogramCanvas" class="histogram-canvas"></canvas>
    </div>
  </div>
</template>

<style scoped>
.camera-image-display {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.image-container {
  position: relative;
  width: 100%;
  background-color: #000;
  border-radius: 0.25rem;
  overflow: hidden;
  aspect-ratio: 1 / 1;
}

.image-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.no-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-style: italic;
}

.image-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border-radius: 0.25rem;
}

.stretch-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.range-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.auto-stretch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.slider-group label {
  min-width: 3rem;
}

.slider-group input {
  flex: 1;
}

.slider-group span {
  min-width: 2.5rem;
  text-align: right;
}

.histogram-display {
  width: 100%;
  height: 100px;
  background-color: #f5f5f5;
  border-radius: 0.25rem;
  overflow: hidden;
}

.histogram-canvas {
  width: 100%;
  height: 100%;
}
</style>
