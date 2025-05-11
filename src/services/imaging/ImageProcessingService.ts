// Status: Not used - Core Service
// This is the image processing service that:
// - Handles image data processing and manipulation
// - Implements FITS file handling
// - Provides image analysis functions
// - Supports various image formats
// - Maintains image processing state

import type { ProcessedImageData } from './types'

export class ImageProcessingService {
  /**
   * Process raw image data from ASCOM Alpaca format
   * @param imageData Raw image data in ASCOM Alpaca format
   * @returns Processed image data with metadata
   */
  static processImageBytes(imageData: ArrayBuffer): ProcessedImageData | null {
    try {
      const dataView = new DataView(imageData)

      // Read ASCOM Alpaca image header
      const metadataVersion = dataView.getInt32(0, true)
      const errorNumber = dataView.getInt32(4, true)
      const dataStart = dataView.getInt32(16, true)
      const imageElementType = dataView.getInt32(20, true)
      const transmissionElementType = dataView.getInt32(24, true)
      const rank = dataView.getInt32(28, true)
      const width = dataView.getInt32(32, true)
      const height = dataView.getInt32(36, true)
      const depth = dataView.getInt32(40, true)

      // Validate header
      if (metadataVersion !== 1 || errorNumber !== 0 || rank !== 2) {
        console.error('Invalid image header')
        return null
      }

      // Extract pixel data
      const pixelData = new Uint16Array(imageData.slice(dataStart))

      return {
        width,
        height,
        depth,
        bitsPerPixel: imageElementType === 8 ? 16 : 8,
        pixelData,
        metadata: {
          metadataVersion,
          errorNumber,
          dataStart,
          imageElementType,
          transmissionElementType,
          rank
        }
      }
    } catch (error) {
      console.error('Error processing image data:', error)
      return null
    }
  }

  /**
   * Calculate image statistics (min, max, mean)
   * @param imageData Processed image data
   * @returns Object containing min, max, and mean values
   */
  static calculateImageStats(imageData: ProcessedImageData): {
    min: number
    max: number
    mean: number
  } {
    const { pixelData } = imageData
    let min = Number.MAX_VALUE
    let max = Number.MIN_VALUE
    let sum = 0
    let count = 0

    // Sample the data to avoid performance issues with large images
    const sampleStep = pixelData.length > 1000000 ? Math.floor(pixelData.length / 1000) : 1

    for (let i = 0; i < pixelData.length; i += sampleStep) {
      const value = Number(pixelData[i])
      if (!isNaN(value) && isFinite(value)) {
        min = Math.min(min, value)
        max = Math.max(max, value)
        sum += value
        count++
      }
    }

    // Handle edge cases
    if (!isFinite(min) || !isFinite(max) || max <= min || count === 0) {
      console.warn('Invalid image statistics, using defaults')
      return { min: 0, max: 65535, mean: 32768 }
    }

    return {
      min,
      max,
      mean: sum / count
    }
  }

  /**
   * Generate histogram data from image
   * @param imageData Processed image data
   * @param numBins Number of histogram bins
   * @returns Array of histogram bin counts
   */
  static generateHistogram(imageData: ProcessedImageData, numBins: number = 256): number[] {
    const { pixelData } = imageData
    const histogram = new Array(numBins).fill(0)
    const stats = this.calculateImageStats(imageData)
    const range = stats.max - stats.min
    const binSize = range / numBins

    // Sample the data to avoid performance issues with large images
    const sampleStep = pixelData.length > 1000000 ? Math.floor(pixelData.length / 1000) : 1

    for (let i = 0; i < pixelData.length; i += sampleStep) {
      const value = Number(pixelData[i])
      if (!isNaN(value) && isFinite(value)) {
        const binIndex = Math.min(Math.floor((value - stats.min) / binSize), numBins - 1)
        histogram[binIndex]++
      }
    }

    return histogram
  }

  /**
   * Apply image stretching
   * @param imageData Processed image data
   * @param blackPoint Black point percentage (0-100)
   * @param whitePoint White point percentage (0-100)
   * @param midtoneValue Midtone adjustment (0.1-2.0)
   * @returns Stretched image data
   */
  static stretchImage(imageData: ProcessedImageData, blackPoint: number, whitePoint: number, midtoneValue: number): ProcessedImageData {
    const stats = this.calculateImageStats(imageData)
    const range = stats.max - stats.min
    const blackValue = stats.min + (range * blackPoint) / 100
    const whiteValue = stats.min + (range * whitePoint) / 100
    const stretchRange = whiteValue - blackValue

    // Create new array for stretched data
    const stretchedData = new Uint16Array(imageData.pixelData.length)

    for (let i = 0; i < imageData.pixelData.length; i++) {
      const value = Number(imageData.pixelData[i])
      if (!isNaN(value) && isFinite(value)) {
        // Apply black/white point clipping
        let stretched = Math.max(blackValue, Math.min(whiteValue, value))
        // Normalize to 0-1 range
        stretched = (stretched - blackValue) / stretchRange
        // Apply midtone adjustment
        stretched = Math.pow(stretched, midtoneValue)
        // Scale back to original range
        stretched = Math.round(stretched * 65535)
        stretchedData[i] = stretched
      }
    }

    return {
      ...imageData,
      pixelData: stretchedData
    }
  }
}
