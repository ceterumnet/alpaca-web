// Status: Good - Part of new panel system // This component handles image display and processing with advanced features: // - ASCOM Alpaca image
format support // - Image stretching and enhancement // - Histogram generation and display // - Robust stretch handling for outlier rejection // -
Real-time image updates

<script setup lang="ts">
import log from '@/plugins/logger'
import { ref, onMounted, watch, nextTick, onBeforeUnmount, computed } from 'vue'
import {
  processImageBytes,
  createStretchLUT,
  generateDisplayImage,
  calculateHistogram as calculateLibHistogram,
  processImageBytesCallCount
} from '@/lib/ASCOMImageBytes'
import type { ProcessedImageData, BayerPattern } from '@/lib/ASCOMImageBytes'
import Icon from '@/components/ui/Icon.vue' // Import the Icon component
import HistogramStretchControl from '@/components/ui/HistogramStretchControl.vue'

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
  sensorType: {
    // 0: Mono, 1: Color (no bayer), 2: RGGB, 3:CMYG, 4:CMYG2, 5:LRGB, 6: TrueSense Mono (Kodak)
    type: Number,
    default: null // null if unknown or not provided
  },
  detectedBayerPattern: {
    type: String as () => BayerPattern | null,
    default: null
  },
  subframe: {
    type: Object as () => { startX: number; startY: number; numX: number; numY: number } | undefined,
    default: undefined
  }
})

const emit = defineEmits(['histogram-generated'])

// State
const canvasRef = ref<HTMLCanvasElement | null>(null)
const histogramCanvas = ref<HTMLCanvasElement | null>(null)
const histogram = ref<number[]>([])
const rawHistogram = ref<number[]>([])
const displayHistogram = ref<number[]>([])
const minPixelValue = ref(0)
const maxPixelValue = ref(65535)
const stretchMethod = ref<'none' | 'linear' | 'log'>('linear')
const autoStretch = ref(true)
// Add robust stretch settings to avoid outliers making everything black
const useRobustStretch = ref(true)
const robustPercentile = ref(98) // Exclude top 2% of pixels as outliers
const gamma = ref(1.0)

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
  return props.sensorType === null || props.sensorType === 0 || props.sensorType === 1 || props.sensorType === 6
})

// Full-screen state
const isFullScreen = ref(false)
const fullScreenImageSrc = ref('')

// Store processed image data
const processedImage = ref<ProcessedImageData | null>(null)

// 1. Create a reactive ref for the current theme
const currentThemeRef = ref<'light' | 'dark'>('light')

// Function to update the current theme based on document.documentElement class
const updateThemeRef = () => {
  const isDark = document.documentElement.classList.contains('dark-theme')
  currentThemeRef.value = isDark ? 'dark' : 'light'
}

let themeObserver: MutationObserver | null = null

// State for pixel hover readout
const hoverPixel = ref<{ x: number; y: number; avg: number[]; display: number[] } | null>(null)
const showPixelTooltip = ref(false)
const pixelTooltipPos = ref({ x: 0, y: 0 })

// Helper to get 3x3 average at (x, y)
function get3x3Average(x: number, y: number): number[] {
  if (!processedImage.value) return [0]
  const { pixelData, width, height, channels } = processedImage.value
  const avg: number[] = channels === 3 ? [0, 0, 0] : [0]
  let count = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const px = Math.min(width - 1, Math.max(0, x + dx))
      const py = Math.min(height - 1, Math.max(0, y + dy))
      if (channels === 1) {
        // Column-major for mono
        const idx = px * height + py
        avg[0] += Number(pixelData[idx])
      } else {
        // Row-major for RGB
        const baseIdx = (py * width + px) * 3
        avg[0] += Number(pixelData[baseIdx])
        avg[1] += Number(pixelData[baseIdx + 1])
        avg[2] += Number(pixelData[baseIdx + 2])
      }
      count++
    }
  }
  for (let i = 0; i < avg.length; i++) avg[i] = Math.round(avg[i] / count)
  return avg
}

// Helper to map raw value(s) to display value(s) using current LUT
function mapToDisplay(raw: number[]): number[] {
  if (!processedImage.value) return [0]
  const { bitsPerPixel, channels } = processedImage.value
  const minToUse = autoStretch.value ? processedImage.value.minPixelValue : minPixelValue.value
  const maxToUse = autoStretch.value ? processedImage.value.maxPixelValue : maxPixelValue.value
  const lut = createStretchLUT(minToUse, maxToUse, stretchMethod.value, bitsPerPixel, gamma.value)
  if (channels === 1) {
    return [lut[Math.min(lut.length - 1, Math.max(0, Math.round(raw[0])))]]
  } else {
    return [
      lut[Math.min(lut.length - 1, Math.max(0, Math.round(raw[0])))],
      lut[Math.min(lut.length - 1, Math.max(0, Math.round(raw[1])))],
      lut[Math.min(lut.length - 1, Math.max(0, Math.round(raw[2])))]
    ]
  }
}

