/**
 * Library for parsing and processing ASCOM ImageBytes format
 * Based on ASCOM specification: https://ascom-standards.org/Help/Developer/html/T_ASCOM_DeviceInterface_ImageArrayElementTypes.htm
 */

import log from '@/plugins/logger'

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

export type BayerPattern = 'RGGB' | 'GRBG' | 'GBRG' | 'BGGR' // Common Bayer patterns

export interface ProcessedImageData {
  width: number
  height: number
  pixelData: Uint8Array | Uint16Array | Uint32Array | number[] // if channels === 3, this is row-major [R,G,B,R,G,B...]
  channels: 1 | 3 // 1 for monochrome, 3 for RGB
  isDebayered: boolean // True if debayering was applied
  originalPixelData?: Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | number[]
  imageType: 'monochrome' | 'color' // 'color' can be from rank 3 or from debayering
  metadata: ImageMetadata
  minPixelValue: number // Based on luminance for debayered images
  maxPixelValue: number // Based on luminance for debayered images
  meanPixelValue: number // Based on luminance for debayered images
  bitsPerPixel: number // For debayered, bits per original sensor pixel or per RGB channel
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
 * Debayers a monochrome image with a Bayer pattern to an RGB image.
 * Input: Column-major monochrome Bayer data.
 * Output: Row-major RGB data.
 */
export function debayerImage(
  bayerDataColMajor: Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | number[],
  width: number,
  height: number,
  pattern: BayerPattern,
  bitsPerPixel: number, // Bits per pixel of the input bayerData
  sourceType: ImageElementType // Original data type for proper interpretation
): { rgbDataRowMajor: Uint8Array | Uint16Array | Uint32Array; outputBpp: number } {
  const numPixels = width * height
  let rgbDataRowMajor: Uint8Array | Uint16Array | Uint32Array

  // Determine output array type based on input bitsPerPixel
  if (bitsPerPixel <= 8) {
    rgbDataRowMajor = new Uint8Array(numPixels * 3)
  } else if (bitsPerPixel <= 16) {
    rgbDataRowMajor = new Uint16Array(numPixels * 3)
  } else {
    // For 32-bit or higher, output as 32-bit per channel
    rgbDataRowMajor = new Uint32Array(numPixels * 3)
    bitsPerPixel = 32 // Standardize output BPP for higher inputs
  }

  // Helper to get pixel value from column-major bayerData safely
  const getPixel = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0 // Or handle borders differently
    const idx = x * height + y // Column-major
    if (idx < bayerDataColMajor.length) {
      let val = Number(bayerDataColMajor[idx])
      // Handle potential signed to unsigned conversion based on original type if necessary
      // This is important if input array is Int16Array/Int32Array but data represents unsigned values.
      // However, ASCOM spec usually has distinct types like UInt16.
      // The convertToUint16Array already handles Int16 -> Uint16 conversion by & 0xFFFF if needed.
      // Here, we assume bayerDataColMajor elements are already positive magnitude or handled by Number()
      if (sourceType === ImageElementType.Int16 && val < 0 && bitsPerPixel === 16) {
        // Example adjustment
        val = val & 0xffff // Simple way to treat Int16 as Uint16 positive magnitude
      } else if (sourceType === ImageElementType.Int32 && val < 0 && bitsPerPixel === 32) {
        val = val >>> 0 // Simple way to treat Int32 as Uint32 positive magnitude
      }
      return val
    }
    return 0
  }

