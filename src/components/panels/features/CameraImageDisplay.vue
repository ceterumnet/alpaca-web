// Status: Good - Part of new panel system // This component handles image display and processing
with advanced features: // - ASCOM Alpaca image format support // - Image stretching and enhancement
// - Histogram generation and display // - Robust stretch handling for outlier rejection // -
Real-time image updates

<script setup lang="ts">
import log from '@/plugins/logger'
import { ref, onMounted, watch, nextTick, onBeforeUnmount, computed } from 'vue'
import {
  processImageBytes,
  createStretchLUT,
  generateDisplayImage,
  calculateHistogram as calculateLibHistogram
} from '@/lib/ASCOMImageBytes'
import type { ProcessedImageData, BayerPattern } from '@/lib/ASCOMImageBytes'
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
  },
  sensorType: { // 0: Mono, 1: Color (no bayer), 2: RGGB, 3:CMYG, 4:CMYG2, 5:LRGB, 6: TrueSense Mono (Kodak)
    type: Number,
    default: null // null if unknown or not provided
  },
  detectedBayerPattern: {
    type: String as () => BayerPattern | null,
    default: null
  },
  subframe: {
    type: Object as () => { startX: number, startY: number, numX: number, numY: number } | undefined,
    default: undefined
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

// Debayering state
const enableDebayer = ref(false)
const selectedBayerPattern = ref<BayerPattern>('RGGB')
const bayerPatternOptions = ref<BayerPattern[]>(['RGGB', 'GRBG', 'GBRG', 'BGGR'])
const userHasManuallySelectedPattern = ref(false)
const autoDetectedPatternDisplay = ref<BayerPattern | null>(null)

// Computed property to determine if the sensor is monochrome or unknown
const isMonochromeOrUnknown = computed(() => {
  // SensorType: 0=Mono, 1=Color (no Bayer mosaic), 2=RGGB, 3=CMYG, 4=CMYG2, 5=LRGB (e.g. LRGB filter wheel), 6=TrueSense Mono (Kodak)
  // Consider null (unknown), 0 (Mono), 1 (Color no bayer), and 6 (TrueSense Mono) as non-debayerable for our Bayer patterns.
  return props.sensorType === null || props.sensorType === 0 || props.sensorType === 1 || props.sensorType === 6;
});

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
}

let themeObserver: MutationObserver | null = null