function onCanvasMouseMove(e: MouseEvent) {
  if (!canvasRef.value || !processedImage.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const x = Math.floor(((e.clientX - rect.left) * processedImage.value.width) / rect.width)
  const y = Math.floor(((e.clientY - rect.top) * processedImage.value.height) / rect.height)
  if (x < 0 || y < 0 || x >= processedImage.value.width || y >= processedImage.value.height) {
    showPixelTooltip.value = false
    return
  }
  const avg = get3x3Average(x, y)
  const display = mapToDisplay(avg)
  hoverPixel.value = { x, y, avg, display }
  showPixelTooltip.value = true
  pixelTooltipPos.value = { x: e.clientX, y: e.clientY }
}
function onCanvasMouseLeave() {
  showPixelTooltip.value = false
}

// Draw the image on canvas
const drawImage = async () => {
  console.time('drawImage')
  // Add detailed logging for received props at the beginning of drawImage
  log.debug(
    {
      imageData: props.imageData,
      width: props.width,
      height: props.height,
      sensorType: props.sensorType,
      subframe: props.subframe
    },
    'CameraImageDisplay: drawImage called. Props:'
  )

  if (!canvasRef.value) {
    log.warn('CameraImageDisplay: drawImage aborted - no canvas.')
    console.timeEnd('drawImage')
    return
  }

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.timeEnd('drawImage')
    return
  }

  // If no image data, draw placeholder
  if (props.imageData.byteLength === 0) {
    canvas.width = props.width
    canvas.height = props.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.strokeRect(0, 0, canvas.width, canvas.height)
    // Draw subframe overlay if present
    if (props.subframe && props.subframe.numX > 0 && props.subframe.numY > 0) {
      ctx.save()
      ctx.strokeStyle = '#ff9800'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(props.subframe.startX, props.subframe.startY, props.subframe.numX, props.subframe.numY)
      ctx.restore()
      console.log('Subframe overlay (placeholder):', props.subframe)
    }
    console.timeEnd('drawImage')
    return
  }

  if (!processedImage.value) {
    let bayerPatternToUse: BayerPattern | undefined = undefined
    if (!isMonochromeOrUnknown.value && enableDebayer.value) {
      bayerPatternToUse = selectedBayerPattern.value
    }
    processedImage.value = processImageBytes(props.imageData, props.width, props.height, bayerPatternToUse)
  }

  if (!processedImage.value) {
    // Check again in case processing failed
    log.error('Image processing failed in drawImage')
    console.timeEnd('drawImage')
    return
  }

  const imageWidth = processedImage.value.width
  const imageHeight = processedImage.value.height
  console.log('drawImage: imageWidth', imageWidth, 'imageHeight', imageHeight, 'subframe', props.subframe)

  canvas.width = imageWidth
  canvas.height = imageHeight

  const minToUse = minPixelValue.value
  const maxToUse = maxPixelValue.value
  const gammaToUse = gamma.value
  const methodToUse = stretchMethod.value

  // Create an efficient lookup table for the stretch method
  console.time('createStretchLUT')
  const lut = createStretchLUT(minToUse, maxToUse, methodToUse, processedImage.value.bitsPerPixel, gammaToUse)
  console.timeEnd('createStretchLUT')

  // Generate display image data efficiently
  console.time('generateDisplayImage')
  const imageData = generateDisplayImage(
    processedImage.value.pixelData,
    imageWidth,
    imageHeight,
    lut,
    processedImage.value.channels // Pass channels
  )
  console.timeEnd('generateDisplayImage')

  // Create ImageData object for canvas
  console.time('putImageData')
  const imgData = new ImageData(imageData, imageWidth, imageHeight)
  ctx.putImageData(imgData, 0, 0)
  console.timeEnd('putImageData')

  // Draw subframe overlay if present and valid
  if (
    props.subframe &&
    props.subframe.numX > 0 &&
    props.subframe.numY > 0 &&
    (props.subframe.numX < imageWidth || props.subframe.numY < imageHeight)
  ) {
    ctx.save()
    ctx.strokeStyle = '#ff9800'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(props.subframe.startX, props.subframe.startY, props.subframe.numX, props.subframe.numY)
    ctx.restore()
    console.log('Subframe overlay:', props.subframe)
  }

  // If full screen is active, update its source too
  if (isFullScreen.value) {
    await nextTick() // Ensure canvas has rendered
    if (canvasRef.value) {
      fullScreenImageSrc.value = canvasRef.value.toDataURL('image/png')
    }
  }
  console.timeEnd('drawImage')
}

