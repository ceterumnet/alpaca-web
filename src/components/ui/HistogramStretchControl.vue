<script setup lang="ts">
import { ref, computed, watch, defineProps, defineEmits } from 'vue'

// Types
type Levels = [number, number, number] // black, mid, white

const props = defineProps<{
  histogram: number[]
  width: number
  height: number
  initialLevels?: Levels
  livePreview?: boolean
  rawHistogram?: number[]
  displayHistogram?: number[]
}>()

const emit = defineEmits<{
  (e: 'update:levels', levels: { input: [number, number, number]; output: [number, number] }): void
  (e: 'autoStretch'): void
  (e: 'resetStretch'): void
  (e: 'applyStretch'): void
  (e: 'drag-start'): void
  (e: 'drag-end'): void
}>()

// State
const inputLevels = ref<Levels>(Array.isArray(props.initialLevels) && props.initialLevels.length === 3 ? props.initialLevels : [0, 32768, 65535])
const livePreview = ref(props.livePreview ?? true)
const dragging = ref<null | 'inBlack' | 'inMid' | 'inWhite'>(null)
const hoverHandle = ref<null | 'inBlack' | 'inMid' | 'inWhite'>(null)
// const focusHandle = ref<null | 'inBlack' | 'inMid' | 'inWhite'>(null);
const handleHeight = 20
const handleWidth = 28
const hitboxWidth = 36
const svgRef = ref<SVGSVGElement | null>(null)

// --- rAF throttling for applyStretch ---
let rAFId: number | null = null
let pendingApply = false
function rAFEmitApplyStretch() {
  if (rAFId !== null) return // already scheduled
  rAFId = requestAnimationFrame(() => {
    rAFId = null
    if (pendingApply) {
      emit('applyStretch')
      pendingApply = false
    }
  })
}

// Derived
const svgWidth = computed(() => props.width || 400)
const svgHeight = computed(() => props.height || 120)
const histHeight = computed(() => svgHeight.value - 40)
const histY = 10
const handleRadius = 9
// const outputHandleRadius = 7;

// Utility: map value to X pixel
function valueToX(val: number) {
  return (val / 65535) * (svgWidth.value - 2 * handleRadius) + handleRadius
}
function xToValue(x: number) {
  return Math.round(((x - handleRadius) / (svgWidth.value - 2 * handleRadius)) * 65535)
}

// Histogram path
const histPath = computed(() => {
  if (!props.histogram || props.histogram.length === 0) return ''
  const max = Math.max(...props.histogram)
  const scaleY = max > 0 ? histHeight.value / max : 1
  let d = `M ${handleRadius} ${histY + histHeight.value}`
  for (let i = 0; i < props.histogram.length; i++) {
    const x = valueToX((i / (props.histogram.length - 1)) * 65535)
    const y = histY + histHeight.value - props.histogram[i] * scaleY
    d += ` L ${x} ${y}`
  }
  d += ` L ${svgWidth.value - handleRadius} ${histY + histHeight.value} Z`
  return d
})

// Dual histogram paths
const rawHistPath = computed(() => {
  if (!props.rawHistogram || props.rawHistogram.length === 0) return ''
  const max = Math.max(...props.rawHistogram)
  const scaleY = max > 0 ? histHeight.value / max : 1
  let d = `M ${handleRadius} ${histY + histHeight.value}`
  for (let i = 0; i < props.rawHistogram.length; i++) {
    const x = valueToX((i / (props.rawHistogram.length - 1)) * 65535)
    const y = histY + histHeight.value - props.rawHistogram[i] * scaleY
    d += ` L ${x} ${y}`
  }
  d += ` L ${svgWidth.value - handleRadius} ${histY + histHeight.value} Z`
  return d
})
const displayHistPath = computed(() => {
  if (!props.displayHistogram || props.displayHistogram.length === 0) return ''
  const max = Math.max(...props.displayHistogram)
  const scaleY = max > 0 ? histHeight.value / max : 1
  let d = ''
  for (let i = 0; i < props.displayHistogram.length; i++) {
    const x = valueToX((i / (props.displayHistogram.length - 1)) * 65535)
    const y = histY + histHeight.value - props.displayHistogram[i] * scaleY
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
  }
  return d
})

// Helper to update handle value from mouse/touch event
function getSvgXFromEvent(e: MouseEvent | TouchEvent) {
  if (!svgRef.value) return 0
  const svg = svgRef.value
  let clientX, clientY
  if ('touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = (e as MouseEvent).clientX
    clientY = (e as MouseEvent).clientY
  }
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return 0
  const svgP = pt.matrixTransform(ctm.inverse())
  return svgP.x
}

