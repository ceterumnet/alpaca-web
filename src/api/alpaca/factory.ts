/**
 * Factory for creating ALPACA clients
 */

// Status: Good - Core Service
// This factory provides device-specific client implementations that:
// - Creates appropriate client instances based on device type
// - Handles client initialization and configuration
// - Maintains type safety across client implementations
// - Provides consistent interface for device interactions

import { AlpacaClient } from './base-client'
import { CameraClient } from './camera-client'
import { TelescopeClient } from './telescope-client'

/**
 * Factory function to create the appropriate client based on device type
 */
export function createAlpacaClient(
  baseUrl: string,
  deviceType: string,
  deviceNumber: number = 0
): AlpacaClient {
  switch (deviceType.toLowerCase()) {
    case 'camera':
      return new CameraClient(baseUrl, deviceNumber)
    case 'telescope':
      return new TelescopeClient(baseUrl, deviceNumber)
    default:
      return new AlpacaClient(baseUrl, deviceType, deviceNumber)
  }
}