// Calculate histogram from the image data
// --- OPTIMIZED: Only recalc rawHistogram when image data changes; remap for displayHistogram ---
const lastRawHistKey = ref('') // To track when image data changes

function getRawHistKey() {
  // Use a string key based on imageData, width, height, debayering
  return [props.imageData, props.width, props.height, enableDebayer.value, selectedBayerPattern.value].join(':')
}

// --- Fast display histogram: remap rawHistogram bins using LUT ---
const fastDisplayHistogram = () => {
  if (!processedImage.value) return []
  const bits = processedImage.value.bitsPerPixel
  const lut = createStretchLUT(minPixelValue.value, maxPixelValue.value, stretchMethod.value, bits, gamma.value)
  const displayBins = 256
  const displayHist = new Array(displayBins).fill(0)
  const rawMin = 0
  const rawMax = Math.pow(2, bits) - 1
  for (let i = 0; i < rawHistogram.value.length; i++) {
    const rawValue = rawMin + ((rawMax - rawMin) * (i + 0.5)) / rawHistogram.value.length
    const displayValue = lut[Math.min(lut.length - 1, Math.max(0, Math.round(rawValue)))]
    const displayBin = Math.min(displayBins - 1, Math.max(0, Math.round(displayValue)))
    displayHist[displayBin] += rawHistogram.value[i]
  }
  return displayHist
}

// --- Full-fidelity display histogram: map every pixel through LUT ---
const fullDisplayHistogram = () => {
  if (!processedImage.value) return []
  const { pixelData, width, height, bitsPerPixel, channels } = processedImage.value
  const lut = createStretchLUT(minPixelValue.value, maxPixelValue.value, stretchMethod.value, bitsPerPixel, gamma.value)
  const displayBins = 256
  const displayHist = new Array(displayBins).fill(0)
  if (channels === 1) {
    // Column-major
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const idx = x * height + y
        const value = pixelData[idx]
        const displayValue = lut[Math.min(lut.length - 1, Math.max(0, Math.round(value)))]
        const displayBin = Math.min(displayBins - 1, Math.max(0, Math.round(displayValue)))
        displayHist[displayBin]++
      }
    }
  } else {
    // Row-major RGB: use luminance
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const baseIdx = (y * width + x) * 3
        const r = pixelData[baseIdx]
        const g = pixelData[baseIdx + 1]
        const b = pixelData[baseIdx + 2]
        const luminance = (r + g + b) / 3
        const displayValue = lut[Math.min(lut.length - 1, Math.max(0, Math.round(luminance)))]
        const displayBin = Math.min(displayBins - 1, Math.max(0, Math.round(displayValue)))
        displayHist[displayBin]++
      }
    }
  }
  return displayHist
}

// --- Use fast histogram during drag, full after drag ---
let isDragging = false

// Listen for drag events globally to set isDragging
function setDraggingTrue() {
  isDragging = true
  calculateHistogram()
}
function setDraggingFalse() {
  isDragging = false
  calculateHistogram()
}

