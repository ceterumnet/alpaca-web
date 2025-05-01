/**
 * Library for parsing and processing ASCOM ImageBytes format
 * Based on ASCOM specification: https://ascom-standards.org/Help/Developer/html/T_ASCOM_DeviceInterface_ImageArrayElementTypes.htm
 */

// Type definitions for ASCOM Image data
export interface ImageMetadata {
  metadataVersion: number
  errorNumber: number
  dataStart: number
  imageElementType: number
  transmissionElementType: number
  rank: number
  dimension1: number // width
  dimension2: number // height
  dimension3: number // depth/color planes
  hasMetadata: boolean
}

export interface ProcessedImageData {
  width: number
  height: number
  pixelData: Uint8Array | Uint16Array | Uint32Array | number[]
  originalPixelData?:
    | Uint8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | number[]
  imageType: 'monochrome' | 'color'
  metadata: ImageMetadata
  minPixelValue: number
  maxPixelValue: number
  meanPixelValue: number
  bitsPerPixel: number
}

/**
 * ASCOM image element types (from ASCOM spec)
 */
export enum ImageElementType {
  Unknown = 0,
  Int16 = 1,
  Int32 = 2,
  Double = 3,
  Single = 4,
  UInt64 = 5,
  Byte = 6,
  Int64 = 7,
  UInt16 = 8,
  UInt32 = 9
}

/**
 * Parse ASCOM ImageBytes metadata from ArrayBuffer
 */
export function parseImageMetadata(
  buffer: ArrayBuffer,
  defaultWidth = 0,
  defaultHeight = 0
): ImageMetadata {
  // Default metadata if parsing fails
  const defaultMetadata: ImageMetadata = {
    metadataVersion: 1,
    errorNumber: 0,
    dataStart: 0,
    imageElementType: ImageElementType.UInt16, // Default to UInt16
    transmissionElementType: ImageElementType.UInt16,
    rank: 2,
    dimension1: defaultWidth,
    dimension2: defaultHeight,
    dimension3: 1,
    hasMetadata: false
  }

  // Check if buffer is too small to contain metadata
  if (buffer.byteLength < 44) {
    console.warn('Image buffer too small to contain ASCOM metadata header')
    return defaultMetadata
  }

  try {
    const dataView = new DataView(buffer)

    // Read metadata from ASCOM format header
    const metadata: ImageMetadata = {
      metadataVersion: dataView.getInt32(0, true),
      errorNumber: dataView.getInt32(4, true),
      dataStart: dataView.getInt32(16, true),
      imageElementType: dataView.getInt32(20, true),
      transmissionElementType: dataView.getInt32(24, true),
      rank: dataView.getInt32(28, true),
      dimension1: dataView.getInt32(32, true),
      dimension2: dataView.getInt32(36, true),
      dimension3: dataView.getInt32(40, true),
      hasMetadata: true
    }

    // Validate metadata
    if (
      metadata.metadataVersion > 0 &&
      metadata.dataStart >= 44 &&
      metadata.dataStart < buffer.byteLength &&
      metadata.dimension1 > 0 &&
      metadata.dimension2 > 0
    ) {
      return metadata
    } else {
      console.warn('Invalid ASCOM metadata, using default')
      return defaultMetadata
    }
  } catch (error) {
    console.error('Error parsing image metadata:', error)
    return defaultMetadata
  }
}

/**
 * Get bits per pixel based on image element type
 */
export function getBitsPerPixel(imageElementType: number): number {
  switch (imageElementType) {
    case ImageElementType.Int16:
    case ImageElementType.UInt16:
      return 16
    case ImageElementType.Int32:
    case ImageElementType.UInt32:
    case ImageElementType.Single:
      return 32
    case ImageElementType.Double:
    case ImageElementType.UInt64:
    case ImageElementType.Int64:
      return 64
    case ImageElementType.Byte:
    default:
      return 8
  }
}

/**
 * Convert ArrayBuffer to appropriate typed array based on metadata
 * This is where we handle the ASCOM image data format conversion
 */