  // Basic Bilinear Interpolation
  for (let y_coord = 0; y_coord < height; y_coord++) {
    for (let x_coord = 0; x_coord < width; x_coord++) {
      const targetIdx = (y_coord * width + x_coord) * 3 // Row-major for RGB output
      let r = 0,
        g = 0,
        b = 0

      if (pattern === 'RGGB') {
        if (y_coord % 2 === 0) {
          // Even rows: R G R G ...
          if (x_coord % 2 === 0) {
            // Even cols: R
            r = getPixel(x_coord, y_coord)
            g = Math.floor(
              (getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord) + getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 4
            )
            b = Math.floor(
              (getPixel(x_coord - 1, y_coord - 1) +
                getPixel(x_coord + 1, y_coord - 1) +
                getPixel(x_coord - 1, y_coord + 1) +
                getPixel(x_coord + 1, y_coord + 1)) /
                4
            )
          } else {
            // Odd cols: G
            g = getPixel(x_coord, y_coord)
            r = Math.floor((getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord)) / 2)
            b = Math.floor((getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 2)
          }
        } else {
          // Odd rows: G B G B ...
          if (x_coord % 2 === 0) {
            // Even cols: G
            g = getPixel(x_coord, y_coord)
            r = Math.floor((getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 2)
            b = Math.floor((getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord)) / 2)
          } else {
            // Odd cols: B
            b = getPixel(x_coord, y_coord)
            g = Math.floor(
              (getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord) + getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 4
            )
            r = Math.floor(
              (getPixel(x_coord - 1, y_coord - 1) +
                getPixel(x_coord + 1, y_coord - 1) +
                getPixel(x_coord - 1, y_coord + 1) +
                getPixel(x_coord + 1, y_coord + 1)) /
                4
            )
          }
        }
      } else if (pattern === 'GRBG') {
        if (y_coord % 2 === 0) {
          // Even rows: G R G R ...
          if (x_coord % 2 === 0) {
            // Even cols: G
            g = getPixel(x_coord, y_coord)
            r = Math.floor((getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 2) // R is vertical
            b = Math.floor((getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord)) / 2) // B is horizontal
          } else {
            // Odd cols: R
            r = getPixel(x_coord, y_coord)
            g = Math.floor(
              (getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord) + getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 4
            )
            b = Math.floor(
              (getPixel(x_coord - 1, y_coord - 1) +
                getPixel(x_coord + 1, y_coord - 1) +
                getPixel(x_coord - 1, y_coord + 1) +
                getPixel(x_coord + 1, y_coord + 1)) /
                4
            )
          }
        } else {
          // Odd rows: B G B G ...
          if (x_coord % 2 === 0) {
            // Even cols: B
            b = getPixel(x_coord, y_coord)
            g = Math.floor(
              (getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord) + getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 4
            )
            r = Math.floor(
              (getPixel(x_coord - 1, y_coord - 1) +
                getPixel(x_coord + 1, y_coord - 1) +
                getPixel(x_coord - 1, y_coord + 1) +
                getPixel(x_coord + 1, y_coord + 1)) /
                4
            )
          } else {
            // Odd cols: G
            g = getPixel(x_coord, y_coord)
            r = Math.floor((getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord)) / 2) // R is horizontal
            b = Math.floor((getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 2) // B is vertical
          }
        }
      } else if (pattern === 'GBRG') {
        if (y_coord % 2 === 0) {
          // Even rows: G B G B ...
          if (x_coord % 2 === 0) {
            // Even cols: G
            g = getPixel(x_coord, y_coord)
            b = Math.floor((getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 2) // B is vertical
            r = Math.floor((getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord)) / 2) // R is horizontal
          } else {
            // Odd cols: B
            b = getPixel(x_coord, y_coord)
            g = Math.floor(
              (getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord) + getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 4
            )
            r = Math.floor(
              (getPixel(x_coord - 1, y_coord - 1) +
                getPixel(x_coord + 1, y_coord - 1) +
                getPixel(x_coord - 1, y_coord + 1) +
                getPixel(x_coord + 1, y_coord + 1)) /
                4
            )
          }
        } else {
          // Odd rows: R G R G ...
          if (x_coord % 2 === 0) {
            // Even cols: R
            r = getPixel(x_coord, y_coord)
            g = Math.floor(
              (getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord) + getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 4
            )
            b = Math.floor(
              (getPixel(x_coord - 1, y_coord - 1) +
                getPixel(x_coord + 1, y_coord - 1) +
                getPixel(x_coord - 1, y_coord + 1) +
                getPixel(x_coord + 1, y_coord + 1)) /
                4
            )
          } else {
            // Odd cols: G
            g = getPixel(x_coord, y_coord)
            b = Math.floor((getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord)) / 2) // B is horizontal
            r = Math.floor((getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 2) // R is vertical
          }
        }
      } else if (pattern === 'BGGR') {
        if (y_coord % 2 === 0) {
          // Even rows: B G B G ...
          if (x_coord % 2 === 0) {
            // Even cols: B
            b = getPixel(x_coord, y_coord)
            g = Math.floor(
              (getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord) + getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 4
            )
            r = Math.floor(
              (getPixel(x_coord - 1, y_coord - 1) +
                getPixel(x_coord + 1, y_coord - 1) +
                getPixel(x_coord - 1, y_coord + 1) +
                getPixel(x_coord + 1, y_coord + 1)) /
                4
            )
          } else {
            // Odd cols: G
            g = getPixel(x_coord, y_coord)
            b = Math.floor((getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord)) / 2) // B is horizontal
            r = Math.floor((getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 2) // R is vertical
          }
        } else {
          // Odd rows: G R G R ...
          if (x_coord % 2 === 0) {
            // Even cols: G
            g = getPixel(x_coord, y_coord)
            b = Math.floor((getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 2) // B is vertical
            r = Math.floor((getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord)) / 2) // R is horizontal
          } else {
            // Odd cols: R
            r = getPixel(x_coord, y_coord)
            g = Math.floor(
              (getPixel(x_coord - 1, y_coord) + getPixel(x_coord + 1, y_coord) + getPixel(x_coord, y_coord - 1) + getPixel(x_coord, y_coord + 1)) / 4
            )
            b = Math.floor(
              (getPixel(x_coord - 1, y_coord - 1) +
                getPixel(x_coord + 1, y_coord - 1) +
                getPixel(x_coord - 1, y_coord + 1) +
                getPixel(x_coord + 1, y_coord + 1)) /
                4
            )
          }
        }
      } else {
        // Fallback for unknown pattern (should not happen if selectedBayerPattern is from defined list)
        const grayVal = getPixel(x_coord, y_coord)
        r = grayVal
        g = grayVal
        b = grayVal
      }

      const maxVal = bitsPerPixel <= 8 ? 255 : bitsPerPixel <= 16 ? 65535 : Math.pow(2, 32) - 1
      rgbDataRowMajor[targetIdx] = Math.min(maxVal, Math.max(0, Math.round(r)))
      rgbDataRowMajor[targetIdx + 1] = Math.min(maxVal, Math.max(0, Math.round(g)))
      rgbDataRowMajor[targetIdx + 2] = Math.min(maxVal, Math.max(0, Math.round(b)))
    }
  }
  return { rgbDataRowMajor, outputBpp: bitsPerPixel }
}