const calculateHistogram = () => {
  console.time('calculateHistogram')
  if (props.imageData.byteLength === 0) {
    histogram.value = []
    rawHistogram.value = []
    displayHistogram.value = []
    if (histogramCanvas.value) {
      const canvas = histogramCanvas.value
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    console.timeEnd('calculateHistogram')
    return []
  }
  const rawHistKey = getRawHistKey()
  let recalcRaw = false
  if (rawHistKey !== lastRawHistKey.value) {
    recalcRaw = true
    lastRawHistKey.value = rawHistKey
  }
  if (!processedImage.value) {
    let bayerPatternToUse
    if (!isMonochromeOrUnknown.value && enableDebayer.value) {
      bayerPatternToUse = selectedBayerPattern.value
    }
    processedImage.value = processImageBytes(props.imageData, props.width, props.height, bayerPatternToUse)
    if (!processedImage.value) {
      log.error('Image processing failed in calculateHistogram')
      console.timeEnd('calculateHistogram')
      return []
    }
  }
  if (!processedImage.value || processedImage.value.pixelData.length === 0) {
    log.error('No valid image data for histogram calculation')
    histogram.value = []
    rawHistogram.value = []
    displayHistogram.value = []
    if (histogramCanvas.value) {
      const canvas = histogramCanvas.value
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    console.timeEnd('calculateHistogram')
    return []
  }
  const imageWidth = processedImage.value.width
  const imageHeight = processedImage.value.height
  const bits = processedImage.value.bitsPerPixel
  const rawMin = 0
  const rawMax = Math.pow(2, bits) - 1
  let rawData = processedImage.value.pixelData
  let rawChannels = processedImage.value.channels
  let rawOrder: 'column-major' | 'row-major' = processedImage.value.isDebayered ? 'row-major' : 'column-major'
  if (processedImage.value.isDebayered && processedImage.value.originalPixelData) {
    rawData = Array.from(processedImage.value.originalPixelData)
    rawChannels = 1
    rawOrder = 'column-major'
  }
  if (recalcRaw || !rawHistogram.value.length) {
    console.time('rawHistogram')
    rawHistogram.value = calculateLibHistogram(rawData, imageWidth, imageHeight, rawMin, rawMax, 256, rawChannels, rawOrder)
    console.timeEnd('rawHistogram')
  }
  // Use fast or full display histogram depending on drag state
  if (isDragging) {
    console.time('fastDisplayHistogram')
    displayHistogram.value = fastDisplayHistogram()
    console.timeEnd('fastDisplayHistogram')
  } else {
    console.time('fullDisplayHistogram')
    displayHistogram.value = fullDisplayHistogram()
    console.timeEnd('fullDisplayHistogram')
  }
  histogram.value = displayHistogram.value
  emit('histogram-generated', histogram.value)
  if (histogram.value.length > 0) {
    nextTick(() => {
      if (histogramCanvas.value) {
        drawHistogram(histogram.value)
      } else {
        log.warn('[Histogram] drawHistogram skipped: histogramCanvas ref not available even after nextTick.')
      }
    })
  }
  console.timeEnd('calculateHistogram')
  return histogram.value
}

// Draw the histogram on canvas
const drawHistogram = (histData: number[]) => {
  if (!histogramCanvas.value || histData.length === 0) {
    return
  }

  const canvas = histogramCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    log.warn('[Histogram] No canvas context.')
    return
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const maxCount = Math.max(...histData)
  if (maxCount === 0) {
    return
  }

  let barColor = '#CCCCCC' // Fallback if theme variable fails

  if (canvas && typeof getComputedStyle === 'function') {
    try {
      const computedThemeColor = getComputedStyle(canvas).getPropertyValue('--aw-primary-color').trim()
      if (computedThemeColor) {
        barColor = computedThemeColor
      } else {
        log.warn('[Histogram] CSS variable --aw-primary-color is empty or not found. Using #CCCCCC fallback.')
      }
    } catch (e) {
      log.warn('[Histogram] Error accessing CSS variable --aw-primary-color. Using #CCCCCC fallback.', e)
    }
  } else {
    // This case is highly unlikely in modern browsers
    log.warn('[Histogram] getComputedStyle not available. Using #CCCCCC fallback.')
  }

  ctx.fillStyle = barColor
  ctx.globalAlpha = 1.0

  const barWidth = canvas.width / histData.length // This is the total space per bar (bar + potential gap)

  for (let i = 0; i < histData.length; i++) {
    const barHeight = (histData[i] / maxCount) * canvas.height

    let drawnBarActualWidth
    if (barWidth >= 2.0) {
      // If total space is 2px or more, make a 1px gap
      drawnBarActualWidth = Math.floor(barWidth) - 1
    } else if (barWidth >= 1.0) {
      // If total space is between 1px and 2px (exclusive of 2px), draw a 1px bar
      drawnBarActualWidth = 1.0
    } else {
      // If total space is less than 1px, draw the fractional width (browser will anti-alias)
      drawnBarActualWidth = barWidth
    }
    // Ensure we draw at least something visible if calculations result in very small/zero width
    const finalDrawWidth = Math.max(0.5, drawnBarActualWidth)

    ctx.fillRect(i * barWidth, canvas.height - barHeight, finalDrawWidth, barHeight)
  }
}

// Apply stretch settings and redraw
const applyStretch = () => {
  console.time('applyStretch')
  calculateHistogram()
  drawImage() // drawImage will now also update fullScreenImageSrc if active
  console.timeEnd('applyStretch')
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
      applyStretch()
    } else {
      processedImage.value = null
      histogram.value = []
      rawHistogram.value = []
      displayHistogram.value = []
      minPixelValue.value = 0 // Reset manual stretch values
      maxPixelValue.value = 255
      if (canvasRef.value) {
        const ctx = canvasRef.value.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
      }
      if (histogramCanvas.value) {
        const ctxHist = histogramCanvas.value.getContext('2d')
        if (ctxHist) ctxHist.clearRect(0, 0, histogramCanvas.value.width, histogramCanvas.value.height)
      }
    }
  }
)