export function processImageBytes(
  buffer: ArrayBuffer,
  defaultWidth = 0,
  defaultHeight = 0
): ProcessedImageData {
  // Parse metadata
  const metadata = parseImageMetadata(buffer, defaultWidth, defaultHeight)

  // Calculate dimensions
  const width = metadata.dimension1
  const height = metadata.dimension2
  const pixelCount = width * height

  // Determine the data start offset
  const dataStart = metadata.hasMetadata ? metadata.dataStart : 0

  // Ensure data is valid
  if (pixelCount <= 0 || dataStart >= buffer.byteLength) {
    console.error('Invalid image dimensions or data offset')
    return {
      width: 0,
      height: 0,
      pixelData: new Uint8Array(0),
      imageType: 'monochrome',
      metadata,
      minPixelValue: 0,
      maxPixelValue: 0,
      meanPixelValue: 0,
      bitsPerPixel: 8
    }
  }

  try {
    // Determine the bits per pixel
    const bitsPerPixel = getBitsPerPixel(metadata.imageElementType)

    // Ensure aligned memory access
    const alignedOffset = getAlignedOffset(dataStart, metadata.transmissionElementType)

    // Extract the raw pixel data based on transmission element type
    const originalPixelData = extractTypedArray(
      buffer,
      metadata.transmissionElementType,
      alignedOffset,
      pixelCount
    )

    // Create a standardized pixel array (we'll convert all to UInt16 for simplicity)
    // Later we can adapt this to support higher bit depths if needed
    let pixelData: Uint8Array | Uint16Array | Uint32Array | number[]

    // For 8-bit images, use Uint8Array
    if (bitsPerPixel <= 8) {
      pixelData = convertToUint8Array(originalPixelData)
    }
    // For most common 16-bit images, use Uint16Array
    else if (bitsPerPixel <= 16) {
      pixelData = convertToUint16Array(originalPixelData, metadata.transmissionElementType)
    }
    // For higher bit depths, use Uint32Array
    else {
      pixelData = convertToUint32Array(originalPixelData, metadata.transmissionElementType)
    }

    // Calculate image statistics (min, max, mean)
    const stats = calculateImageStatistics(pixelData, width, height)

    // Determine if color or monochrome
    const imageType = metadata.rank === 3 && metadata.dimension3 === 3 ? 'color' : 'monochrome'

    // Return processed image data
    return {
      width,
      height,
      pixelData,
      originalPixelData,
      imageType,
      metadata,
      minPixelValue: stats.min,
      maxPixelValue: stats.max,
      meanPixelValue: stats.mean,
      bitsPerPixel
    }
  } catch (error) {
    console.error('Error processing image bytes:', error)
    return {
      width: 0,
      height: 0,
      pixelData: new Uint8Array(0),
      imageType: 'monochrome',
      metadata,
      minPixelValue: 0,
      maxPixelValue: 0,
      meanPixelValue: 0,
      bitsPerPixel: 8
    }
  }
}

/**
 * Get properly aligned memory offset for different data types
 */
function getAlignedOffset(offset: number, elementType: number): number {
  // For 16-bit types, ensure 2-byte alignment
  if (elementType === ImageElementType.Int16 || elementType === ImageElementType.UInt16) {
    return offset % 2 === 0 ? offset : offset + 1
  }
  // For 32-bit types, ensure 4-byte alignment
  if (
    elementType === ImageElementType.Int32 ||
    elementType === ImageElementType.UInt32 ||
    elementType === ImageElementType.Single
  ) {
    return offset % 4 === 0 ? offset : offset + (4 - (offset % 4))
  }
  // For 64-bit types, ensure 8-byte alignment
  if (
    elementType === ImageElementType.Double ||
    elementType === ImageElementType.Int64 ||
    elementType === ImageElementType.UInt64
  ) {
    return offset % 8 === 0 ? offset : offset + (8 - (offset % 8))
  }
  return offset
}

/**
 * Extract typed array from buffer based on element type
 */
function extractTypedArray(
  buffer: ArrayBuffer,
  elementType: number,
  offset: number,
  pixelCount: number
):
  | Uint8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array
  | number[] {
  try {
    switch (elementType) {
      case ImageElementType.Byte:
        return new Uint8Array(buffer, offset, pixelCount)
      case ImageElementType.Int16:
        return new Int16Array(buffer, offset, pixelCount)
      case ImageElementType.UInt16:
        return new Uint16Array(buffer, offset, pixelCount)
      case ImageElementType.Int32:
        return new Int32Array(buffer, offset, pixelCount)
      case ImageElementType.UInt32:
        return new Uint32Array(buffer, offset, pixelCount)
      case ImageElementType.Single:
        return new Float32Array(buffer, offset, pixelCount)
      case ImageElementType.Double:
        return new Float64Array(buffer, offset, pixelCount)
      default:
        // Manual extraction using DataView for unsupported types
        return extractWithDataView(buffer, elementType, offset, pixelCount)
    }
  } catch (error) {
    console.warn(
      'Failed to create direct typed array view, falling back to manual extraction',
      error
    )
    return extractWithDataView(buffer, elementType, offset, pixelCount)
  }
}

/**
 * Manual extraction using DataView when direct typed array access fails
 */
