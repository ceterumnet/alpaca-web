/* tslint:disable */
/* eslint-disable */
/**
 * Convert a mono or RGB image (u8 input) to RGBA u8 output using a LUT.
 */
export function generate_display_image_u8(data: Uint8Array, width: number, height: number, lut: Uint8Array, channels: number, output: Uint8Array): void;
/**
 * Convert a mono or RGB image (u16 input) to RGBA u8 output using a LUT.
 */
export function generate_display_image_u16(data: Uint16Array, width: number, height: number, lut: Uint8Array, channels: number, output: Uint8Array): void;
/**
 * Convert a mono or RGB image (u32 input) to RGBA u8 output using a LUT.
 */
export function generate_display_image_u32(data: Uint32Array, width: number, height: number, lut: Uint8Array, channels: number, output: Uint8Array): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly generate_display_image_u8: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: any) => void;
  readonly generate_display_image_u16: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: any) => void;
  readonly generate_display_image_u32: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: any) => void;
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