// Watch for changes in detectedBayerPattern from props
watch(
  () => props.detectedBayerPattern,
  (newDetectedPattern) => {
    autoDetectedPatternDisplay.value = newDetectedPattern
    if (newDetectedPattern && !userHasManuallySelectedPattern.value && !isMonochromeOrUnknown.value) {
      if (bayerPatternOptions.value.includes(newDetectedPattern)) {
        selectedBayerPattern.value = newDetectedPattern
        if (!enableDebayer.value) {
          enableDebayer.value = true // Auto-enable if a pattern is detected and we are not monochrome
        } else {
          // If debayer was already enabled, changing pattern should trigger reprocess
          processedImage.value = null
          applyStretch()
        }
      }
    }
  },
  { immediate: true }
)

// Watch for user manually changing the selectedBayerPattern
watch(selectedBayerPattern, (newValue, oldValue) => {
  if (newValue !== oldValue && newValue !== props.detectedBayerPattern) {
    userHasManuallySelectedPattern.value = true
  }
  // If user selects a pattern that IS the auto-detected one, reset manual flag if desired
  // This logic can be nuanced. For now, any direct change is manual.
  // Re-processing is handled by the main watcher that includes selectedBayerPattern.value
})

// Watch for enableDebayer changes initiated by user
watch(enableDebayer, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    // If user enables debayering and we have a detected pattern, but they haven't manually picked one, select the detected one.
    if (newValue && props.detectedBayerPattern && !userHasManuallySelectedPattern.value && !isMonochromeOrUnknown.value) {
      if (selectedBayerPattern.value !== props.detectedBayerPattern) {
        if (bayerPatternOptions.value.includes(props.detectedBayerPattern)) {
          selectedBayerPattern.value = props.detectedBayerPattern
          // This change in selectedBayerPattern will trigger the main watcher for reprocessing
        }
      }
    }
    // If user disables debayering, they might expect it to revert to monochrome even if a pattern was auto-selected.
    // The main watcher including enableDebayer.value will trigger reprocessing.
    // Setting userHasManuallySelectedPattern to false if debayer is disabled might be good to allow auto-detection again if re-enabled.
    if (!newValue) {
      userHasManuallySelectedPattern.value = false
    }
  }
})

// --- REFACTOR: Watchers for performance ---
// Only re-decode/process image when image data or debayer settings change
watch([() => props.imageData, enableDebayer, selectedBayerPattern, () => props.width, () => props.height], () => {
  processedImage.value = null
  calculateHistogram()
  drawImage()
})

// For stretch/gamma/levels, just redraw using cached processedImage
watch([stretchMethod, minPixelValue, maxPixelValue, autoStretch, useRobustStretch, robustPercentile, currentThemeRef, gamma], () => {
  drawImage()
})

// Watch for subframe prop changes and redraw overlay
watch(
  () => props.subframe,
  () => {
    drawImage()
  },
  { deep: true }
)

// Watch for width/height changes and redraw
watch([() => props.width, () => props.height], () => {
  drawImage()
})

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

  window.addEventListener('mousedown', setDraggingTrue)
  window.addEventListener('touchstart', setDraggingTrue)
  window.addEventListener('mouseup', setDraggingFalse)
  window.addEventListener('touchend', setDraggingFalse)
})

// 3. Clean up observer
onBeforeUnmount(() => {
  if (themeObserver) {
    themeObserver.disconnect()
  }

  window.removeEventListener('mousedown', setDraggingTrue)
  window.removeEventListener('touchstart', setDraggingTrue)
  window.removeEventListener('mouseup', setDraggingFalse)
  window.removeEventListener('touchend', setDraggingFalse)
})

// function resetStretch() {
//   autoStretch.value = true;
//   minPixelValue.value = 0;
//   maxPixelValue.value = 65535;
//   gamma.value = 1.0;
//   useRobustStretch.value = true;
//   robustPercentile.value = 98;
//   stretchLevels.value = { input: [minPixelValue.value, 32768, maxPixelValue.value], output: [0, 65535] }; // set these to the new auto-stretch values

//   applyStretch();
// }

// Remove all old slider/levels/stretch control logic and state
// Add state for histogram stretch control
const stretchLevels = ref({ input: [0, 32768, 65535], output: [0, 65535] })
const livePreview = ref(true)

// Watch for updates from the control
function onUpdateLevels(levels: { input: [number, number, number]; output: [number, number] }) {
  stretchLevels.value = levels
  minPixelValue.value = levels.input[0]
  maxPixelValue.value = levels.input[2]
  const norm = (levels.input[1] - levels.input[0]) / (levels.input[2] - levels.input[0])
  if (norm > 0 && norm < 1) {
    const invertedNorm = 1 - norm
    gamma.value = Math.log(0.5) / Math.log(invertedNorm)
  }
  calculateHistogram()
}
function onUpdateLivePreview(val: boolean) {
  livePreview.value = val
}