function extractWithDataView(
  buffer: ArrayBuffer,
  elementType: number,
  offset: number,
  pixelCount: number
): number[] {
  const result = new Array(pixelCount)
  const dataView = new DataView(buffer)

  // Determine bytes per element
  let bytesPerElement = 2 // Default to 16-bit
  if (elementType === ImageElementType.Byte) {
    bytesPerElement = 1
  } else if (
    elementType === ImageElementType.Int32 ||
    elementType === ImageElementType.UInt32 ||
    elementType === ImageElementType.Single
  ) {
    bytesPerElement = 4
  } else if (
    elementType === ImageElementType.Double ||
    elementType === ImageElementType.Int64 ||
    elementType === ImageElementType.UInt64
  ) {
    bytesPerElement = 8
  }

  // Extract data
  for (let i = 0; i < pixelCount; i++) {
    const pixelOffset = offset + i * bytesPerElement
    if (pixelOffset + bytesPerElement > buffer.byteLength) break

    try {
      switch (elementType) {
        case ImageElementType.Byte:
          result[i] = dataView.getUint8(pixelOffset)
          break
        case ImageElementType.Int16:
          result[i] = dataView.getInt16(pixelOffset, true)
          break
        case ImageElementType.UInt16:
          result[i] = dataView.getUint16(pixelOffset, true)
          break
        case ImageElementType.Int32:
          result[i] = dataView.getInt32(pixelOffset, true)
          break
        case ImageElementType.UInt32:
          result[i] = dataView.getUint32(pixelOffset, true)
          break
        case ImageElementType.Single:
          result[i] = dataView.getFloat32(pixelOffset, true)
          break
        case ImageElementType.Double:
          result[i] = dataView.getFloat64(pixelOffset, true)
          break
        default:
          result[i] = 0
      }
    } catch (e) {
      console.warn(`Error reading pixel at offset ${pixelOffset}`, e)
      result[i] = 0
    }
  }

  return result
}

/**
 * Convert any typed array to Uint8Array
 */
function convertToUint8Array(
  data:
    | Uint8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | number[]
): Uint8Array {
  const length = data.length
  const result = new Uint8Array(length)

  for (let i = 0; i < length; i++) {
    // Handle overflow and convert to 8-bit range
    const value = Number(data[i])
    result[i] = Math.min(255, Math.max(0, Math.round(value)))
  }

  return result
}

/**
 * Convert any typed array to Uint16Array
 */
function convertToUint16Array(
  data:
    | Uint8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | number[],
  sourceType: number
): Uint16Array {
  const length = data.length
  const result = new Uint16Array(length)

  for (let i = 0; i < length; i++) {
    // Convert based on source type
    const value = Number(data[i])

    if (sourceType === ImageElementType.Int16) {
      // Convert signed Int16 to unsigned using bitwise operation
      result[i] = data[i] & 0xffff
    } else {
      // Scale or clamp other types to Uint16 range
      result[i] = Math.min(65535, Math.max(0, Math.round(value)))
    }
  }

  return result
}

/**
 * Convert any typed array to Uint32Array
 */
function convertToUint32Array(
  data:
    | Uint8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | number[],
  sourceType: number
): Uint32Array {
  const length = data.length
  const result = new Uint32Array(length)

  for (let i = 0; i < length; i++) {
    // Convert based on source type
    if (sourceType === ImageElementType.Int32) {
      // Convert signed Int32 to unsigned using unsigned right shift
      result[i] = data[i] >>> 0
    } else {
      // Scale or clamp other types
      const value = Number(data[i])
      result[i] = Math.max(0, Math.round(value))
    }
  }

  return result
}

/**
 * Calculate image statistics (min, max, mean) for any typed array
 * Uses sparse sampling for large images and handles column-major format
 */
function calculateImageStatistics(
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  width: number,
  height: number
): { min: number; max: number; mean: number } {
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE
  let sum = 0
  let count = 0

  // Use sparse sampling for large images
  const pixelCount = width * height
  const sampleStep = pixelCount > 1000000 ? Math.floor(Math.sqrt(pixelCount / 1000)) : 1

  // CRITICAL: ASCOM data is in column-major format
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      // Column-major indexing: idx = x * height + y
      const idx = x * height + y

      if (idx < data.length) {
        const val = Number(data[idx])
        if (!isNaN(val) && isFinite(val)) {
          min = Math.min(min, val)
          max = Math.max(max, val)
          sum += val
          count++
        }
      }
    }
  }

  // Sanity check for invalid results
  if (!isFinite(min) || !isFinite(max) || count === 0) {
    console.warn('Invalid statistics calculation, using defaults')
    if (data instanceof Uint8Array) {
      return { min: 0, max: 255, mean: 128 }
    } else if (data instanceof Uint16Array) {
      return { min: 0, max: 65535, mean: 32768 }
    } else {
      return { min: 0, max: 65535, mean: 32768 }
    }
  }

  return {
    min,
    max,
    mean: sum / count
  }
}