// Draw the image on canvas
const drawImage = async () => {
  // Add detailed logging for received props at the beginning of drawImage
  log.debug({
    imageData: props.imageData,
    width: props.width,
    height: props.height,
    sensorType: props.sensorType,
    subframe: props.subframe
  }, 'CameraImageDisplay: drawImage called. Props:');

  if (!canvasRef.value) {
    log.warn('CameraImageDisplay: drawImage aborted - no canvas.');
    return;
  }

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // If no image data, draw placeholder
  if (props.imageData.byteLength === 0) {
    canvas.width = props.width;
    canvas.height = props.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    // Draw subframe overlay if present
    if (props.subframe && props.subframe.numX > 0 && props.subframe.numY > 0) {
      ctx.save();
      ctx.strokeStyle = '#ff9800';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(
        props.subframe.startX,
        props.subframe.startY,
        props.subframe.numX,
        props.subframe.numY
      );
      ctx.restore();
      console.log('Subframe overlay (placeholder):', props.subframe);
    }
    return;
  }

  if (!processedImage.value) {
    let bayerPatternToUse: BayerPattern | undefined = undefined;
    if (!isMonochromeOrUnknown.value && enableDebayer.value) {
      bayerPatternToUse = selectedBayerPattern.value;
    }
    processedImage.value = processImageBytes(
        props.imageData,
        props.width,
        props.height,
        bayerPatternToUse
      )
  }
  
  if (!processedImage.value) { // Check again in case processing failed
      log.error("Image processing failed in drawImage");
      return;
  }

  const imageWidth = processedImage.value.width;
  const imageHeight = processedImage.value.height;
  console.log('drawImage: imageWidth', imageWidth, 'imageHeight', imageHeight, 'subframe', props.subframe);

  canvas.width = imageWidth;
  canvas.height = imageHeight;

  // Create a lookup table for efficient conversion
  let minToUse = autoStretch.value ? processedImage.value.minPixelValue : minPixelValue.value
  let maxToUse = autoStretch.value ? processedImage.value.maxPixelValue : maxPixelValue.value

  // Apply robust stretch if enabled
  if (autoStretch.value && useRobustStretch.value && processedImage.value.pixelData.length > 100) {
    let dataForRobustCalc: Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | number[] = processedImage.value.pixelData;
    const robustWidth = imageWidth;
    const robustHeight = imageHeight;
    let orderForRobust: 'column-major' | 'row-major' = processedImage.value.isDebayered ? 'row-major' : 'column-major';

    if (processedImage.value.isDebayered && processedImage.value.originalPixelData) {
        // Convert to number[] to simplify type compatibility for calculateRobustPercentiles
        dataForRobustCalc = Array.from(processedImage.value.originalPixelData);
        orderForRobust = 'column-major'; 
    }

    const robustValues = calculateRobustPercentiles(
      dataForRobustCalc, // Use potentially original data
      robustWidth,
      robustHeight,
      robustPercentile.value,
      orderForRobust, // Pass data order
      processedImage.value.isDebayered ? 3 : 1 // Pass channels
    )

    if (robustValues.max > robustValues.min) {
      minToUse = robustValues.min // Use for current rendering
      maxToUse = robustValues.max // Use for current rendering
      log.debug(`Applied robust stretch: min=${minToUse}, max=${maxToUse}`)
      // DO NOT update minPixelValue.value and maxPixelValue.value here if autoStretch is true, as it causes a loop.
      // These refs are for manual control or for reflecting the auto values once, not continuously.
    }
  }

  // Store min/max for user interface only if autoStretch is OFF or if we want to reflect the initial auto-values.
  // To prevent loops, don't update these if autoStretch is on and they are part of a watcher dependency.
  if (!autoStretch.value) {
    minPixelValue.value = minToUse;
    maxPixelValue.value = maxToUse;
  } // Else, they are used directly from processedImage or robust calc for rendering this pass.

  // Create an efficient lookup table for the stretch method
  const lut = createStretchLUT(minToUse, maxToUse, stretchMethod.value, processedImage.value.bitsPerPixel)

  // Generate display image data efficiently
  const imageData = generateDisplayImage(
    processedImage.value.pixelData,
    imageWidth,
    imageHeight,
    lut,
    processedImage.value.channels // Pass channels
  )

  // Create ImageData object for canvas
  const imgData = new ImageData(imageData, imageWidth, imageHeight)

  // Put the image data to canvas
  ctx.putImageData(imgData, 0, 0)

  // Draw subframe overlay if present and valid
  if (props.subframe && props.subframe.numX > 0 && props.subframe.numY > 0 && (props.subframe.numX < imageWidth || props.subframe.numY < imageHeight)) {
    ctx.save();
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(
      props.subframe.startX,
      props.subframe.startY,
      props.subframe.numX,
      props.subframe.numY
    );
    ctx.restore();
    console.log('Subframe overlay:', props.subframe);
  }

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
  data: Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | number[],
  width: number,
  height: number,
  upperPercentile: number = 98,
  order: 'column-major' | 'row-major' = 'column-major', // New parameter for data order
  channels: 1 | 3 = 1 // New parameter for channels
) => {
  // Sample values for percentile calculation
  const validValues = []
  const pixelCount = width * height
  const sampleStep = Math.max(1, Math.floor(Math.sqrt(pixelCount / 10))) // Reduced sample size for perf

  if (channels === 1) {
    // Monochrome data processing
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = order === 'column-major' ? x * height + y : y * width + x;
        if (idx < data.length) {
          const pixel = Number(data[idx])
          if (isFinite(pixel) && !isNaN(pixel)) {
            validValues.push(pixel)
          }
        }
      }
    }
  } else { // RGB data, calculate based on luminance
      for (let y = 0; y < height; y += sampleStep) {
        for (let x = 0; x < width; x += sampleStep) {
            // Assuming RGB data is row-major [R,G,B,R,G,B...] if channels === 3
            const baseIdx = (y * width + x) * 3; 
            if (baseIdx + 2 < data.length) {
                const r = Number(data[baseIdx]);
                const g = Number(data[baseIdx + 1]);
                const b = Number(data[baseIdx + 2]);
                if (isFinite(r) && !isNaN(r) && isFinite(g) && !isNaN(g) && isFinite(b) && !isNaN(b)) {
                    const luminance = (r + g + b) / 3; // Simple average luminance
                    validValues.push(luminance);
                }
            }
        }
    }
  }


  if (validValues.length === 0) {
    // Try to get a sensible default max based on typical data type ranges
    let defaultMax = 65535; // Default for 16-bit
    if (data instanceof Uint8Array) defaultMax = 255;
    else if (data instanceof Uint32Array) defaultMax = Math.pow(2,32)-1;
    return { min: 0, max: defaultMax }
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

  const robustMin = validValues[lowerIndex];
  const robustMax = validValues[upperIndex];

  // Ensure min is not greater than max, can happen with very flat data or small samples
  return {
    min: Math.min(robustMin, robustMax),
    max: robustMax
  }
}