function onAutoStretch() {
  console.time('AutoStretch Total')
  autoStretch.value = true
  // If processedImage is available, use its robust/auto min/max for UI
  if (processedImage.value) {
    minPixelValue.value = processedImage.value.minPixelValue
    maxPixelValue.value = processedImage.value.maxPixelValue
    // Set gamma to 1.0 for auto-stretch (or recalculate if needed)
    gamma.value = 1.0
    // Update stretchLevels to match
    stretchLevels.value = {
      input: [minPixelValue.value, Math.round((processedImage.value.minPixelValue + processedImage.value.maxPixelValue) / 2), maxPixelValue.value],
      output: [0, 65535]
    }
    applyStretch()
  } else {
    // If not available, trigger processing and stretch
    applyStretch()
  }
  console.timeEnd('AutoStretch Total')
}

function onResetStretch() {
  resetStretch()
}

function onApplyStretch() {
  calculateHistogram()
  applyStretch()
}

// On image load, initialize sliders to True Linear
watch(
  () => props.imageData,
  (newValue) => {
    if (newValue.byteLength > 0 && processedImage.value) {
      setTrueLinear()
    }
  }
)

function setTrueLinear() {
  if (!processedImage.value) return
  minPixelValue.value = 0
  maxPixelValue.value = Math.pow(2, processedImage.value.bitsPerPixel) - 1
  gamma.value = 1.0
  stretchMethod.value = 'linear'
  stretchLevels.value = {
    input: [minPixelValue.value, Math.round((minPixelValue.value + maxPixelValue.value) / 2), maxPixelValue.value],
    output: [0, 65535]
  }
  applyStretch()
}

function resetStretch() {
  setTrueLinear()
}

const perfStats = ref({
  autoStretch: 0,
  applyStretch: 0,
  calculateHistogram: 0,
  fastDisplayHistogram: 0,
  fullDisplayHistogram: 0,
  createStretchLUT: 0,
  generateDisplayImage: 0,
  putImageData: 0,
  drawImage: 0
})
</script>

<template>
  <div class="aw-camera-image-display">
    <div ref="imageContainerRef" class="image-container">
      <canvas ref="canvasRef" class="image-canvas" @mousemove="onCanvasMouseMove" @mouseleave="onCanvasMouseLeave"></canvas>
      <button v-if="props.imageData.byteLength > 0" class="fullscreen-button" title="View Full Screen" @click="toggleFullScreen">
        <Icon type="search" size="18" />
      </button>
      <!-- Pixel hover tooltip -->
      <div
        v-if="showPixelTooltip && hoverPixel"
        class="pixel-tooltip"
        :style="{ left: pixelTooltipPos.x + 12 + 'px', top: pixelTooltipPos.y + 12 + 'px' }"
      >
        <div>
          <strong>Pixel ({{ hoverPixel.x }}, {{ hoverPixel.y }})</strong>
        </div>
        <div v-if="hoverPixel.avg.length === 1">Raw: {{ hoverPixel.avg[0] }}</div>
        <div v-else>Raw: R {{ hoverPixel.avg[0] }}, G {{ hoverPixel.avg[1] }}, B {{ hoverPixel.avg[2] }}</div>
        <div v-if="hoverPixel.display.length === 1">Display: {{ hoverPixel.display[0] }}</div>
        <div v-else>Display: R {{ hoverPixel.display[0] }}, G {{ hoverPixel.display[1] }}, B {{ hoverPixel.display[2] }}</div>
      </div>
    </div>
    <!-- Dense, clean pixel stats bar -->
    <div v-if="processedImage" class="pixel-stats-bar compact">
      <span class="stats-group stats-left">
        <b>{{ processedImage.width }}×{{ processedImage.height }}</b
        >, <b>{{ processedImage.bitsPerPixel }}</b
        >-bit,
        {{ processedImage.channels === 1 ? 'Mono' : 'RGB' }}
      </span>
      <span class="stats-group stats-right">
        Min: <b>{{ processedImage.minPixelValue }}</b
        >, Max: <b>{{ processedImage.maxPixelValue }}</b
        >, Mean: <b>{{ Math.round(processedImage.meanPixelValue) }}</b>
      </span>
    </div>
    <div v-if="props.imageData.byteLength > 0" class="stretch-controls astronomy-stretch-ui">
      <div class="stretch-mode-row">
        <label
          >Stretch Mode:
          <select v-model="stretchMethod" class="stretch-select">
            <option value="linear">True Linear</option>
            <option value="log">Log</option>
            <option value="none">None</option>
          </select>
        </label>
      </div>
      <HistogramStretchControl
        :histogram="histogram"
        :width="400"
        :height="120"
        :initial-levels="stretchLevels.input as [number, number, number]"
        :live-preview="livePreview"
        :raw-histogram="rawHistogram"
        :display-histogram="displayHistogram"
        :disabled="stretchMethod === 'linear'"
        @update:levels="onUpdateLevels"
        @update:live-preview="onUpdateLivePreview"
        @auto-stretch="onAutoStretch"
        @apply-stretch="onApplyStretch"
        @reset-stretch="onResetStretch"
      />
    </div>
    <div v-if="props.imageData.byteLength === 0" class="no-image-message">No image data to display.</div>
    <!-- Full Screen Modal -->
    <div v-if="isFullScreen" class="fullscreen-modal" @click.self="toggleFullScreen">
      <img :src="fullScreenImageSrc" alt="Full screen image" class="fullscreen-modal-image" />
      <button class="close-fullscreen-button" @click="toggleFullScreen">
        <Icon type="close" />
      </button>
    </div>
    <div class="perf-stats-overlay" style="display: none">
      <b>Performance Stats (ms):</b>
      <div>processImageBytes calls: {{ processImageBytesCallCount }}</div>
      <div>AutoStretch: {{ perfStats.autoStretch.toFixed(2) }}</div>
      <div>ApplyStretch: {{ perfStats.applyStretch.toFixed(2) }}</div>
      <div>CalculateHistogram: {{ perfStats.calculateHistogram.toFixed(2) }}</div>
      <div>FastDisplayHistogram: {{ perfStats.fastDisplayHistogram.toFixed(2) }}</div>
      <div>FullDisplayHistogram: {{ perfStats.fullDisplayHistogram.toFixed(2) }}</div>
      <div>CreateStretchLUT: {{ perfStats.createStretchLUT.toFixed(2) }}</div>
      <div>GenerateDisplayImage: {{ perfStats.generateDisplayImage.toFixed(2) }}</div>
      <div>PutImageData: {{ perfStats.putImageData.toFixed(2) }}</div>
      <div>DrawImage: {{ perfStats.drawImage.toFixed(2) }}</div>
    </div>
  </div>
