// Status: Good - Part of new panel system // This component handles image display and processing
with advanced features: // - ASCOM Alpaca image format support // - Image stretching and enhancement
// - Histogram generation and display // - Robust stretch handling for outlier rejection // -
Real-time image updates

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import {
  processImageBytes,
  createStretchLUT,
  generateDisplayImage,
  calculateHistogram as calculateLibHistogram
} from '@/lib/ASCOMImageBytes'
import type { ProcessedImageData } from '@/lib/ASCOMImageBytes'
import Icon from '@/components/ui/Icon.vue' // Import the Icon component

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

// Full-screen state
const isFullScreen = ref(false)
const fullScreenImageSrc = ref('')

// Store processed image data
const processedImage = ref<ProcessedImageData | null>(null)

// 1. Create a reactive ref for the current theme
const currentThemeRef = ref<'light' | 'dark'>('light')

// Function to update the current theme based on document.documentElement class
const updateThemeRef = () => {
  const isDark = document.documentElement.classList.contains('dark-theme');
  currentThemeRef.value = isDark ? 'dark' : 'light';
  // console.log(`[THEME] updateThemeRef: documentElement.classList has 'dark-theme'=${isDark}. currentThemeRef set to: ${currentThemeRef.value}`); // COMMENTED OUT
}

let themeObserver: MutationObserver | null = null

// Draw the image on canvas
const drawImage = async () => {
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

  // If full screen is active, update its source too
  if (isFullScreen.value) {
    await nextTick() // Ensure canvas has rendered
    if (canvasRef.value) {
      fullScreenImageSrc.value = canvasRef.value.toDataURL('image/png')
    }
  }
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
  if (props.imageData.byteLength === 0) {
    histogram.value = []; // Clear histogram data
    // If canvas exists, clear it
    if (histogramCanvas.value) {
      const canvas = histogramCanvas.value;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    return [];
  }

  // Process the image if not already done
  if (!processedImage.value) {
    processedImage.value = processImageBytes(props.imageData, props.width, props.height);
  }

  // Verify we have valid data
  if (!processedImage.value || processedImage.value.pixelData.length === 0) {
    console.error('No valid image data for histogram calculation');
    histogram.value = []; // Clear histogram data
    if (histogramCanvas.value) {
      const canvas = histogramCanvas.value;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    return [];
  }

  const imageWidth = processedImage.value.width;
  const imageHeight = processedImage.value.height;

  // Calculate range for histogram
  let min = autoStretch.value ? processedImage.value.minPixelValue : minPixelValue.value;
  let max = autoStretch.value ? processedImage.value.maxPixelValue : maxPixelValue.value;

  // Apply robust stretch if enabled
  if (autoStretch.value && useRobustStretch.value) {
    const robustValues = calculateRobustPercentiles(
      processedImage.value.pixelData,
      imageWidth,
      imageHeight,
      robustPercentile.value
    );

    if (robustValues.max > robustValues.min) {
      min = robustValues.min;
      max = robustValues.max;
    }
  }

  // Store min/max for stretching and UI
  if (autoStretch.value) {
    minPixelValue.value = min;
    maxPixelValue.value = max;
  }

  // Use library function to calculate histogram efficiently
  const hist = calculateLibHistogram(
    processedImage.value.pixelData,
    imageWidth,
    imageHeight,
    min,
    max,
    256
  );

  histogram.value = hist; 
  emit('histogram-generated', hist);

  if (hist.length > 0) {
    nextTick(() => {
      if (histogramCanvas.value) { 
        drawHistogram(hist);
      } else {
        console.warn('[Histogram] drawHistogram skipped: histogramCanvas ref not available even after nextTick.');
      }
    });
  }
  
  return hist;
};

// Draw the histogram on canvas
const drawHistogram = (histData: number[]) => {
  if (!histogramCanvas.value || histData.length === 0) { 
    return;
  }

  const canvas = histogramCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('[Histogram] No canvas context.');
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const maxCount = Math.max(...histData);
  if (maxCount === 0) {
    return;
  }

  let barColor = '#CCCCCC'; // Fallback if theme variable fails

  if (canvas && typeof getComputedStyle === 'function') {
    try {
      const computedThemeColor = getComputedStyle(canvas).getPropertyValue('--aw-primary-color').trim();
      if (computedThemeColor) {
        barColor = computedThemeColor;
      } else {
        console.warn('[Histogram] CSS variable --aw-primary-color is empty or not found. Using #CCCCCC fallback.');
      }
    } catch (e) {
      console.warn('[Histogram] Error accessing CSS variable --aw-primary-color. Using #CCCCCC fallback.', e);
    }
  } else {
    // This case is highly unlikely in modern browsers
    console.warn('[Histogram] getComputedStyle not available. Using #CCCCCC fallback.');
  }
  
  ctx.fillStyle = barColor;
  ctx.globalAlpha = 1.0; 

  const barWidth = canvas.width / histData.length; // This is the total space per bar (bar + potential gap)

  for (let i = 0; i < histData.length; i++) {
    const barHeight = (histData[i] / maxCount) * canvas.height;
    
    let drawnBarActualWidth;
    if (barWidth >= 2.0) { // If total space is 2px or more, make a 1px gap
        drawnBarActualWidth = Math.floor(barWidth) - 1;
    } else if (barWidth >= 1.0) { // If total space is between 1px and 2px (exclusive of 2px), draw a 1px bar
        drawnBarActualWidth = 1.0;
    } else { // If total space is less than 1px, draw the fractional width (browser will anti-alias)
        drawnBarActualWidth = barWidth;
    }
    // Ensure we draw at least something visible if calculations result in very small/zero width
    const finalDrawWidth = Math.max(0.5, drawnBarActualWidth); 

    ctx.fillRect(i * barWidth, canvas.height - barHeight, finalDrawWidth, barHeight); 
  }
};

// Apply stretch settings and redraw
const applyStretch = () => {
  calculateHistogram()
  drawImage() // drawImage will now also update fullScreenImageSrc if active
}

// Toggle full-screen mode
const toggleFullScreen = async () => {
  isFullScreen.value = !isFullScreen.value
  if (isFullScreen.value) {
    await nextTick() // Ensure canvas is available and drawn
    if (canvasRef.value) {
      fullScreenImageSrc.value = canvasRef.value.toDataURL('image/png')
    }
  } else {
    fullScreenImageSrc.value = '' // Clear src when closing
  }
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

// 4. Add currentThemeRef to the watch dependencies for applyStretch
watch(
  () => [
    stretchMethod.value,
    minPixelValue.value,
    maxPixelValue.value,
    autoStretch.value,
    useRobustStretch.value,
    robustPercentile.value,
    currentThemeRef.value
  ],
  () => {
    applyStretch();
  },
  { immediate: false }
)

// Initialize on mount
onMounted(() => {
  // 2. Set initial theme and observe document.documentElement for class changes
  updateThemeRef() // Set initial theme

  themeObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // console.log('[THEME] MutationObserver detected class attribute change on document.documentElement.'); // COMMENTED OUT
        updateThemeRef()
      }
    }
  })
  themeObserver.observe(document.documentElement, { attributes: true })

  if (props.imageData.byteLength > 0) {
    calculateHistogram()
    drawImage()
  }
})

