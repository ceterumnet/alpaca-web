// DisplayImageWorker.ts - Web Worker for generateDisplayImage

// Minimal dependencies from ASCOMImageBytes.ts

import init, {
  generate_display_image_u8,
  generate_display_image_u16,
  generate_display_image_u32
} from 'image_wasm';

// Add this at the top if not present
// declare var DedicatedWorkerGlobalScope: { prototype: DedicatedWorkerGlobalScope; new(): DedicatedWorkerGlobalScope };
// interface DedicatedWorkerGlobalScope extends Worker {
//   postMessage(message: any, transfer?: Transferable[]): void;
// }

console.log('[worker] loaded');

const messageQueue: MessageEvent[] = [];
let wasmReady = false;

self.onmessage = function(e) {
  if (!wasmReady) {
    console.log('[worker] QUEUED message', e.data);
    messageQueue.push(e);
  }
};

await init();
wasmReady = true;
console.log('[worker] WASM initialized');

// Process any queued messages
for (const e of messageQueue) {
  await handleMessage(e);
}

// Now set the real handler
self.onmessage = handleMessage;

async function handleMessage(e: MessageEvent) {
  console.log('[worker] onmessage: received', e.data);
  const { id, data, width, height, lut, channels } = e.data;
  const output = new Uint8Array(width * height * 4);

  const timingLabel = `[worker] WASM processing (id=${id})`;
  console.time(timingLabel);

  if (data instanceof Uint8Array) {
    console.log('[worker] Calling generate_display_image_u8', { length: data.length, width, height, lutLength: lut.length, channels });
    generate_display_image_u8(data, width, height, lut, channels, output);
  } else if (data instanceof Uint16Array) {
    console.log('[worker] Calling generate_display_image_u16', { length: data.length, width, height, lutLength: lut.length, channels });
    generate_display_image_u16(data, width, height, lut, channels, output);
  } else if (data instanceof Uint32Array) {
    console.log('[worker] Calling generate_display_image_u32', { length: data.length, width, height, lutLength: lut.length, channels });
    generate_display_image_u32(data, width, height, lut, channels, output);
  } else {
    console.error('[worker] Unsupported data type', data);
    return;
  }

  console.timeEnd(timingLabel);

  const clamped = new Uint8ClampedArray(output.buffer);
  console.log('[worker] Posting result', { length: clamped.length, sample: clamped.slice(0, 16) });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).postMessage({ id, outputData: clamped }, [clamped.buffer]);
}

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