</template>

<style scoped>
.aw-camera-image-display {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-sm);
  padding: var(--aw-spacing-sm);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
  border-radius: var(--aw-border-radius-sm);
  background-color: var(--aw-panel-content-bg-color);
  max-width: 100%;
  overflow: hidden;
  position: relative;
}

.image-container {
  width: 100%;
  max-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--aw-color-neutral-100);
  border-radius: var(--aw-border-radius-sm);
  overflow: hidden;
  position: relative;
}

.image-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background-color: var(--aw-color-background);
  /* stylelint-disable-next-line */
  border: 2px solid var(--aw-color-border);
}

.stretch-controls.astronomy-stretch-ui {
  display: flex;
  flex-direction: column;
  gap: var(--aw-spacing-sm);
  background: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-sm);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
  padding: var(--aw-spacing-md);
  margin-bottom: var(--aw-spacing-md);
}

.histogram-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: var(--aw-spacing-xs);
}

.histogram-label {
  font-size: 0.9rem;
  color: var(--aw-color-text-secondary);
  margin-bottom: 0.2rem;
}

.stretch-row {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-xs);
  margin-bottom: 0.2rem;
}

.stretch-label {
  min-width: 80px;
  font-size: 0.9rem;
  color: var(--aw-color-text-secondary);
}

.stretch-slider {
  flex: 1 1 120px;
  min-width: 80px;
  max-width: 200px;
  accent-color: var(--aw-accent-color);
}

.stretch-input {
  width: 70px;
  padding: 0.2rem 0.4rem;
  font-size: 0.95rem;
  border-radius: var(--aw-border-radius-sm);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
  background: var(--aw-input-bg-color);
  color: var(--aw-color-text-primary);
}

.stretch-input-small {
  width: 50px;
}

.stretch-select {
  min-width: 100px;
  font-size: 0.95rem;
  border-radius: var(--aw-border-radius-sm);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
  background: var(--aw-input-bg-color);
  color: var(--aw-color-text-primary);
}

.stretch-checkbox {
  margin-left: var(--aw-spacing-xs);
  margin-right: var(--aw-spacing-xs);
  accent-color: var(--aw-accent-color);
}

.stretch-reset-btn {
  background-color: transparent;
  /* stylelint-disable-next-line */
  border: none;
  color: var(--aw-accent-color);
  cursor: pointer;
  margin-left: var(--aw-spacing-xs);
  font-size: 1.1rem;
  display: flex;
  align-items: center;
}

.stretch-reset-btn:hover {
  color: var(--aw-color-primary-700);
}

.stretch-row-options {
  margin-top: var(--aw-spacing-xs);
}

.stretch-row-robust {
  margin-top: var(--aw-spacing-xs);
}

