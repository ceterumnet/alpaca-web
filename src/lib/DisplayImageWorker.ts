// DisplayImageWorker.ts - Web Worker for generateDisplayImage

// Minimal dependencies from ASCOMImageBytes.ts

declare const self: Worker;

self.onmessage = function (e: MessageEvent) {
  console.time('worker:onmessage')
  const { data, width, height, lut, channels } = e.data;
  console.time('worker:generateDisplayImage')
  const result = generateDisplayImage(data, width, height, lut, channels);
  console.timeEnd('worker:generateDisplayImage')
  // Transferable: outputData.buffer
  self.postMessage({ outputData: result }, [result.buffer]);
  console.timeEnd('worker:onmessage')
};

function getValueAtIndex(
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  idx: number
): number {
  if (data instanceof Uint8Array || data instanceof Uint16Array || data instanceof Uint32Array) {
    return data[idx];
  } else if (Array.isArray(data)) {
    return data[idx];
  }
  return 0;
}

function generateDisplayImage(
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  width: number,
  height: number,
  lut: Uint8Array,
  channels: 1 | 3
): Uint8ClampedArray {
  const outputLength = width * height * 4;
  const outputData = new Uint8ClampedArray(outputLength);
  if (width === 0 || height === 0 || data.length === 0) return outputData;
  if (channels === 1) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sourceIdx = y * width + x;
        const targetIdx = (y * width + x) * 4;
        const value = getValueAtIndex(data, sourceIdx);
        const lutIndex = Math.min(lut.length - 1, Math.max(0, value));
        const displayValue = lut[lutIndex];
        outputData[targetIdx] = displayValue;
        outputData[targetIdx + 1] = displayValue;
        outputData[targetIdx + 2] = displayValue;
        outputData[targetIdx + 3] = 255;
      }
    }
  } else {
    const numPixels = width * height;
    for (let idx = 0, outIdx = 0; idx < numPixels; idx++, outIdx += 4) {
      const base = idx * 3;
      outputData[outIdx] = lut[Math.min(lut.length - 1, Math.max(0, getValueAtIndex(data, base)))];
      outputData[outIdx + 1] = lut[Math.min(lut.length - 1, Math.max(0, getValueAtIndex(data, base + 1)))];
      outputData[outIdx + 2] = lut[Math.min(lut.length - 1, Math.max(0, getValueAtIndex(data, base + 2)))];
      outputData[outIdx + 3] = 255;
    }
  }
  return outputData;
} 