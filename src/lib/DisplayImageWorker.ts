// DisplayImageWorker.ts - Web Worker for generateDisplayImage

// Minimal dependencies from ASCOMImageBytes.ts

import init, {
  generate_display_image_u8,
  generate_display_image_u16,
  generate_display_image_u32
} from 'image_wasm';

const messageQueue: MessageEvent[] = [];
let wasmReady = false;

async function handleMessage(e: MessageEvent) {
  // console.log('[worker] onmessage: received', e.data);
  const { id, data, width, height, lut, channels } = e.data;
  const output = new Uint8Array(width * height * 4);

  if (data instanceof Uint8Array) {
    generate_display_image_u8(data, width, height, lut, channels, output);
  } else if (data instanceof Uint16Array) {
    generate_display_image_u16(data, width, height, lut, channels, output);
  } else if (data instanceof Uint32Array) {
    generate_display_image_u32(data, width, height, lut, channels, output);
  } else {
    return;
  }

  const clamped = new Uint8ClampedArray(output.buffer);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).postMessage({ id, outputData: clamped }, [clamped.buffer]);
}

function queueOrHandleMessage(e: MessageEvent) {
  if (!wasmReady) {
    messageQueue.push(e);
    return;
  }
  handleMessage(e);
}

async function main() {
  await init();
  wasmReady = true;
  for (const e of messageQueue) {
    await handleMessage(e);
  }
  self.onmessage = handleMessage;
}

self.onmessage = queueOrHandleMessage;

main();

