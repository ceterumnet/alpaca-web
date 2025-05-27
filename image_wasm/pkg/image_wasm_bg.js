let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}


let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
 * Convert a mono or RGB image (u8 input) to RGBA u8 output using a LUT.
 * @param {Uint8Array} data
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} lut
 * @param {number} channels
 * @param {Uint8Array} output
 */
export function generate_display_image_u8(data, width, height, lut, channels, output) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(lut, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    var ptr2 = passArray8ToWasm0(output, wasm.__wbindgen_malloc);
    var len2 = WASM_VECTOR_LEN;
    wasm.generate_display_image_u8(ptr0, len0, width, height, ptr1, len1, channels, ptr2, len2, output);
}

let cachedUint16ArrayMemory0 = null;

function getUint16ArrayMemory0() {
    if (cachedUint16ArrayMemory0 === null || cachedUint16ArrayMemory0.byteLength === 0) {
        cachedUint16ArrayMemory0 = new Uint16Array(wasm.memory.buffer);
    }
    return cachedUint16ArrayMemory0;
}

function passArray16ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 2, 2) >>> 0;
    getUint16ArrayMemory0().set(arg, ptr / 2);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
 * Convert a mono or RGB image (u16 input) to RGBA u8 output using a LUT.
 * @param {Uint16Array} data
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} lut
 * @param {number} channels
 * @param {Uint8Array} output
 */
export function generate_display_image_u16(data, width, height, lut, channels, output) {
    const ptr0 = passArray16ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(lut, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    var ptr2 = passArray8ToWasm0(output, wasm.__wbindgen_malloc);
    var len2 = WASM_VECTOR_LEN;
    wasm.generate_display_image_u16(ptr0, len0, width, height, ptr1, len1, channels, ptr2, len2, output);
}

let cachedUint32ArrayMemory0 = null;

function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
 * Convert a mono or RGB image (u32 input) to RGBA u8 output using a LUT.
 * @param {Uint32Array} data
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} lut
 * @param {number} channels
 * @param {Uint8Array} output
 */
export function generate_display_image_u32(data, width, height, lut, channels, output) {
    const ptr0 = passArray32ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(lut, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    var ptr2 = passArray8ToWasm0(output, wasm.__wbindgen_malloc);
    var len2 = WASM_VECTOR_LEN;
    wasm.generate_display_image_u32(ptr0, len0, width, height, ptr1, len1, channels, ptr2, len2, output);
}

export function __wbindgen_copy_to_typed_array(arg0, arg1, arg2) {
    new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
};

export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_export_0;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
    ;
};