function updateHandleValueFromEvent(type: typeof dragging.value, e: MouseEvent | TouchEvent) {
  const x = Math.max(handleRadius, Math.min(svgWidth.value - handleRadius, getSvgXFromEvent(e)))
  const val = Math.max(0, Math.min(65535, xToValue(x)))
  if (type === 'inBlack') {
    inputLevels.value[0] = Math.min(val, inputLevels.value[1] - 1)
  } else if (type === 'inMid') {
    inputLevels.value[1] = Math.max(inputLevels.value[0] + 1, Math.min(val, inputLevels.value[2] - 1))
  } else if (type === 'inWhite') {
    inputLevels.value[2] = Math.max(inputLevels.value[1] + 1, val)
  }
  emit('update:levels', { input: [...inputLevels.value], output: [0, 65535] })
  if (livePreview.value) {
    pendingApply = true
    rAFEmitApplyStretch()
  }
}

// Handle drag logic
function onHandleDown(type: typeof dragging.value, e: MouseEvent | TouchEvent) {
  dragging.value = type
  updateHandleValueFromEvent(type, e) // Set value immediately
  window.addEventListener('mousemove', onHandleMove)
  window.addEventListener('touchmove', onHandleMove)
  window.addEventListener('mouseup', onHandleUp)
  window.addEventListener('touchend', onHandleUp)
  emit('drag-start')
}
function onHandleMove(e: MouseEvent | TouchEvent) {
  if (!dragging.value) return
  updateHandleValueFromEvent(dragging.value, e)
}
function onHandleUp() {
  if (!dragging.value) return
  dragging.value = null
  window.removeEventListener('mousemove', onHandleMove)
  window.removeEventListener('touchmove', onHandleMove)
  window.removeEventListener('mouseup', onHandleUp)
  window.removeEventListener('touchend', onHandleUp)
  emit('update:levels', { input: [...inputLevels.value], output: [0, 65535] })
  emit('applyStretch') // Always emit one final time on drag end
  emit('drag-end')
}

// Numeric entry handlers
function onInputLevelChange(idx: number, val: number) {
  if (idx === 0) inputLevels.value[0] = Math.min(val, inputLevels.value[1] - 1)
  if (idx === 1) inputLevels.value[1] = Math.max(inputLevels.value[0] + 1, Math.min(val, inputLevels.value[2] - 1))
  if (idx === 2) inputLevels.value[2] = Math.max(inputLevels.value[1] + 1, val)
  emit('update:levels', { input: [...inputLevels.value], output: [0, 65535] })
}

// Keyboard nudge
function onHandleKeydown(e: KeyboardEvent, type: typeof dragging.value) {
  let arr, idx, min, max
  if (type === 'inBlack') {
    arr = inputLevels.value
    idx = 0
    min = 0
    max = arr[1] - 1
  } else if (type === 'inMid') {
    arr = inputLevels.value
    idx = 1
    min = arr[0] + 1
    max = arr[2] - 1
  } else if (type === 'inWhite') {
    arr = inputLevels.value
    idx = 2
    min = arr[1] + 1
    max = 65535
  } else return
  const step = e.shiftKey ? 10 : 1
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') arr[idx] = Math.max(min, arr[idx] - step)
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') arr[idx] = Math.min(max, arr[idx] + step)
  emit('update:levels', { input: [...inputLevels.value], output: [0, 65535] })
  if (livePreview.value) {
    pendingApply = true
    rAFEmitApplyStretch()
  }
}

// Auto buttons
function onAutoStretch() {
  emit('autoStretch')
}
function onResetStretch() {
  emit('resetStretch')
}

// Watch for prop changes
watch(
  () => props.initialLevels,
  (val) => {
    if (Array.isArray(val) && val.length === 3) {
      inputLevels.value = [...val]
    }
  }
)
</script>

