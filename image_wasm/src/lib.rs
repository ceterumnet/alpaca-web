use wasm_bindgen::prelude::*;

/// Convert a mono or RGB image (u8 input) to RGBA u8 output using a LUT.
#[wasm_bindgen]
pub fn generate_display_image_u8(
    data: &[u8],
    width: usize,
    height: usize,
    lut: &[u8],
    channels: u8,
    output: &mut [u8],
) {
    let pixel_count = width * height;
    if channels == 1 {
        for idx in 0..pixel_count {
            let tgt_idx = idx * 4;
            let value = data[idx] as usize;
            let display = lut.get(value).copied().unwrap_or(0);
            output[tgt_idx] = display;
            output[tgt_idx + 1] = display;
            output[tgt_idx + 2] = display;
            output[tgt_idx + 3] = 255;
        }
    } else if channels == 3 {
        for idx in 0..pixel_count {
            let base = idx * 3;
            let tgt_idx = idx * 4;
            let r = lut.get(data[base] as usize).copied().unwrap_or(0);
            let g = lut.get(data[base + 1] as usize).copied().unwrap_or(0);
            let b = lut.get(data[base + 2] as usize).copied().unwrap_or(0);
            output[tgt_idx] = r;
            output[tgt_idx + 1] = g;
            output[tgt_idx + 2] = b;
            output[tgt_idx + 3] = 255;
        }
    }
}

/// Convert a mono or RGB image (u16 input) to RGBA u8 output using a LUT.
#[wasm_bindgen]
pub fn generate_display_image_u16(
    data: &[u16],
    width: usize,
    height: usize,
    lut: &[u8],
    channels: u8,
    output: &mut [u8],
) {
    let pixel_count = width * height;
    if channels == 1 {
        for idx in 0..pixel_count {
            let tgt_idx = idx * 4;
            let value = data[idx] as usize;
            let display = lut.get(value).copied().unwrap_or(0);
            output[tgt_idx] = display;
            output[tgt_idx + 1] = display;
            output[tgt_idx + 2] = display;
            output[tgt_idx + 3] = 255;
        }
    } else if channels == 3 {
        for idx in 0..pixel_count {
            let base = idx * 3;
            let tgt_idx = idx * 4;
            let r = lut.get(data[base] as usize).copied().unwrap_or(0);
            let g = lut.get(data[base + 1] as usize).copied().unwrap_or(0);
            let b = lut.get(data[base + 2] as usize).copied().unwrap_or(0);
            output[tgt_idx] = r;
            output[tgt_idx + 1] = g;
            output[tgt_idx + 2] = b;
            output[tgt_idx + 3] = 255;
        }
    }
}

/// Convert a mono or RGB image (u32 input) to RGBA u8 output using a LUT.
#[wasm_bindgen]
pub fn generate_display_image_u32(
    data: &[u32],
    width: usize,
    height: usize,
    lut: &[u8],
    channels: u8,
    output: &mut [u8],
) {
    let pixel_count = width * height;
    if channels == 1 {
        for idx in 0..pixel_count {
            let tgt_idx = idx * 4;
            let value = data[idx] as usize;
            let display = lut.get(value).copied().unwrap_or(0);
            output[tgt_idx] = display;
            output[tgt_idx + 1] = display;
            output[tgt_idx + 2] = display;
            output[tgt_idx + 3] = 255;
        }
    } else if channels == 3 {
        for idx in 0..pixel_count {
            let base = idx * 3;
            let tgt_idx = idx * 4;
            let r = lut.get(data[base] as usize).copied().unwrap_or(0);
            let g = lut.get(data[base + 1] as usize).copied().unwrap_or(0);
            let b = lut.get(data[base + 2] as usize).copied().unwrap_or(0);
            output[tgt_idx] = r;
            output[tgt_idx + 1] = g;
            output[tgt_idx + 2] = b;
            output[tgt_idx + 3] = 255;
        }
    }
}

pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
