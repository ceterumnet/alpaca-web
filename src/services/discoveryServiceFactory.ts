/**
 * discoveryServiceFactory.ts
 *
 * This factory provides the appropriate IDeviceDiscoveryService instance
 * based on the VITE_APP_DISCOVERY_MODE environment variable.
 */

import log from '@/plugins/logger'
import type { IDeviceDiscoveryService } from './interfaces/DeviceDiscoveryInterface'
import { proxiedDeviceDiscoveryService } from './ProxiedDiscoveryService'
import { directDiscoveryService } from './DirectDiscoveryService'

const discoveryMode = import.meta.env.VITE_APP_DISCOVERY_MODE

let discoveryServiceInstance: IDeviceDiscoveryService

if (discoveryMode === 'direct') {
  discoveryServiceInstance = directDiscoveryService
  log.info('Using DirectDiscoveryService')
} else {
  discoveryServiceInstance = proxiedDeviceDiscoveryService
  log.info('Using ProxiedDiscoveryService (default)')
}

export const discoveryService: IDeviceDiscoveryService = discoveryServiceInstance
