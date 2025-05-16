/**
 * Factory for creating ALPACA clients
 */

// Status: Good - Core Service
// This factory provides device-specific client implementations that:
// - Creates appropriate client instances based on device type
// - Handles client initialization and configuration
// - Maintains type safety across client implementations
// - Provides consistent interface for device interactions

import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'
import { CameraClient } from './camera-client'
import { TelescopeClient } from './telescope-client'
import { FocuserClient } from './focuser-client'
import { DomeClient } from './dome-client'
import { SwitchClient } from './switch-client'
import { RotatorClient } from './rotator-client'
import { FilterWheelClient } from './filterwheel-client'
import { SafetyMonitorClient } from './safetymonitor-client'
import { CoverCalibratorClient } from './covercalibrator-client'
import { ObservingConditionsClient } from './observingconditions-client'

/**
 * Factory function to create the appropriate client based on device type
 */
export function createAlpacaClient(baseUrl: string, deviceType: string, deviceNumber: number = 0, device: Device): AlpacaClient {
  switch (deviceType.toLowerCase()) {
    case 'camera':
      return new CameraClient(baseUrl, deviceNumber, device)
    case 'telescope':
      return new TelescopeClient(baseUrl, deviceNumber, device)
    case 'focuser':
      return new FocuserClient(baseUrl, deviceNumber, device)
    case 'dome':
      return new DomeClient(baseUrl, deviceNumber, device)
    case 'switch':
      return new SwitchClient(baseUrl, deviceNumber, device)
    case 'rotator':
      return new RotatorClient(baseUrl, deviceNumber, device)
    case 'filterwheel':
      return new FilterWheelClient(baseUrl, deviceNumber, device)
    case 'safetymonitor':
      return new SafetyMonitorClient(baseUrl, deviceNumber, device)
    case 'covercalibrator':
      return new CoverCalibratorClient(baseUrl, deviceNumber, device)
    case 'observingconditions':
      return new ObservingConditionsClient(baseUrl, deviceNumber, device)
    default:
      return new AlpacaClient(baseUrl, deviceType, deviceNumber, device)
  }
}