// 3. Clean up observer
onBeforeUnmount(() => {
  if (themeObserver) {
    themeObserver.disconnect()
  }
})
</script>

<template>
  <div class="aw-camera-image-display">
    <div ref="imageContainerRef" class="image-container">
      <canvas ref="canvasRef" class="image-canvas"></canvas>
      <button v-if="props.imageData.byteLength > 0" class="fullscreen-button" title="View Full Screen" @click="toggleFullScreen">
        <Icon type="search" size="18" /> <!-- Using search icon & reduced size -->
      </button>
    </div>
    <div v-if="props.imageData.byteLength > 0" class="controls">
      <div class="control-group">
        <label for="stretch-method">Stretch:</label>
        <select id="stretch-method" v-model="stretchMethod" @change="applyStretch">
          <option value="none">None</option>
          <option value="linear">Linear</option>
          <option value="log">Logarithmic</option>
        </select>
      </div>
      <div class="control-group">
        <label for="auto-stretch">Auto Stretch:</label>
        <input id="auto-stretch" v-model="autoStretch" type="checkbox" @change="applyStretch">
      </div>
      <div v-if="!autoStretch" class="control-group">
        <label for="min-pixel">Min:</label>
        <input id="min-pixel" v-model.number="minPixelValue" type="number" @change="applyStretch">
        <label for="max-pixel">Max:</label>
        <input id="max-pixel" v-model.number="maxPixelValue" type="number" @change="applyStretch">
      </div>
      <div class="control-group">
        <label for="robust-stretch">Robust Stretch:</label>
        <input id="robust-stretch" v-model="useRobustStretch" type="checkbox" @change="applyStretch">
      </div>
      <div v-if="useRobustStretch" class="control-group">
        <label for="robust-percentile">Percentile:</label>
        <input id="robust-percentile" v-model.number="robustPercentile" type="number" min="80" max="100" @change="applyStretch">
      </div>
    </div>
    <div v-if="props.imageData.byteLength > 0 && histogram.length > 0" class="histogram-container">
      <canvas ref="histogramCanvas" class="histogram-canvas"></canvas>
    </div>
    <div v-if="props.imageData.byteLength === 0" class="no-image-message">
      No image data to display.
    </div>

    <!-- Full Screen Modal -->
    <div v-if="isFullScreen" class="fullscreen-modal" @click.self="toggleFullScreen">
      <img :src="fullScreenImageSrc" alt="Full screen image" class="fullscreen-modal-image" />
      <button class="close-fullscreen-button" @click="toggleFullScreen">
        <Icon type="close" /> <!-- Assuming 'close' is available -->
      </button>
    </div>
  </div>
