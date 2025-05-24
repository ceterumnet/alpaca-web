<script setup lang="ts">
import { ref, computed, watch, defineProps, defineEmits } from 'vue';

// Types
type Levels = [number, number, number]; // black, mid, white

const props = defineProps<{
  histogram: number[];
  width: number;
  height: number;
  initialLevels?: Levels;
  livePreview?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:levels', levels: { input: [number, number, number], output: [number, number] }): void;
  (e: 'update:livePreview', value: boolean): void;
  (e: 'autoWindow'): void;
  (e: 'autoStretch'): void;
  (e: 'applyStretch'): void;
}>();

// State
const inputLevels = ref<Levels>(Array.isArray(props.initialLevels) && props.initialLevels.length === 3 ? props.initialLevels : [0, 32768, 65535]);
const livePreview = ref(props.livePreview ?? true);
const dragging = ref<null | 'inBlack' | 'inMid' | 'inWhite'>(null);
const dragOffset = ref(0);
const hoverHandle = ref<null | 'inBlack' | 'inMid' | 'inWhite'>(null);
const focusHandle = ref<null | 'inBlack' | 'inMid' | 'inWhite'>(null);

// Derived
const svgWidth = computed(() => props.width || 400);
const svgHeight = computed(() => props.height || 120);
const histHeight = computed(() => svgHeight.value - 40);
const histY = 10;
const handleRadius = 9;
const outputHandleRadius = 7;

// Utility: map value to X pixel
function valueToX(val: number) {
  return (val / 65535) * (svgWidth.value - 2 * handleRadius) + handleRadius;
}
function xToValue(x: number) {
  return Math.round(((x - handleRadius) / (svgWidth.value - 2 * handleRadius)) * 65535);
}

// Histogram path
const histPath = computed(() => {
  if (!props.histogram || props.histogram.length === 0) return '';
  const max = Math.max(...props.histogram);
  const scaleY = max > 0 ? histHeight.value / max : 1;
  let d = `M ${handleRadius} ${histY + histHeight.value}`;
  for (let i = 0; i < props.histogram.length; i++) {
    const x = valueToX((i / (props.histogram.length - 1)) * 65535);
    const y = histY + histHeight.value - props.histogram[i] * scaleY;
    d += ` L ${x} ${y}`;
  }
  d += ` L ${svgWidth.value - handleRadius} ${histY + histHeight.value} Z`;
  return d;
});

// Handle drag logic
function onHandleDown(type: typeof dragging.value, e: MouseEvent | TouchEvent) {
  dragging.value = type;
  const clientX = (e as MouseEvent).clientX ?? (e as TouchEvent).touches[0].clientX;
  dragOffset.value = clientX - valueToX(getHandleValue(type));
  window.addEventListener('mousemove', onHandleMove);
  window.addEventListener('touchmove', onHandleMove);
  window.addEventListener('mouseup', onHandleUp);
  window.addEventListener('touchend', onHandleUp);
}
function onHandleMove(e: MouseEvent | TouchEvent) {
  if (!dragging.value) return;
  const clientX = (e as MouseEvent).clientX ?? (e as TouchEvent).touches[0].clientX;
  let x = clientX - dragOffset.value;
  x = Math.max(handleRadius, Math.min(svgWidth.value - handleRadius, x));
  const val = Math.max(0, Math.min(65535, xToValue(x)));
  // Clamp and update
  if (dragging.value === 'inBlack') {
    inputLevels.value[0] = Math.min(val, inputLevels.value[1] - 1);
  } else if (dragging.value === 'inMid') {
    inputLevels.value[1] = Math.max(inputLevels.value[0] + 1, Math.min(val, inputLevels.value[2] - 1));
  } else if (dragging.value === 'inWhite') {
    inputLevels.value[2] = Math.max(inputLevels.value[1] + 1, val);
  }
  emit('update:levels', { input: [...inputLevels.value], output: [0, 65535] });
  if (livePreview.value) emit('applyStretch');
}
function onHandleUp() {
  if (!dragging.value) return;
  dragging.value = null;
  window.removeEventListener('mousemove', onHandleMove);
  window.removeEventListener('touchmove', onHandleMove);
  window.removeEventListener('mouseup', onHandleUp);
  window.removeEventListener('touchend', onHandleUp);
  emit('update:levels', { input: [...inputLevels.value], output: [0, 65535] });
  emit('applyStretch');
}
function getHandleValue(type: typeof dragging.value) {
  if (type === 'inBlack') return inputLevels.value[0];
  if (type === 'inMid') return inputLevels.value[1];
  if (type === 'inWhite') return inputLevels.value[2];
  return 0;
}

// Numeric entry handlers
function onInputLevelChange(idx: number, val: number) {
  if (idx === 0) inputLevels.value[0] = Math.min(val, inputLevels.value[1] - 1);
  if (idx === 1) inputLevels.value[1] = Math.max(inputLevels.value[0] + 1, Math.min(val, inputLevels.value[2] - 1));
  if (idx === 2) inputLevels.value[2] = Math.max(inputLevels.value[1] + 1, val);
  emit('update:levels', { input: [...inputLevels.value], output: [0, 65535] });
}

// Keyboard nudge
function onHandleKeydown(e: KeyboardEvent, type: typeof dragging.value) {
  let arr, idx, min, max;
  if (type === 'inBlack') { arr = inputLevels.value; idx = 0; min = 0; max = arr[1] - 1; }
  else if (type === 'inMid') { arr = inputLevels.value; idx = 1; min = arr[0] + 1; max = arr[2] - 1; }
  else if (type === 'inWhite') { arr = inputLevels.value; idx = 2; min = arr[1] + 1; max = 65535; }
  else return;
  const step = e.shiftKey ? 10 : 1;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') arr[idx] = Math.max(min, arr[idx] - step);
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') arr[idx] = Math.min(max, arr[idx] + step);
  emit('update:levels', { input: [...inputLevels.value], output: [0, 65535] });
  if (livePreview.value) emit('applyStretch');
}

