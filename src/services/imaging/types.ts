// Status: Good - Core Type Definition
// This is the imaging types definition that:
// - Defines core image processing interfaces
// - Provides type safety for image data
// - Supports image metadata typing
// - Implements processing configuration types
// - Maintains type consistency

export interface ProcessedImageData {
  width: number
  height: number
  depth: number
  bitsPerPixel: number
  pixelData: Uint16Array
  metadata: {
    metadataVersion: number
    errorNumber: number
    dataStart: number
    imageElementType: number
    transmissionElementType: number
    rank: number
  }
}

export interface ImageStats {
  min: number
  max: number
  mean: number
}

export interface ImageStretchParams {
  blackPoint: number
  whitePoint: number
  midtoneValue: number
}