</template>

<style scoped>
.aw-camera-image-display {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-sm);
  padding: var(--aw-spacing-sm);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  background-color: var(--aw-panel-content-bg-color);
  /* Ensure it doesn't grow indefinitely */
  max-width: 100%;
  overflow: hidden; /* Contain child elements */
  position: relative; /* For positioning the fullscreen button and modal */
}

.image-container {
  width: 100%;
  /* Define a max-height for the image container. 
     Adjust this value as needed for your layout. 
     Using aspect-ratio can also be a good alternative if you want to maintain a specific shape. */
  max-height: 400px; /* Example: Max height of 400px */
  display: flex; /* For centering canvas if it's smaller than container */
  justify-content: center;
  align-items: center;
  background-color: var(--aw-color-neutral-100, #f0f0f0); /* Background for the image area */
  border-radius: var(--aw-border-radius-sm);
  overflow: hidden; /* Important if canvas tries to overflow */
  position: relative; /* For positioning the fullscreen button */
}

.image-canvas {
  display: block; /* Removes extra space below canvas */
  max-width: 100%;
  max-height: 100%; /* Canvas should not exceed the container's max-height */
  object-fit: contain; /* Ensures aspect ratio is maintained within bounds */
  background-color: black; /* Default background for the image itself */
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-md);
  padding: var(--aw-spacing-xs) 0;
  border-top: 1px solid var(--aw-panel-border-color);
  border-bottom: 1px solid var(--aw-panel-border-color);
  margin-top: var(--aw-spacing-sm);
  padding-top: var(--aw-spacing-sm);
  padding-bottom: var(--aw-spacing-sm);
}

.control-group {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
}

.control-group label {
  font-size: 0.85rem;
  color: var(--aw-text-secondary-color);
}

.control-group select,
.control-group input[type="number"],
.control-group input[type="checkbox"] {
  padding: var(--aw-spacing-xxs);
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  background-color: var(--aw-input-bg-color);
  color: var(--aw-text-color);
  font-size: 0.85rem;
}

.control-group input[type="number"] {
  width: 60px;
}

.histogram-container {
  width: 100%;
  height: 100px; /* Fixed height for histogram */
  padding-top: var(--aw-spacing-sm);
}

.histogram-canvas {
  width: 100%;
  height: 100%;
}

.no-image-message {
  text-align: center;
  padding: var(--aw-spacing-lg);
  color: var(--aw-text-secondary-color);
  font-style: italic;
  min-height: 100px; /* Ensure it takes some space */
  display: flex;
  justify-content: center;
  align-items: center;
}

.fullscreen-button {
  position: absolute;
  top: var(--aw-spacing-xs);
  right: var(--aw-spacing-xs);
  background-color: rgba(0, 0, 0, 0.4);
  color: white;
  border: none;
  border-radius: var(--aw-border-radius-sm);
  /* padding: var(--aw-spacing-xs) var(--aw-spacing-sm); */ /* Adjusted padding for icon-only */
  padding: var(--aw-spacing-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center; /* Center the icon */
  /* gap: var(--aw-spacing-xs); */ /* No gap needed for single icon */
  z-index: 10;
  width: calc(18px + 2 * var(--aw-spacing-xs)); /* Adjust width to content */
  height: calc(18px + 2 * var(--aw-spacing-xs)); /* Adjust height to content */
  line-height: 1;
}

.fullscreen-button:hover {
  background-color: rgba(0, 0, 0, 0.6);
}

/* .fullscreen-button .icon { */ /* Size is now passed as a prop to Icon component */
  /* font-size: 1rem; */ /* Adjust as needed */
/* } */

/* Full Screen Modal Styles */
.fullscreen-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Ensure it's on top of everything */
  padding: var(--aw-spacing-lg); /* Add some padding around the image */
  box-sizing: border-box;
}

.fullscreen-modal-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* Preserve aspect ratio */
  border-radius: var(--aw-border-radius-md); /* Optional: rounded corners for the image */
  box-shadow: 0 0 30px rgba(0,0,0,0.5); /* Optional: some shadow */
}

.close-fullscreen-button {
  position: absolute;
  top: var(--aw-spacing-md);
  right: var(--aw-spacing-md);
  background: none;
  border: none;
  color: white;
  font-size: 1.8rem; /* Make close icon larger */
  cursor: pointer;
  padding: var(--aw-spacing-sm);
  line-height: 1;
}

.close-fullscreen-button:hover {
  color: var(--aw-color-neutral-300, #ccc);
}
</style>