/**
 * Create an efficient lookup table for converting pixel values to display values
 * This is much more efficient than calculating conversions for each pixel
 */
export function createStretchLUT(
  min: number,
  max: number,
  method: 'linear' | 'log' | 'none' = 'linear',
  bitsPerPixel: number = 16
): Uint8Array {
  // Determine size of the LUT based on bit depth
  const lutSize = Math.min(65536, Math.pow(2, bitsPerPixel))
  const lut = new Uint8Array(lutSize)

  // Range check
  const range = max - min
  if (range <= 0) {
    // Fill with zeros for invalid range
    return lut
  }

  // Fill the LUT with appropriate values
  for (let i = 0; i < lutSize; i++) {
    // Get the normalized position in the original range
    const value = i < min ? min : i > max ? max : i

    // Calculate display value based on stretch method
    let displayValue = 0

    if (method === 'linear') {
      // Linear stretch
      displayValue = Math.round(((value - min) / range) * 255)
    } else if (method === 'log') {
      // Logarithmic stretch
      if (value <= 0) {
        displayValue = 0
      } else {
        const logMin = Math.log(Math.max(1, min))
        const logMax = Math.log(Math.max(2, max))
        const logRange = logMax - logMin

        if (logRange > 0) {
          displayValue = Math.round(((Math.log(Math.max(1, value)) - logMin) / logRange) * 255)
        }
      }
    } else {
      // No stretch - just scale to 8-bit
      displayValue = Math.round((value / (lutSize - 1)) * 255)
    }

    // Ensure value is in valid range
    lut[i] = Math.max(0, Math.min(255, displayValue))
  }

  return lut
}

/**
 * Efficiently generate a histogram from image data
 * Uses sparse sampling for large images and handles column-major format
 */
export function calculateHistogram(
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  width: number,
  height: number,
  min: number,
  max: number,
  binCount: number = 256
): number[] {
  // Initialize histogram bins
  const histogram = new Array(binCount).fill(0)

  // Use sparse sampling for large images
  const pixelCount = width * height
  const sampleStep = Math.max(1, Math.floor(Math.sqrt(pixelCount / 1000)))

  // Calculate scaling factor to map values to histogram bins
  const range = max - min
  if (range <= 0) return histogram

  const scaleFactor = (binCount - 1) / range

  // CRITICAL: ASCOM data is in column-major format
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      // Column-major indexing: idx = x * height + y
      const idx = x * height + y

      if (idx < data.length) {
        const value = Number(data[idx])

        // Skip NaN and non-finite values
        if (!isFinite(value) || isNaN(value)) continue

        // Scale the value to fit in histogram bins
        const bin = Math.min(binCount - 1, Math.max(0, Math.floor((value - min) * scaleFactor)))
        if (bin >= 0 && bin < binCount) {
          histogram[bin]++
        }
      }
    }
  }

  return histogram
}

/**
 * Generate an 8-bit image using a lookup table for display
 * Much more efficient than calculating stretch for each pixel
 */
export function generateDisplayImage(
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  width: number,
  height: number,
  lut: Uint8Array
): Uint8ClampedArray {
  // Create output RGBA data (for canvas)
  const outputLength = width * height * 4
  const outputData = new Uint8ClampedArray(outputLength)

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Column-major source index (ASCOM format)
      const sourceIdx = x * height + y

      // Row-major target index (Canvas format)
      const targetIdx = (y * width + x) * 4

      // Bounds checking
      if (sourceIdx >= data.length || targetIdx + 3 >= outputData.length) {
        continue
      }

      // Get the source value
      const value = Number(data[sourceIdx])

      // Convert using lookup table
      let displayValue = 0

      if (!isFinite(value) || isNaN(value)) {
        // Handle invalid values
        displayValue = 0
      } else {
        // Use LUT for efficient conversion
        // For values outside the LUT range, clamp to valid indices
        const lutIndex = Math.min(lut.length - 1, Math.max(0, Math.round(value)))
        displayValue = lut[lutIndex]
      }

      // Set RGB values (grayscale)
      outputData[targetIdx] = displayValue // R
      outputData[targetIdx + 1] = displayValue // G
      outputData[targetIdx + 2] = displayValue // B
      outputData[targetIdx + 3] = 255 // A
    }
  }

  return outputData
}