/**
 * Parse ASCOM ImageBytes metadata from ArrayBuffer
 */
export function parseImageMetadata(buffer: ArrayBuffer, defaultWidth = 0, defaultHeight = 0): ImageMetadata {
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
    log.warn('Image buffer too small to contain ASCOM metadata header')
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
      log.warn('Invalid ASCOM metadata, using default')
      return defaultMetadata
    }
  } catch (error) {
    log.error('Error parsing image metadata:', error)
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

// Utility: Convert column-major to row-major for mono images
function columnMajorToRowMajor<T extends Uint8Array | Uint16Array | Uint32Array | number[]>(
  data: T,
  width: number,
  height: number
): T {
  const result = new (Object.getPrototypeOf(data).constructor)(width * height) as T;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y * width + x] = data[x * height + y];
    }
  }
  return result;
}

export let processImageBytesCallCount = 0;

/**
 * Convert ArrayBuffer to appropriate typed array based on metadata
 * This is where we handle the ASCOM image data format conversion
 */
export function processImageBytes(
  buffer: ArrayBuffer,
  defaultWidth = 0,
  defaultHeight = 0,
  bayerPattern?: BayerPattern // Optional Bayer pattern for debayering
): ProcessedImageData {
  processImageBytesCallCount++;
  // Parse metadata
  const metadata = parseImageMetadata(buffer, defaultWidth, defaultHeight)

  // Calculate dimensions
  const width = metadata.dimension1
  const height = metadata.dimension2
  const pixelCount = width * height

  // Determine the data start offset
  const dataStart = metadata.hasMetadata ? metadata.dataStart : 0

  // Default processed image data for errors
  const errorImageData = (message: string): ProcessedImageData => {
    log.error(message)
    return {
      width: 0,
      height: 0,
      pixelData: new Uint8Array(0),
      channels: 1,
      isDebayered: false,
      imageType: 'monochrome',
      metadata,
      minPixelValue: 0,
      maxPixelValue: 0,
      meanPixelValue: 0,
      bitsPerPixel: 8
    }
  }

  // Ensure data is valid
  if (pixelCount <= 0 || dataStart >= buffer.byteLength) {
    return errorImageData('Invalid image dimensions or data offset')
  }

  try {
    // Determine the bits per pixel of the raw sensor data
    const rawBitsPerPixel = getBitsPerPixel(metadata.imageElementType)

    // Ensure aligned memory access
    const alignedOffset = getAlignedOffset(dataStart, metadata.transmissionElementType)

    // Extract the raw pixel data based on transmission element type (column-major)
    let originalMonoPixelData = extractTypedArray(buffer, metadata.transmissionElementType, alignedOffset, pixelCount)

    // --- Forced conversion to typed array if needed ---
    if (Array.isArray(originalMonoPixelData)) {
      if (rawBitsPerPixel <= 8) {
        originalMonoPixelData = new Uint8Array(originalMonoPixelData)
      } else if (rawBitsPerPixel <= 16) {
        originalMonoPixelData = new Uint16Array(originalMonoPixelData)
      } else {
        originalMonoPixelData = new Uint32Array(originalMonoPixelData)
      }
    }

    let finalPixelData: Uint8Array | Uint16Array | Uint32Array | number[]
    let finalChannels: 1 | 3 = 1
    let isDebayered = false
    let imageType: 'monochrome' | 'color' = metadata.rank === 3 && metadata.dimension3 === 3 ? 'color' : 'monochrome'
    let effectiveBitsPerPixel = rawBitsPerPixel

    if (bayerPattern && imageType === 'monochrome' && width > 0 && height > 0) {
      // Perform debayering if a pattern is specified and image is monochrome
      const debayeredResult = debayerImage(
        originalMonoPixelData,
        width,
        height,
        bayerPattern,
        rawBitsPerPixel,
        metadata.transmissionElementType // Pass source type for correct interpretation
      )
      finalPixelData = debayeredResult.rgbDataRowMajor
      effectiveBitsPerPixel = debayeredResult.outputBpp // Use output BPP from debayer
      finalChannels = 3
      isDebayered = true
      imageType = 'color' // Image is now color
    } else {
      // Standard processing for monochrome or pre-colored (rank 3) images
      if (rawBitsPerPixel <= 8) {
        finalPixelData = convertToUint8Array(originalMonoPixelData)
      } else if (rawBitsPerPixel <= 16) {
        finalPixelData = convertToUint16Array(originalMonoPixelData, metadata.transmissionElementType)
      } else {
        finalPixelData = convertToUint32Array(originalMonoPixelData, metadata.transmissionElementType)
        effectiveBitsPerPixel = 32 // Standardize to 32 BPP for higher inputs after conversion
      }
      // One-time conversion to row-major for mono images
      if (imageType === 'monochrome' && width > 0 && height > 0) {
        finalPixelData = columnMajorToRowMajor(finalPixelData, width, height)
      }
    }

    // Calculate image statistics (min, max, mean)
    // Now always row-major for both mono and RGB
    const stats = calculateImageStatistics(
      finalPixelData, // Always row-major now
      width,
      height,
      finalChannels, // Pass channels
      'row-major', // Always row-major
      effectiveBitsPerPixel // Pass BPP for luminance calc if needed
    )

    // Return processed image data
    return {
      width,
      height,
      pixelData: finalPixelData,
      channels: finalChannels,
      isDebayered,
      originalPixelData: originalMonoPixelData, // Store original mono data (now always typed array)
      imageType,
      metadata,
      minPixelValue: stats.min,
      maxPixelValue: stats.max,
      meanPixelValue: stats.mean,
      bitsPerPixel: effectiveBitsPerPixel // This now means bits per channel for RGB
    }
  } catch (error) {
    log.error('Error processing image bytes:', error)
    return errorImageData(`Error processing image bytes: ${error}`)
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
  if (elementType === ImageElementType.Int32 || elementType === ImageElementType.UInt32 || elementType === ImageElementType.Single) {
    return offset % 4 === 0 ? offset : offset + (4 - (offset % 4))
  }
  // For 64-bit types, ensure 8-byte alignment
  if (elementType === ImageElementType.Double || elementType === ImageElementType.Int64 || elementType === ImageElementType.UInt64) {
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
): Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | number[] {
  log.debug('Extracting typed array from buffer')
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
    log.warn('Failed to create direct typed array view, falling back to manual extraction', error)
    return extractWithDataView(buffer, elementType, offset, pixelCount)
  }
}

/**
 * Manual extraction using DataView when direct typed array access fails
 */
function extractWithDataView(buffer: ArrayBuffer, elementType: number, offset: number, pixelCount: number): number[] {
  const result = new Array(pixelCount)
  const dataView = new DataView(buffer)

  // Determine bytes per element
  let bytesPerElement = 2 // Default to 16-bit
  if (elementType === ImageElementType.Byte) {
    bytesPerElement = 1
  } else if (elementType === ImageElementType.Int32 || elementType === ImageElementType.UInt32 || elementType === ImageElementType.Single) {
    bytesPerElement = 4
  } else if (elementType === ImageElementType.Double || elementType === ImageElementType.Int64 || elementType === ImageElementType.UInt64) {
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
      log.warn(`Error reading pixel at offset ${pixelOffset}`, e)
      result[i] = 0
    }
  }

  return result
}