<template>
  <div class="histogram-stretch-control">
    <svg ref="svgRef" :viewBox="`0 0 ${svgWidth} ${svgHeight}`" width="100%" height="auto" tabindex="0">
      <!-- Raw histogram as filled area (background) -->
      <path
        v-if="props.rawHistogram && props.rawHistogram.length > 0"
        :d="rawHistPath"
        fill="var(--aw-accent-color, #3a6ed8)"
        fill-opacity="0.18"
        stroke="none"
      />
      <!-- Display histogram as line overlay -->
      <path
        v-if="props.displayHistogram && props.displayHistogram.length > 0"
        :d="displayHistPath"
        fill="none"
        stroke="var(--aw-histogram-line-color, var(--aw-accent-color, #ff9800))"
        stroke-width="1.2"
      />
      <!-- Main histogram (fallback, legacy) -->
      <path
        v-if="!props.rawHistogram && props.histogram && props.histogram.length > 0"
        :d="histPath"
        fill="var(--aw-histogram-bg, #888)"
        fill-opacity="0.5"
        stroke="var(--aw-histogram-fg, #444)"
        stroke-width="1"
      />
      <!-- Stretch lines -->
      <!-- Black point line -->
      <line
        :x1="valueToX(inputLevels[0])"
        :x2="valueToX(inputLevels[0])"
        :y1="histY"
        :y2="histY + histHeight"
        stroke="var(--aw-histogram-black, #111)"
        stroke-width="2.2"
      />
      <!-- Mid point line (dashed, blue) -->
      <line
        :x1="valueToX(inputLevels[1])"
        :x2="valueToX(inputLevels[1])"
        :y1="histY"
        :y2="histY + histHeight"
        stroke="var(--aw-histogram-mid, #0af)"
        stroke-width="2.2"
        stroke-dasharray="7,6"
      />
      <!-- White point line -->
      <line
        :x1="valueToX(inputLevels[2])"
        :x2="valueToX(inputLevels[2])"
        :y1="histY"
        :y2="histY + histHeight"
        stroke="var(--aw-histogram-white, #fff)"
        stroke-width="2.2"
      />
      <!-- Handles (modern rect) using <g> for centering and scaling -->
      <!-- Black handle group -->
      <g
        :transform="`translate(${valueToX(inputLevels[0])}, ${histY + histHeight / 2}) scale(${dragging === 'inBlack' || hoverHandle === 'inBlack' ? 1.18 : 1})`"
        style="cursor: pointer"
        tabindex="0"
        @mousedown="(e) => onHandleDown('inBlack', e)"
        @touchstart="(e) => onHandleDown('inBlack', e)"
        @mouseenter="hoverHandle = 'inBlack'"
        @mouseleave="hoverHandle = null"
        @keydown="(e) => onHandleKeydown(e, 'inBlack')"
      >
        <!-- Hitbox -->
        <rect :x="-hitboxWidth / 2" :y="-18" :width="hitboxWidth" height="36" fill="rgba(0,0,0,0.01)" class="handle-hitbox" />
        <!-- Handle (more squared, with vertical lines) -->
        <rect
          :x="-handleWidth / 2"
          :y="-handleHeight / 2"
          :width="handleWidth"
          :height="handleHeight"
          rx="2"
          fill="var(--aw-histogram-black, #111)"
          stroke="none"
          class="handle-pill black"
          style="pointer-events: none"
        />
        <!-- Draggable lines -->
        <g class="handle-grip-lines">
          <line
            v-for="i in 3"
            :key="i"
            :x1="-6 + (i - 1) * 6"
            y1="-7"
            :x2="-6 + (i - 1) * 6"
            y2="7"
            stroke="var(--aw-histogram-handle-grip, #bbb)"
            stroke-width="1"
            stroke-linecap="round"
          />
        </g>
      </g>
      <!-- Mid handle group -->
      <g
        :transform="`translate(${valueToX(inputLevels[1])}, ${histY + histHeight / 2}) scale(${dragging === 'inMid' || hoverHandle === 'inMid' ? 1.18 : 1})`"
        style="cursor: pointer"
        tabindex="0"
        @mousedown="(e) => onHandleDown('inMid', e)"
        @touchstart="(e) => onHandleDown('inMid', e)"
        @mouseenter="hoverHandle = 'inMid'"
        @mouseleave="hoverHandle = null"
        @keydown="(e) => onHandleKeydown(e, 'inMid')"
      >
        <!-- Hitbox -->
        <rect :x="-hitboxWidth / 2" :y="-18" :width="hitboxWidth" height="36" fill="rgba(0,0,0,0.01)" class="handle-hitbox" />
        <rect
          :x="-handleWidth / 2"
          :y="-handleHeight / 2"
          :width="handleWidth"
          :height="handleHeight"
          rx="2"
          fill="var(--aw-histogram-mid, #0af)"
          stroke="none"
          class="handle-pill mid"
          style="pointer-events: none"
        />
        <g class="handle-grip-lines">
          <line
            v-for="i in 3"
            :key="i"
            :x1="-6 + (i - 1) * 6"
            y1="-7"
            :x2="-6 + (i - 1) * 6"
            y2="7"
            stroke="var(--aw-histogram-handle-grip, #fff)"
            stroke-width="1"
            stroke-linecap="round"
          />
        </g>
      </g>
      <!-- White handle group -->
      <g
        :transform="`translate(${valueToX(inputLevels[2])}, ${histY + histHeight / 2}) scale(${dragging === 'inWhite' || hoverHandle === 'inWhite' ? 1.18 : 1})`"
        style="cursor: pointer"
        tabindex="0"
        @mousedown="(e) => onHandleDown('inWhite', e)"
        @touchstart="(e) => onHandleDown('inWhite', e)"
        @mouseenter="hoverHandle = 'inWhite'"
        @mouseleave="hoverHandle = null"
        @keydown="(e) => onHandleKeydown(e, 'inWhite')"
      >
        <!-- Hitbox -->
        <rect :x="-hitboxWidth / 2" :y="-18" :width="hitboxWidth" height="36" fill="rgba(0,0,0,0.01)" class="handle-hitbox" />
        <rect
          :x="-handleWidth / 2"
          :y="-handleHeight / 2"
          :width="handleWidth"
          :height="handleHeight"
          rx="2"
          fill="var(--aw-histogram-white, #fff)"
          stroke="none"
          class="handle-pill white"
          style="pointer-events: none"
        />
        <g class="handle-grip-lines">
          <line
            v-for="i in 3"
            :key="i"
            :x1="-6 + (i - 1) * 6"
            y1="-7"
            :x2="-6 + (i - 1) * 6"
            y2="7"
            stroke="var(--aw-histogram-handle-grip, #888)"
            stroke-width="1"
            stroke-linecap="round"
          />
        </g>
      </g>
    </svg>
    <div class="levels-numeric-row">
      <label
        >Black:
        <input v-model.number="inputLevels[0]" type="number" min="0" :max="inputLevels[1] - 1" @change="onInputLevelChange(0, inputLevels[0])"
      /></label>
      <label
        >Mid:
        <input
          v-model.number="inputLevels[1]"
          type="number"
          :min="inputLevels[0] + 1"
          :max="inputLevels[2] - 1"
          @change="onInputLevelChange(1, inputLevels[1])"
      /></label>
      <label
        >White:
        <input v-model.number="inputLevels[2]" type="number" :min="inputLevels[1] + 1" max="65535" @change="onInputLevelChange(2, inputLevels[2])"
      /></label>
    </div>
    <div class="levels-button-row">
      <div class="button-left">
        <button @click="onAutoStretch">Auto Stretch</button>
      </div>
      <div class="button-right">
        <button @click="onResetStretch">Reset Stretch</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.histogram-stretch-control {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
}