.histogram-canvas {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  width: 100%;
  height: 100px;
  background: var(--aw-color-background);
  border-radius: var(--aw-border-radius-xs);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
}

.no-image-message {
  text-align: center;
  padding: var(--aw-spacing-lg);
  color: var(--aw-color-text-secondary);
  font-style: italic;
  min-height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.fullscreen-button {
  position: absolute;
  top: var(--aw-spacing-xs);
  right: var(--aw-spacing-xs);
  background-color: var(--aw-color-black-40);
  color: var(--aw-color-text-on-primary);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  padding: var(--aw-spacing-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  width: calc(18px + 2 * var(--aw-spacing-xs));
  height: calc(18px + 2 * var(--aw-spacing-xs));
  line-height: 1;
}

.fullscreen-button:hover {
  background-color: var(--aw-color-black-60);
}

.fullscreen-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: var(--aw-color-black-85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: var(--aw-spacing-lg);
  box-sizing: border-box;
}

.fullscreen-modal-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--aw-border-radius-md);
  box-shadow: 0 0 30px var(--aw-color-black-50);
}

.close-fullscreen-button {
  position: absolute;
  top: var(--aw-spacing-md);
  right: var(--aw-spacing-md);
  background-color: transparent;
  /* stylelint-disable-next-line */
  border: none;
  color: var(--aw-color-text-on-primary);
  font-size: 1.8rem;
  cursor: pointer;
  padding: var(--aw-spacing-sm);
  line-height: 1;
}

.close-fullscreen-button:hover {
  color: var(--aw-color-neutral-300);
}

.stretch-auto-row,
.stretch-robust-row {
  background: var(--aw-panel-hover-bg-color);
  border-radius: var(--aw-border-radius-xs);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  margin-top: var(--aw-spacing-xs);
}

.stretch-auto-row label,
.stretch-robust-row label {
  color: var(--aw-color-text-secondary);
}

.stretch-auto-row input[type='checkbox'],
.stretch-robust-row input[type='checkbox'] {
  accent-color: var(--aw-accent-color);
}

.levels-vue-slider {
  margin: 10px 0;
  z-index: 1;
  position: static;
}

.levels-slider-histogram-stack {
  width: 100%;
  margin-bottom: 0.5rem;
}

.histogram-stack-container {
  position: relative;
  width: 100%;
  height: 100px;
}

.levels-vue-slider-overlay {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100px;
  background-color: transparent !important;
  z-index: 2;
  pointer-events: auto;
}

.levels-vue-slider-output {
  position: absolute;
  left: 0;
  top: 60px;
  width: 100%;
  height: 40px;
  background-color: transparent !important;
  z-index: 3;
  pointer-events: auto;
}

.levels-values {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.9rem;
  margin-top: 0.2rem;
  color: var(--aw-color-text-secondary);
}

.levels-values label {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.levels-values input[type='number'] {
  width: 70px;
  padding: 0.2rem 0.4rem;
  font-size: 0.95rem;
  border-radius: var(--aw-border-radius-sm);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
  background: var(--aw-input-bg-color);
  color: var(--aw-color-text-primary);
}

.levels-values button {
  padding: 0.2rem 0.8rem;
  font-size: 0.95rem;
  border-radius: var(--aw-border-radius-sm);
  /* stylelint-disable-next-line */
  border: 1px solid var(--aw-panel-border-color);
  background: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  cursor: pointer;
}

.levels-values button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.levels-values input[type='checkbox'] {
  margin-left: 0.5rem;
}

.pixel-stats-bar.compact {
  font-size: 0.85em;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 0.3em;
  padding: 0.05em 0.1em;
  margin: 0.1em 0;
}

.stats-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.3em;
}

.stats-left {
  justify-content: flex-start;
}

.stats-right {
  justify-content: flex-end;
}

.pixel-tooltip {
  position: fixed;
  z-index: 10000;
  background: var(--aw-color-black-90);
  color: var(--aw-color-text-on-primary);
  font-size: 0.95em;
  padding: 0.4em 0.7em;
  border-radius: var(--aw-border-radius-sm);
  box-shadow: var(--aw-shadow-sm);
  pointer-events: none;
  white-space: nowrap;
  opacity: 0.97;
}

.lut-args-indicator {
  margin-top: 0.5em;
  font-size: 0.97em;
  color: var(--aw-color-text-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 1.2em;
  align-items: center;
}

.lut-args-indicator strong {
  color: var(--aw-accent-color);
  margin-right: 0.7em;
}

.perf-stats-overlay {
  padding: var(--aw-spacing-md);
  background: var(--aw-panel-content-bg-color);
  border-radius: var(--aw-border-radius-sm);
  margin-top: var(--aw-spacing-md);
}
</style>
