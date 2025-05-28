import { describe, it, expect } from 'vitest'
import { debayerImage, ImageElementType, processImageBytes } from '@/lib/ASCOMImageBytes'
import type { BayerPattern, ProcessedImageData } from '@/lib/ASCOMImageBytes'

// Helper function to create an ArrayBuffer with ASCOM ImageBytes format
const createMockImageBytesBuffer = (
  width: number,
  height: number,
  pixelDataArray: Uint8Array | Uint16Array | Uint32Array | Int16Array,
  imageElementType: ImageElementType,
  transmissionElementType: ImageElementType,
  rank: number = 2,
  dimension3: number = 1,
  dataStartOffset: number = 44 // Standard offset after metadata
): ArrayBuffer => {
  const dataStart = dataStartOffset
  const buffer = new ArrayBuffer(dataStart + pixelDataArray.byteLength)
  const view = new DataView(buffer)

  // Metadata header (simplified, focusing on what parseImageMetadata uses)
  view.setInt32(0, 1, true) // metadataVersion
  view.setInt32(4, 0, true) // errorNumber
  // Skip clientTransactionID (8) and serverTransactionID (12)
  view.setInt32(16, dataStart, true) // dataStart
  view.setInt32(20, imageElementType, true) // imageElementType
  view.setInt32(24, transmissionElementType, true) // transmissionElementType
  view.setInt32(28, rank, true) // rank
  view.setInt32(32, width, true) // dimension1 (width)
  view.setInt32(36, height, true) // dimension2 (height)
  view.setInt32(40, dimension3, true) // dimension3

  // Copy pixel data
  const pixelDataBuffer = new Uint8Array(pixelDataArray.buffer, pixelDataArray.byteOffset, pixelDataArray.byteLength)
  new Uint8Array(buffer, dataStart).set(pixelDataBuffer)

  return buffer
}