// Live preview toggle
function toggleLivePreview() {
  livePreview.value = !livePreview.value;
  emit('update:livePreview', livePreview.value);
}

// Auto buttons
function onAutoWindow() { emit('autoWindow'); }
function onAutoStretch() { emit('autoStretch'); }

// Watch for prop changes
watch(() => props.initialLevels, (val) => {
  if (Array.isArray(val) && val.length === 3) {
    inputLevels.value = [...val];
  }
});

</script>

<template>
  <div class="histogram-stretch-control">
    <svg :width="svgWidth" :height="svgHeight" tabindex="0">
      <!-- Histogram -->
      <path :d="histPath" fill="#888" fill-opacity="0.5" stroke="#444" stroke-width="1" />
      <!-- Input handles -->
      <circle
        :cx="valueToX(inputLevels[0])" :cy="histY + histHeight" :r="handleRadius"
        fill="#222" stroke="#fff" stroke-width="2"
        :class="{ handle: true, active: dragging==='inBlack' || hoverHandle==='inBlack' }" :tabindex="0"
        @mousedown="e => onHandleDown('inBlack', e)" @touchstart="e => onHandleDown('inBlack', e)"
        @mouseenter="hoverHandle='inBlack'"
        @mouseleave="hoverHandle=null" @keydown="e => onHandleKeydown(e, 'inBlack')"
      />
      <circle
        :cx="valueToX(inputLevels[1])" :cy="histY + histHeight - 20" :r="handleRadius"
        fill="#0af" stroke="#fff" stroke-width="2"
        :class="{ handle: true, active: dragging==='inMid' || hoverHandle==='inMid' }" :tabindex="0"
        @mousedown="e => onHandleDown('inMid', e)" @touchstart="e => onHandleDown('inMid', e)"
        @mouseenter="hoverHandle='inMid'"
        @mouseleave="hoverHandle=null" @keydown="e => onHandleKeydown(e, 'inMid')"
      />
      <circle
        :cx="valueToX(inputLevels[2])" :cy="histY + histHeight" :r="handleRadius"
        fill="#fff" stroke="#222" stroke-width="2"
        :class="{ handle: true, active: dragging==='inWhite' || hoverHandle==='inWhite' }" :tabindex="0"
        @mousedown="e => onHandleDown('inWhite', e)" @touchstart="e => onHandleDown('inWhite', e)"
        @mouseenter="hoverHandle='inWhite'"
        @mouseleave="hoverHandle=null" @keydown="e => onHandleKeydown(e, 'inWhite')"
      />
      <!-- Tooltips -->
      <g v-if="hoverHandle">
        <rect
          :x="valueToX(getHandleValue(hoverHandle)) - 30"
          :y="histY + histHeight - 40"
          width="60" height="22" rx="4" fill="#222" fill-opacity="0.9" />
        <text
          :x="valueToX(getHandleValue(hoverHandle))"
          :y="histY + histHeight - 25"
          text-anchor="middle" fill="#fff" font-size="14">
          {{
            hoverHandle === 'inBlack' ? `Black: ${inputLevels[0]}` :
            hoverHandle === 'inMid' ? `Mid: ${inputLevels[1]}` :
            hoverHandle === 'inWhite' ? `White: ${inputLevels[2]}` : ''
          }}
        </text>
      </g>
    </svg>
    <div class="levels-numeric-row">
      <label>Black: <input v-model.number="inputLevels[0]" type="number" min="0" :max="inputLevels[1]-1" @change="onInputLevelChange(0, inputLevels[0])" /></label>
      <label>Mid: <input v-model.number="inputLevels[1]" type="number" :min="inputLevels[0]+1" :max="inputLevels[2]-1" @change="onInputLevelChange(1, inputLevels[1])" /></label>
      <label>White: <input v-model.number="inputLevels[2]" type="number" :min="inputLevels[1]+1" max="65535" @change="onInputLevelChange(2, inputLevels[2])" /></label>
      <button @click="onAutoWindow">Auto Window</button>
      <button @click="onAutoStretch">Auto Stretch</button>
      <label><input v-model="livePreview" type="checkbox" @change="toggleLivePreview" /> Live Preview</label>
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
  user-select: none;
  cursor: pointer;
  background: var(--aw-panel-content-bg-color, #222);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.handle {
  cursor: pointer;
  transition: r 0.1s, stroke-width 0.1s;
}
.handle.active {
  r: 13 !important;
  stroke-width: 3 !important;
}
.levels-numeric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.95rem;
}
.levels-numeric-row label {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
.levels-numeric-row input[type="number"] {
  width: 70px;
  padding: 0.2rem 0.4rem;
  font-size: 0.95rem;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color, #444);
  background: var(--aw-input-bg-color, #222);
  color: var(--aw-color-text-primary, #fff);
}
.levels-numeric-row button {
  padding: 0.2rem 0.8rem;
  font-size: 0.95rem;
  border-radius: 4px;
  border: 1px solid var(--aw-panel-border-color, #444);
  background: var(--aw-button-primary-bg, #0af);
  color: var(--aw-button-primary-text, #fff);
  cursor: pointer;
}
.levels-numeric-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.levels-numeric-row input[type="checkbox"] {
  margin-left: 0.5rem;
}
</style> 