svg {
  width: 100%;
  height: auto;
  aspect-ratio: 400 / 120;
  user-select: none;
  cursor: pointer;
  background: var(--aw-histogram-bg);
  border-radius: var(--aw-border-radius-sm);
  box-shadow: var(--aw-shadow-sm);
  color: var(--aw-histogram-svg-color, var(--aw-color-text-primary));
}

.handle-pill {
  cursor: pointer;
  filter: drop-shadow(var(--aw-shadow-sm));
  transition:
    transform 0.12s,
    stroke-width 0.12s;
  stroke-width: 2;
  transform-origin: 50% 50%;
}

.handle-pill.active {
  transform: scale(1.18);
  stroke-width: 3;
  z-index: 2;
}

.handle-pill.black {
  fill: var(--aw-histogram-black);
  stroke: none;
}

.handle-pill.mid {
  fill: var(--aw-histogram-mid);
  stroke: none;
}

.handle-pill.white {
  fill: var(--aw-histogram-white);
  stroke: none;
}

.handle-grip-lines line {
  opacity: 0.7;
}

.levels-numeric-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.3rem 0.7rem;
  align-items: center;
  font-size: 0.88em;
  margin-top: 0.2em;
}

.levels-button-row {
  display: flex;
  justify-content: space-between;
  gap: 0.7em;
  margin-top: 0.3em;
  flex-wrap: wrap;
  width: 100%;
}

.button-left {
  flex: 1 1 0;
  display: flex;
  justify-content: flex-start;
}

.button-right {
  flex: 1 1 0;
  display: flex;
  justify-content: flex-end;
}

.levels-button-row button {
  padding: 0.18rem 0.7rem;
  font-size: 0.95em;
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  background: var(--aw-button-primary-bg);
  color: var(--aw-button-primary-text);
  cursor: pointer;
}

.levels-button-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.levels-numeric-row label {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  justify-content: flex-end;
  font-size: 0.95em;
}

.levels-numeric-row input[type='number'] {
  width: 60px;
  padding: 0.15rem 0.3rem;
  font-size: 0.95em;
  border-radius: var(--aw-border-radius-sm);
  border: 1px solid var(--aw-panel-border-color);
  background: var(--aw-input-bg-color);
  color: var(--aw-color-text-primary);
}
</style>
