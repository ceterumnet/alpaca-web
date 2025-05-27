// HistogramWorker.ts - Web Worker for full histogram calculation

self.onmessage = function(e) {
  const { id, data, width, height, binCount, channels, order, lut } = e.data;
  const histogram = calculateFullHistogram(data, width, height, binCount, channels, order, lut);
  (self as unknown as Worker).postMessage({ id, histogram });
};

function getValue(data: Uint8Array | Uint16Array | Uint32Array | number[], idx: number): number {
  if (Array.isArray(data)) return data[idx];
  return data[idx];
}

function calculateFullHistogram(
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  width: number,
  height: number,
  binCount: number,
  channels: 1 | 3,
  order: 'column-major' | 'row-major',
  lut: Uint8Array
): number[] {
  const displayBins = binCount;
  const displayHist = new Array(displayBins).fill(0);
  if (channels === 1) {
    // Column-major
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const idx = x * height + y;
        const value = getValue(data, idx);
        const displayValue = lut[Math.min(lut.length - 1, Math.max(0, Math.round(value)))];
        const displayBin = Math.min(displayBins - 1, Math.max(0, Math.round(displayValue)));
        displayHist[displayBin]++;
      }
    }
  } else {
    // Row-major RGB: use luminance of stretched values
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const baseIdx = (y * width + x) * 3;
        const r = lut[Math.min(lut.length - 1, Math.max(0, Math.round(getValue(data, baseIdx))))];
        const g = lut[Math.min(lut.length - 1, Math.max(0, Math.round(getValue(data, baseIdx + 1))))];
        const b = lut[Math.min(lut.length - 1, Math.max(0, Math.round(getValue(data, baseIdx + 2))))];
        const luminance = (r + g + b) / 3;
        const displayBin = Math.min(displayBins - 1, Math.max(0, Math.round(luminance)));
        displayHist[displayBin]++;
      }
    }
  }
  return displayHist;
} 