/**
 * Convert any typed array to Uint8Array
 */
function convertToUint8Array(
  data: Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | number[]
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
  data: Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | number[],
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
  data: Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | number[],
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
 * Uses sparse sampling for large images and handles column-major format for mono, row-major for RGB
 */
function calculateImageStatistics(
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  width: number,
  height: number,
  channels: 1 | 3,
  order: 'column-major' | 'row-major', // Kept for compatibility, but always pass 'row-major'
  bitsPerPixel: number // Added for luminance calculation normalization
): { min: number; max: number; mean: number } {
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE
  let sum = 0
  let count = 0

  const pixelCount = width * height
  if (pixelCount === 0) {
    const defaultMax = bitsPerPixel <= 8 ? 255 : bitsPerPixel <= 16 ? 65535 : Math.pow(2, bitsPerPixel) - 1
    return { min: 0, max: defaultMax, mean: defaultMax / 2 }
  }
  const sampleStep = pixelCount > 1000000 ? Math.floor(Math.sqrt(pixelCount / 1000)) : 1

  if (channels === 1) {
    // Monochrome data (now always row-major)
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = y * width + x // Always row-major
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
  } else {
    // RGB data (assumed row-major), calculate histogram of luminance
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 3 // Row-major index for R value
        if (idx + 2 < data.length) {
          const r = Number(data[idx])
          const g = Number(data[idx + 1])
          const b = Number(data[idx + 2])

          if ([r, g, b].every((c) => !isNaN(c) && isFinite(c))) {
            const luminance = (r + g + b) / 3
            min = Math.min(min, luminance)
            max = Math.max(max, luminance)
            sum += luminance
            count++
          }
        }
      }
    }
  }

  // Sanity check for invalid results
  if (!isFinite(min) || !isFinite(max) || count === 0) {
    log.warn('Invalid statistics calculation, using defaults')
    const defaultMaxVal = bitsPerPixel <= 8 ? 255 : bitsPerPixel <= 16 ? 65535 : Math.pow(2, 32) - 1
    if (channels === 1) {
      return { min: 0, max: defaultMaxVal, mean: defaultMaxVal / 2 }
    } else {
      return { min: 0, max: Math.round(defaultMaxVal), mean: Math.round(defaultMaxVal / 2) }
    }
  }

  if (channels === 3) {
    return {
      min: Math.floor(min),
      max: Math.round(max),
      mean: sum / count // Keep mean as float
    }
  }

  return {
    min, // For monochrome, min can be float if input data is float
    max, // For monochrome, max can be float
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
  bitsPerPixel: number = 16,
  gamma: number = 1.0
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
    let norm = (value - min) / range
    norm = Math.max(0, Math.min(1, norm))
    if (method === 'linear') {
      // Linear stretch with gamma
      displayValue = Math.round(Math.pow(norm, 1 / gamma) * 255)
    } else if (method === 'log') {
      // Logarithmic stretch with gamma
      if (value <= 0) {
        displayValue = 0
      } else {
        const logMin = Math.log(Math.max(1, min))
        const logMax = Math.log(Math.max(2, max))
        const logRange = logMax - logMin
        if (logRange > 0) {
          let logNorm = (Math.log(Math.max(1, value)) - logMin) / logRange
          logNorm = Math.max(0, Math.min(1, logNorm))
          displayValue = Math.round(Math.pow(logNorm, 1 / gamma) * 255)
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
 * Uses sparse sampling for large images. Handles column-major (mono) or row-major (RGB, uses luminance).
 */
export function calculateHistogram(
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  width: number,
  height: number,
  min: number, // Min value for histogram range (from stats, possibly luminance)
  max: number, // Max value for histogram range (from stats, possibly luminance)
  binCount: number = 256,
  channels: 1 | 3, // Added channels
): number[] {
  const histogram = new Array(binCount).fill(0)
  const pixelCount = width * height
  if (pixelCount === 0) return histogram

  const sampleStep = Math.max(1, Math.floor(Math.sqrt(pixelCount / 1000)))
  const range = max - min
  if (range <= 0) return histogram

  const scaleFactor = (binCount - 1) / range

  if (channels === 1) {
    // Monochrome data (now always row-major) - use a flat loop for better performance
    for (let idx = 0; idx < pixelCount; idx += sampleStep) {
      const value = Number(data[idx]);
      if (!isFinite(value) || isNaN(value)) continue;
      const bin = Math.min(binCount - 1, Math.max(0, Math.floor((value - min) * scaleFactor)));
      if (bin >= 0 && bin < binCount) {
        histogram[bin]++;
      }
    }
  } else {
    // RGB data (assumed row-major), calculate histogram of luminance
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 3 // Row-major index for R
        if (idx + 2 < data.length) {
          const r = Number(data[idx])
          const g = Number(data[idx + 1])
          const b = Number(data[idx + 2])
          if ([r, g, b].every((c) => !isNaN(c) && isFinite(c))) {
            const luminance = (r + g + b) / 3 // Simple average luminance
            if (!isFinite(luminance) || isNaN(luminance)) continue
            const bin = Math.min(binCount - 1, Math.max(0, Math.floor((luminance - min) * scaleFactor)))
            if (bin >= 0 && bin < binCount) {
              histogram[bin]++
            }
          }
        }
      }
    }
  }
  return histogram
}

let displayImageWorker: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<number, (data: Uint8ClampedArray) => void>();

function getDisplayImageWorker() {
  if (!displayImageWorker) {
    displayImageWorker = new Worker(new URL('./DisplayImageWorker.ts', import.meta.url), { type: 'module' });
    displayImageWorker.onmessage = (e: MessageEvent) => {
      const { id, outputData } = e.data;
      const resolve = pendingRequests.get(id);
      if (resolve) {
        resolve(outputData as Uint8ClampedArray);
        pendingRequests.delete(id);
      }
    };
    // Optionally handle errors
  }
  return displayImageWorker;
}

export function generateDisplayImageWorker(
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  width: number,
  height: number,
  lut: Uint8Array,
  channels: 1 | 3
): Promise<Uint8ClampedArray> {
  return new Promise((resolve, _reject) => {
    const worker = getDisplayImageWorker();
    const id = ++requestId;
    pendingRequests.set(id, resolve);
    worker.postMessage({ id, data, width, height, lut, channels });
    // Optionally handle errors
  });
}

// --- Worker-based full histogram calculation ---
let histogramWorker: Worker | null = null;
let histogramRequestId = 0;
const histogramPendingRequests = new Map<number, (hist: number[]) => void>();

function getHistogramWorker() {
  if (!histogramWorker) {
    histogramWorker = new Worker(new URL('./HistogramWorker.ts', import.meta.url), { type: 'module' });
    histogramWorker.onmessage = (e: MessageEvent) => {
      const { id, histogram } = e.data;
      const resolve = histogramPendingRequests.get(id);
      if (resolve) {
        resolve(histogram as number[]);
        histogramPendingRequests.delete(id);
      }
    };
  }
  return histogramWorker;
}

export function generateFullDisplayHistogramWorker(
  data: Uint8Array | Uint16Array | Uint32Array | number[],
  width: number,
  height: number,
  min: number,
  max: number,
  binCount: number,
  channels: 1 | 3,
  order: 'column-major' | 'row-major',
  lut: Uint8Array
): Promise<number[]> {
  return new Promise((resolve) => {
    const worker = getHistogramWorker();
    const id = ++histogramRequestId;
    histogramPendingRequests.set(id, resolve);
    worker.postMessage({ id, data, width, height, min, max, binCount, channels, order, lut });
  });
}