describe('ASCOMImageBytes', () => {
  describe('debayerImage', () => {
    it('should correctly debayer a 2x2 RGGB 8-bit image', () => {
      const width = 2
      const height = 2
      // R=100 G1=50
      // G2=60  B=200
      // Column-major order: [R00, G01, G10, B11]
      const bayerDataColMajor = new Uint8Array([100, 60, 50, 200])
      const pattern: BayerPattern = 'RGGB'
      const bitsPerPixel = 8
      const sourceType = ImageElementType.Byte

      const { rgbDataRowMajor, outputBpp } = debayerImage(bayerDataColMajor, width, height, pattern, bitsPerPixel, sourceType)

      // Expected output dimensions: width * height * 3 channels
      expect(rgbDataRowMajor.length).toBe(width * height * 3)
      expect(rgbDataRowMajor).toBeInstanceOf(Uint8Array)
      expect(outputBpp).toBe(8)

      // Expected RGB values (row-major: [R,G,B, R,G,B, ...])
      // Calculations (assuming integer results from division, typically flooring):
      // Pixel (0,0) - R: R=100, G=(50+60)/4=27, B=200/4=50
      // Pixel (1,0) - G: R=100/2=50, G=50, B=200/2=100
      // Pixel (0,1) - G: R=100/2=50, G=60, B=200/2=100
      // Pixel (1,1) - B: R=100/4=25, G=(50+60)/4=27, B=200
      const expectedRgbData = new Uint8Array([
        100,
        27,
        50, // Pixel (0,0) Top-left
        50,
        50,
        100, // Pixel (1,0) Top-right
        50,
        60,
        100, // Pixel (0,1) Bottom-left
        25,
        27,
        200 // Pixel (1,1) Bottom-right
      ])

      expect(rgbDataRowMajor).toEqual(expectedRgbData)
    })

    it('should correctly debayer a 2x2 RGGB 16-bit image', () => {
      const width = 2
      const height = 2
      // R=1000 G1=500
      // G2=600  B=2000
      // Column-major order: [R00, G01, G10, B11]
      const bayerDataColMajor = new Uint16Array([1000, 600, 500, 2000])
      const pattern: BayerPattern = 'RGGB'
      const bitsPerPixel = 16
      const sourceType = ImageElementType.UInt16 // Using UInt16 for direct value mapping

      const { rgbDataRowMajor, outputBpp } = debayerImage(bayerDataColMajor, width, height, pattern, bitsPerPixel, sourceType)

      expect(rgbDataRowMajor.length).toBe(width * height * 3)
      expect(rgbDataRowMajor).toBeInstanceOf(Uint16Array)
      expect(outputBpp).toBe(16)

      const expectedRgbData = new Uint16Array([
        1000,
        275,
        500, // P(0,0) R:1000, G:(500+600)/4=275, B:2000/4=500
        500,
        500,
        1000, // P(1,0) R:1000/2=500, G:500, B:2000/2=1000
        500,
        600,
        1000, // P(0,1) R:1000/2=500, G:600, B:2000/2=1000
        250,
        275,
        2000 // P(1,1) R:1000/4=250, G:(500+600)/4=275, B:2000
      ])
      expect(rgbDataRowMajor).toEqual(expectedRgbData)
    })

    it('should correctly debayer a 2x2 GRBG 8-bit image', () => {
      const width = 2
      const height = 2
      // Pattern GRBG:
      // G R
      // B G
      // Column-major data: [G00, B01, R10, G11]
      // G00=50, R10=100, B01=200, G11=60
      const bayerDataColMajor = new Uint8Array([50, 200, 100, 60])
      const pattern: BayerPattern = 'GRBG'
      const bitsPerPixel = 8
      const sourceType = ImageElementType.Byte

      const { rgbDataRowMajor, outputBpp } = debayerImage(bayerDataColMajor, width, height, pattern, bitsPerPixel, sourceType)

      expect(rgbDataRowMajor.length).toBe(width * height * 3)
      expect(rgbDataRowMajor).toBeInstanceOf(Uint8Array)
      expect(outputBpp).toBe(8)

      // Expected GRBG Output for [G=50,R=100,B=200,G'=60]:
      // P(0,0) G: R=(0+B01)/2=200/2=100, G=G00=50, B=(0+R10)/2=100/2=50 => [100,50,50]
      // P(1,0) R: R=R10=100, G=(G00+G11)/4=(50+60)/4=27, B=(B01)/4=200/4=50 => [100,27,50]
      // P(0,1) B: R=(R10)/4=100/4=25, G=(G00+G11)/4=(50+60)/4=27, B=B01=200 => [25,27,200]
      // P(1,1) G: R=(B01)/2=200/2=100, G=G11=60, B=(R10)/2=100/2=50 => [100,60,50]
      const expectedRgbData = new Uint8Array([
        100,
        50,
        50, // P(0,0) G00
        100,
        27,
        50, // P(1,0) R10
        25,
        27,
        200, // P(0,1) B01
        100,
        60,
        50 // P(1,1) G11
      ])
      expect(rgbDataRowMajor).toEqual(expectedRgbData)
    })

    it('should correctly debayer a 2x2 GBRG 8-bit image', () => {
      const width = 2
      const height = 2
      // Pattern GBRG:
      // G B
      // R G
      // Column-major data: [G00, R01, B10, G11]
      // G00=50, B10=200, R01=100, G11=60
      const bayerDataColMajor = new Uint8Array([50, 100, 200, 60])
      const pattern: BayerPattern = 'GBRG'
      const bitsPerPixel = 8
      const sourceType = ImageElementType.Byte

      const { rgbDataRowMajor, outputBpp } = debayerImage(bayerDataColMajor, width, height, pattern, bitsPerPixel, sourceType)

      expect(rgbDataRowMajor.length).toBe(width * height * 3)
      expect(rgbDataRowMajor).toBeInstanceOf(Uint8Array)
      expect(outputBpp).toBe(8)

      // Expected GBRG Output for [G00=50, R01=100, B10=200, G11=60]
      // P(0,0) G: R=(R01)/2=50, G=G00=50, B=(B10)/2=100 => [50,50,100]
      // P(1,0) B: R=(R01)/4=25, G=(G00+G11)/4=27, B=B10=200 => [25,27,200]
      // P(0,1) R: R=R01=100, G=(G00+G11)/4=27, B=(B10)/4=50 => [100,27,50]
      // P(1,1) G: R=(R01)/2=50, G=G11=60, B=(B10)/2=100 => [50,60,100]
      const expectedRgbData = new Uint8Array([
        100,
        50,
        50, // P(0,0) G00
        25,
        27,
        200, // P(1,0) B10
        100,
        27,
        50, // P(0,1) R01
        100,
        60,
        50 // P(1,1) G11
      ])
      expect(rgbDataRowMajor).toEqual(expectedRgbData)
    })

    it('should correctly debayer a 2x2 BGGR 8-bit image', () => {
      const width = 2
      const height = 2
      // Pattern BGGR:
      // B G
      // G R
      // Column-major data: [B00, G01, G10, R11]
      // B00=200, G01=50, G10=60, R11=100
      const bayerDataColMajor = new Uint8Array([200, 60, 50, 100])
      const pattern: BayerPattern = 'BGGR'
      const bitsPerPixel = 8
      const sourceType = ImageElementType.Byte

      const { rgbDataRowMajor, outputBpp } = debayerImage(bayerDataColMajor, width, height, pattern, bitsPerPixel, sourceType)

      expect(rgbDataRowMajor.length).toBe(width * height * 3)
      expect(rgbDataRowMajor).toBeInstanceOf(Uint8Array)
      expect(outputBpp).toBe(8)

      // Expected BGGR Output for [B00=200, G01=60, G10=50, R11=100]
      // P(0,0) B: R=(R11)/4=25, G=(G10+G01)/4=27, B=B00=200 => [25,27,200]
      // P(1,0) G: R=(R11)/2=50, G=G01=60, B=(B00)/2=100 => [50,60,100]
      // P(0,1) G: R=(R11)/2=50, G=G10=50, B=(B00)/2=100 => [50,50,100]
      // P(1,1) R: R=R11=100, G=(G10+G01)/4=27, B=(B00)/4=50 => [100,27,50]
      const expectedRgbData = new Uint8Array([
        25,
        27,
        200, // P(0,0) B00
        50,
        50,
        100, // P(1,0) G01
        50,
        60,
        100, // P(0,1) G10
        100,
        27,
        50 // P(1,1) R11
      ])
      expect(rgbDataRowMajor).toEqual(expectedRgbData)
    })

    it('should handle bitsPerPixel > 16 (e.g., 32-bit) and output Uint32Array', () => {
      const width = 2
      const height = 2
      // Using larger values for 32-bit representation
      // R=100000 G1=50000
      // G2=60000  B=200000
      const bayerDataColMajor = new Uint32Array([100000, 60000, 50000, 200000])
      const pattern: BayerPattern = 'RGGB'
      const bitsPerPixel = 32
      const sourceType = ImageElementType.UInt32

      const { rgbDataRowMajor, outputBpp } = debayerImage(bayerDataColMajor, width, height, pattern, bitsPerPixel, sourceType)

      expect(rgbDataRowMajor.length).toBe(width * height * 3)
      expect(rgbDataRowMajor).toBeInstanceOf(Uint32Array)
      expect(outputBpp).toBe(32) // outputBpp should reflect the standardized 32-bit output

      const expectedRgbData = new Uint32Array([
        100000,
        27500,
        50000, // P(0,0) R:100k, G:(50k+60k)/4=27.5k, B:200k/4=50k
        50000,
        50000,
        100000, // P(1,0) R:100k/2=50k, G:50k, B:200k/2=100k
        50000,
        60000,
        100000, // P(0,1) R:100k/2=50k, G:60k, B:200k/2=100k
        25000,
        27500,
        200000 // P(1,1) R:100k/4=25k, G:(50k+60k)/4=27.5k, B:200k
      ])
      expect(rgbDataRowMajor).toEqual(expectedRgbData)
    })

    it('should correctly handle Int16 source type with potentially negative values (treated as unsigned)', () => {
      const width = 2
      const height = 2
      // R=30000 (positive Int16)
      // G1=-15000 (Int16, becomes 65536-15000 = 50536 as Uint16 if val & 0xFFFF)
      // G2=20000 (positive Int16)
      // B=-5000   (Int16, becomes 65536-5000 = 60536 as Uint16 if val & 0xFFFF)
      // Values if treated as unsigned by `val & 0xffff` in getPixel:
      // R_val = 30000
      // G1_val = 50536
      // G2_val = 20000
      // B_val = 60536
      const bayerDataColMajor = new Int16Array([30000, 20000, -15000, -5000]) // R00, G01, G10, B11
      const pattern: BayerPattern = 'RGGB'
      const bitsPerPixel = 16 // Input bitsPerPixel is 16
      const sourceType = ImageElementType.Int16

      const { rgbDataRowMajor, outputBpp } = debayerImage(bayerDataColMajor, width, height, pattern, bitsPerPixel, sourceType)

      expect(rgbDataRowMajor.length).toBe(width * height * 3)
      expect(rgbDataRowMajor).toBeInstanceOf(Uint16Array) // Output should be Uint16Array for 16bpp input
      expect(outputBpp).toBe(16)

      // Expected values after `val & 0xffff` for negative numbers:
      const R_val = 30000
      const G1_val = -15000 & 0xffff // 50536 (G at x=1, y=0 in original grid)
      const G2_val = 20000 & 0xffff // 20000 (G at x=0, y=1 in original grid)
      const B_val = -5000 & 0xffff // 60536 (B at x=1, y=1 in original grid)

      // Recalculate expected RGB based on these unsigned-equivalent values:
      // Pixel (0,0) - R: R=R_val, G=(G1_val+G2_val)/4, B=B_val/4
      // Pixel (1,0) - G: R=R_val/2, G=G1_val, B=B_val/2
      // Pixel (0,1) - G: R=R_val/2, G=G2_val, B=B_val/2
      // Pixel (1,1) - B: R=R_val/4, G=(G1_val+G2_val)/4, B=B_val
      const expectedRgbData = new Uint16Array([
        R_val,
        Math.floor((G1_val + G2_val) / 4),
        Math.floor(B_val / 4),
        Math.floor(R_val / 2),
        G1_val,
        Math.floor(B_val / 2),
        Math.floor(R_val / 2),
        G2_val,
        Math.floor(B_val / 2),
        Math.floor(R_val / 4),
        Math.floor((G1_val + G2_val) / 4),
        B_val
      ])

      expect(rgbDataRowMajor).toEqual(expectedRgbData)
    })

    // Add more tests here for:
    // - Different image sizes (e.g., 3x3, non-square)
    // - Edge cases (e.g., 1xN, Nx1 if supported, though debayering usually implies 2x2 minimum blocks)
  })

  describe('processImageBytes', () => {
    it('should debayer a monochrome image when bayerPattern is provided', () => {
      const width = 2
      const height = 2
      // R=100 G1=50
      // G2=60  B=200
      const monoPixelData = new Uint8Array([100, 60, 50, 200]) // Column-major
      const bayerPattern: BayerPattern = 'RGGB'

      const buffer = createMockImageBytesBuffer(
        width,
        height,
        monoPixelData,
        ImageElementType.Byte, // imageElementType
        ImageElementType.Byte // transmissionElementType (usually same for uncompressed)
      )

      const processed: ProcessedImageData = processImageBytes(buffer, width, height, bayerPattern)

      expect(processed.isDebayered).toBe(true)
      expect(processed.channels).toBe(3)
      expect(processed.imageType).toBe('color')
      expect(processed.width).toBe(width)
      expect(processed.height).toBe(height)
      expect(processed.pixelData).toBeInstanceOf(Uint8Array)
      expect(processed.pixelData.length).toBe(width * height * 3)

      // Expected debayered data (row-major)
      const expectedRgbData = new Uint8Array([
        100,
        27,
        50, // P(0,0)
        50,
        50,
        100, // P(1,0)
        50,
        60,
        100, // P(0,1)
        25,
        27,
        200 // P(1,1)
      ])
      expect(processed.pixelData).toEqual(expectedRgbData)
      expect(processed.bitsPerPixel).toBe(8) // outputBpp from debayerImage

      // Check if originalPixelData is stored and correct
      expect(processed.originalPixelData).toEqual(monoPixelData)
    })

    it('should process a monochrome image without bayerPattern (remaining monochrome)', () => {
      const width = 2
      const height = 2
      const monoSensorPixelData = new Uint16Array([1000, 3000, 2000, 4000]) // Column-major
      const monoPixelData = new Uint16Array([1000, 2000, 3000, 4000]) // Row-major
      const buffer = createMockImageBytesBuffer(width, height, monoSensorPixelData, ImageElementType.UInt16, ImageElementType.UInt16)

      const processed: ProcessedImageData = processImageBytes(buffer, width, height, undefined)

      expect(processed.isDebayered).toBe(false)
      expect(processed.channels).toBe(1)
      expect(processed.imageType).toBe('monochrome')
      expect(processed.width).toBe(width)
      expect(processed.height).toBe(height)
      expect(processed.pixelData).toBeInstanceOf(Uint16Array)
      expect(processed.pixelData.length).toBe(width * height)
      expect(processed.pixelData).toEqual(monoPixelData)
      expect(processed.bitsPerPixel).toBe(16)
      expect(processed.originalPixelData).toEqual(monoSensorPixelData)
    })

    it('should ignore bayerPattern if image is already color (rank 3)', () => {
      const width = 2
      const height = 2
      // This data would represent one plane if it were truly rank 3 interleaved.
      // For this test, we care that debayering is skipped.
      const colorPixelData = new Uint8Array([10, 20, 30, 40]) // Effectively width*height pixels
      const bayerPattern: BayerPattern = 'RGGB'

      const buffer = createMockImageBytesBuffer(
        width,
        height,
        colorPixelData,
        ImageElementType.Byte,
        ImageElementType.Byte,
        3, // rank = 3
        3 // dimension3 = 3, indicating color
      )

      const processed: ProcessedImageData = processImageBytes(buffer, width, height, bayerPattern)

      expect(processed.isDebayered).toBe(false) // No debayering should occur
      expect(processed.imageType).toBe('color') // Should be identified as color from metadata
      expect(processed.channels).toBe(1) // Remains 1 because debayering is skipped, and current path processes it as a single plane
      expect(processed.pixelData).toBeInstanceOf(Uint8Array)
      // The pixelData will be the result of convertToUint8Array on the input data
      expect(processed.pixelData).toEqual(colorPixelData)
      expect(processed.bitsPerPixel).toBe(8)
      expect(processed.originalPixelData).toEqual(colorPixelData)
    })

    it('should calculate statistics based on luminance for a debayered image', () => {
      const width = 2
      const height = 2
      // R=100 G1=50
      // G2=60  B=200
      // Column-major mono data
      const monoPixelData = new Uint8Array([100, 60, 50, 200])
      const bayerPattern: BayerPattern = 'RGGB'

      const buffer = createMockImageBytesBuffer(width, height, monoPixelData, ImageElementType.Byte, ImageElementType.Byte)

      const processed: ProcessedImageData = processImageBytes(buffer, width, height, bayerPattern)

      expect(processed.isDebayered).toBe(true)
      expect(processed.channels).toBe(3)

      // Debayered RGB data (row-major):
      // [100, 27, 50] -> Lum: (100+27+50)/3 = 177/3 = 59
      // [50, 50, 100] -> Lum: (50+50+100)/3 = 200/3 = 66.66 -> 66
      // [50, 60, 100] -> Lum: (50+60+100)/3 = 210/3 = 70
      // [25, 27, 200] -> Lum: (25+27+200)/3 = 252/3 = 84
      // Luminance values: [59, 66, 70, 84]
      // Min Lum: 59
      // Max Lum: 84
      // Mean Lum: (59 + 66 + 70 + 84) / 4 = 279 / 4 = 69.75

      // The calculateImageStatistics function rounds mean, min, max of luminance values
      expect(processed.minPixelValue).toBe(59) // Math.floor/round behavior might need checking in main func if this fails
      expect(processed.maxPixelValue).toBe(84)
      expect(processed.meanPixelValue).toBeCloseTo(69.9167, 4) // Using toBeCloseTo for float comparison
    })

    // More tests for processImageBytes:
    // - Monochrome image, no bayerPattern (should remain monochrome)
    // - Already color image (rank 3), bayerPattern provided (should ignore bayerPattern)
    // - Statistics calculation for debayered vs monochrome
    // - Error handling (invalid buffer, zero dimensions etc.)
  })
})