// Calculate histogram from the image data
const calculateHistogram = () => {
  if (props.imageData.byteLength === 0) { // Removed !processedImage.value check here, it's re-checked or processed below
    histogram.value = []; 
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

  // If processedImage.value is not available, it implies it needs reprocessing.
  // This is typically handled by the watcher for props.imageData or bayer settings.
  // However, if called directly and processedImage is null, we should try to process.
  if (!processedImage.value) {
     let bayerPatternToUse: BayerPattern | undefined = undefined;
     if (!isMonochromeOrUnknown.value && enableDebayer.value) {
       bayerPatternToUse = selectedBayerPattern.value;
     }
     processedImage.value = processImageBytes(
        props.imageData,
        props.width,
        props.height,
        bayerPatternToUse
      )
      if (!processedImage.value) {
          log.error("Image processing failed in calculateHistogram");
          return [];
      }
  }


  // Verify we have valid data
  if (!processedImage.value || processedImage.value.pixelData.length === 0) {
    log.error('No valid image data for histogram calculation');
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
  const min = autoStretch.value ? processedImage.value.minPixelValue : minPixelValue.value;
  const max = autoStretch.value ? processedImage.value.maxPixelValue : maxPixelValue.value;

  // Apply robust stretch if enabled (using already calculated min/max from drawImage if autoStretch is on)
  // The min/maxPixelValue on processedImage are ALREADY robustly calculated if autoStretch was on.
  // So, for histogram, we use these values directly if autoStretch is on.
  // Manual stretch values (minPixelValue.value, maxPixelValue.value) are set by user or by auto-stretch application.

  // Store min/max for stretching and UI (already done in drawImage, this is for consistency if called separately)
  // This was also a source of the loop. Only update if autoStretch is false.
  if (autoStretch.value) {
    // If auto-stretching, minPixelValue and maxPixelValue should ideally reflect the *result* of auto-stretch
    // but not be set during the reactive calculation that *uses* them as a dependency.
    // The actual min/max for the histogram should come from processedImage.value or robust calculation directly.
    // minPixelValue.value = min; // OLD: Cause of loop
    // maxPixelValue.value = max; // OLD: Cause of loop
  } else {
    // If manual stretch is on, then min/maxPixelValue are the source of truth.
    minPixelValue.value = min;
    maxPixelValue.value = max;
  }
  
  // Use library function to calculate histogram efficiently
  const hist = calculateLibHistogram(
    processedImage.value.pixelData,
    imageWidth,
    imageHeight,
    min, // Use the min (possibly robustly calculated from processedImage or actual minPixelValue.value if manual)
    max, // Use the max (similarly)
    256,
    processedImage.value.channels, // Pass channels
    processedImage.value.isDebayered ? 'row-major' : 'column-major' // Pass order
  );

  histogram.value = hist; 
  emit('histogram-generated', hist);

  if (hist.length > 0) {
    nextTick(() => {
      if (histogramCanvas.value) { 
        drawHistogram(hist);
      } else {
        log.warn('[Histogram] drawHistogram skipped: histogramCanvas ref not available even after nextTick.');
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
    log.warn('[Histogram] No canvas context.');
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
        log.warn('[Histogram] CSS variable --aw-primary-color is empty or not found. Using #CCCCCC fallback.');
      }
    } catch (e) {
      log.warn('[Histogram] Error accessing CSS variable --aw-primary-color. Using #CCCCCC fallback.', e);
    }
  } else {
    // This case is highly unlikely in modern browsers
    log.warn('[Histogram] getComputedStyle not available. Using #CCCCCC fallback.');
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
      processedImage.value = null 
      applyStretch(); 
    } else {
        processedImage.value = null;
        histogram.value = [];
        minPixelValue.value = 0; // Reset manual stretch values
        maxPixelValue.value = 255;
        if (canvasRef.value) {
            const ctx = canvasRef.value.getContext('2d');
            if (ctx) ctx.clearRect(0,0, canvasRef.value.width, canvasRef.value.height);
        }
        if (histogramCanvas.value) {
            const ctxHist = histogramCanvas.value.getContext('2d');
            if (ctxHist) ctxHist.clearRect(0,0, histogramCanvas.value.width, histogramCanvas.value.height);
        }
    }
  }
)

// Watch for changes in detectedBayerPattern from props
watch(() => props.detectedBayerPattern, (newDetectedPattern) => {
  autoDetectedPatternDisplay.value = newDetectedPattern;
  if (newDetectedPattern && !userHasManuallySelectedPattern.value && !isMonochromeOrUnknown.value) {
    if (bayerPatternOptions.value.includes(newDetectedPattern)) {
      selectedBayerPattern.value = newDetectedPattern;
      if (!enableDebayer.value) {
        enableDebayer.value = true; // Auto-enable if a pattern is detected and we are not monochrome
      } else {
        // If debayer was already enabled, changing pattern should trigger reprocess
        processedImage.value = null;
        applyStretch();
      }
    }
  }
}, { immediate: true });

// Watch for user manually changing the selectedBayerPattern
watch(selectedBayerPattern, (newValue, oldValue) => {
  if (newValue !== oldValue && newValue !== props.detectedBayerPattern) {
      userHasManuallySelectedPattern.value = true;
  }
  // If user selects a pattern that IS the auto-detected one, reset manual flag if desired
  // This logic can be nuanced. For now, any direct change is manual.
  // Re-processing is handled by the main watcher that includes selectedBayerPattern.value
});

// Watch for enableDebayer changes initiated by user
watch(enableDebayer, (newValue, oldValue) => {
    if (newValue !== oldValue) {
        // If user enables debayering and we have a detected pattern, but they haven't manually picked one, select the detected one.
        if (newValue && props.detectedBayerPattern && !userHasManuallySelectedPattern.value && !isMonochromeOrUnknown.value) {
            if (selectedBayerPattern.value !== props.detectedBayerPattern) {
                 if (bayerPatternOptions.value.includes(props.detectedBayerPattern)) {
                    selectedBayerPattern.value = props.detectedBayerPattern;
                    // This change in selectedBayerPattern will trigger the main watcher for reprocessing
                 }
            }
        }
        // If user disables debayering, they might expect it to revert to monochrome even if a pattern was auto-selected.
        // The main watcher including enableDebayer.value will trigger reprocessing.
        // Setting userHasManuallySelectedPattern to false if debayer is disabled might be good to allow auto-detection again if re-enabled.
        if (!newValue) {
            userHasManuallySelectedPattern.value = false;
        }
    }
});

// 4. Add currentThemeRef to the watch dependencies for applyStretch
watch(
  () => [
    stretchMethod.value,
    minPixelValue.value, // Manual min
    maxPixelValue.value, // Manual max
    autoStretch.value,
    useRobustStretch.value,
    robustPercentile.value,
    currentThemeRef.value,
    enableDebayer.value, // Add debayer enable
    selectedBayerPattern.value // Add selected bayer pattern
  ],
  () => {
    // When these settings change, we need to re-process the image from raw data
    // because bayer pattern or robust stretch source data might change.
    if (props.imageData.byteLength > 0) {
        processedImage.value = null; // Force re-processing in applyStretch
    }
    applyStretch();
  },
  { immediate: false } // Set to false, applyStretch will be called onMount if needed
)

// Watch for subframe prop changes and redraw overlay
watch(() => props.subframe, () => { drawImage(); }, { deep: true });

// Watch for width/height changes and redraw
watch([() => props.width, () => props.height], () => {
  drawImage();
});

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
        <Icon type="search" size="18" />
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
      
      <!-- Debayer Controls - Conditionally shown -->
      <template v-if="!isMonochromeOrUnknown">
        <div class="control-group">
          <label for="enable-debayer">Debayer Image:</label>
          <input id="enable-debayer" v-model="enableDebayer" type="checkbox" @change="applyStretch">
        </div>
        <div v-if="enableDebayer" class="control-group">
          <label for="bayer-pattern">Bayer Pattern:</label>
          <select id="bayer-pattern" v-model="selectedBayerPattern" @change="applyStretch">
            <option v-for="pattern in bayerPatternOptions" :key="pattern" :value="pattern">
              {{ pattern }}{{ pattern === autoDetectedPatternDisplay ? ' (detected)' : '' }}
            </option>
          </select>
        </div>
      </template>
      <!-- End Debayer Controls -->

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
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background-color: black;
  border: 2px solid #888; /* For debugging */
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
