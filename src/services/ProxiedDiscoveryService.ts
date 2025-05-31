/**
 * ProxiedDiscoveryService.ts
 *
 * This service handles device discovery operations and provides a clean interface for
 * UI components to consume. It implements the IDeviceDiscoveryService interface.
 */

import log from '@/plugins/logger'
import axios from 'axios'
import { debugLog } from '@/utils/debugUtils'
import type { DiscoveredDevice } from '@/types/DiscoveredDevice'
import type { UnifiedDevice } from '@/types/device.types'
import {
  type IDeviceDiscoveryService,
  type DiscoveryStatus,
  type DiscoveryResult,
  type DeviceServer,
  type DeviceServerDevice,
  type DiscoveryOptions,
  type ManualDeviceParams,
  type ConfiguredAlpacaDevice
} from './interfaces/DeviceDiscoveryInterface'

/**
 * Enhanced Device Discovery Service
 * Implements the IDeviceDiscoveryService interface to provide a clean API
 * for UI components to interact with the discovery system.
 */
export class ProxiedDiscoveryService implements IDeviceDiscoveryService {
  private _status: DiscoveryStatus = 'idle'
  private _lastDiscoveryTime: Date | null = null
  private _lastError: string | null = null
  private _discoveryResults: DiscoveryResult = {
    servers: [],
    status: 'idle',
    lastDiscoveryTime: null,
    error: null
  }

  // Getters for readonly properties
  get status(): DiscoveryStatus {
    return this._status
  }

  get lastDiscoveryTime(): Date | null {
    return this._lastDiscoveryTime
  }

  get lastError(): string | null {
    return this._lastError
  }

  /**
   * Discover devices on the network
   * @param options Discovery options
   * @returns Discovery results
   */
  async discoverDevices(options?: DiscoveryOptions): Promise<DiscoveryResult> {
    if (this._status === 'discovering') {
      // throw new Error('Discovery already in progress')
      log.warn('Discovery already in progress')
      return Promise.resolve(this._discoveryResults)
    }

    this._setStatus('discovering')
    debugLog('Starting device discovery...')

    try {
      // Trigger a discovery scan
      await axios.post('/discovery/scan')

      // Wait for devices to respond (UDP takes time)
      const timeout = options?.timeout || 2000
      await new Promise((resolve) => setTimeout(resolve, timeout))

      // Get discovered devices
      const response = await axios.get('/discovery/devices')
      const discoveredDevices = response.data.devices as DiscoveredDevice[]
      this._lastDiscoveryTime = new Date()

      // Convert to the new format
      const servers: DeviceServer[] = await Promise.all(discoveredDevices.map(async (device) => this.processDiscoveredDevice(device)))

      // Update results
      this._discoveryResults = {
        servers,
        status: 'success',
        lastDiscoveryTime: this._lastDiscoveryTime,
        error: null
      }

      log.debug('[ProxiedDiscoveryService] Final discovery results before returning:', JSON.parse(JSON.stringify(this._discoveryResults)))

      this._setStatus('success')
      return this._discoveryResults
    } catch (error) {
      log.error('Error discovering devices:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during discovery'
      this._lastError = errorMessage

      this._discoveryResults = {
        ...this._discoveryResults,
        status: 'error',
        error: errorMessage
      }

      this._setStatus('error')
      throw error
    }
  }

  /**
   * Add a device manually
   * @param params Device parameters
   * @returns The added device server
   */
  async addManualDevice(params: ManualDeviceParams): Promise<DeviceServer> {
    // Validate input
    if (!params.address || !params.port) {
      throw new Error('Address and port are required')
    }

    try {
      // Verify the device by making a request to its management API
      const proxyUrl = this.getProxyUrl({
        address: params.address,
        port: params.port
      } as DeviceServer)

      await axios.get(`${proxyUrl}/management/v1/configureddevices`)

      // Create new device server
      const server: DeviceServer = {
        id: `manual-${params.address}-${params.port}`,
        address: params.address,
        port: params.port,
        serverName: params.name || 'Manual Entry',
        manufacturer: 'Unknown',
        lastDiscovered: new Date(),
        isManual: true,
        devices: []
      }

      // Fetch configured devices for this server
      server.devices = await this.fetchServerDevices(server)

      // Add to our list of servers
      const existingIndex = this._discoveryResults.servers.findIndex((s) => s.address === server.address && s.port === server.port)

      if (existingIndex >= 0) {
        this._discoveryResults.servers[existingIndex] = server
      } else {
        this._discoveryResults.servers.push(server)
      }

      return server
    } catch (error) {
      log.error('Error adding manual device:', error)
      throw new Error('Could not connect to device at the specified address and port')
    }
  }

  /**
   * Get the current discovery results
   * @returns Current discovery results
   */
  getDiscoveryResults(): DiscoveryResult {
    return this._discoveryResults
  }

  /**
   * Create a unified device from a server device
   * @param server Device server
   * @param device Server device
   * @returns Unified device
   */
  createUnifiedDevice(server: DeviceServer, device: DeviceServerDevice): UnifiedDevice {
    const deviceId = `${server.address}:${server.port}:${device.type}:${device.deviceNumber}`
    const proxyUrl = this.getProxyUrl(server)

    const unifiedDevice: UnifiedDevice = {
      id: deviceId,
      name: device.name || `${device.type} ${device.deviceNumber}`,
      type: device.type,
      ipAddress: server.address,
      port: server.port,
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      status: 'idle',
      properties: {
        discoveryTime: new Date().toISOString(),
        alpacaPort: server.port,
        serverName: server.serverName || 'Unknown Server',
        manufacturer: server.manufacturer || 'Unknown',
        version: server.version,
        location: server.location,
        isManualEntry: server.isManual,
        deviceNumber: device.deviceNumber,
        apiBaseUrl: `${proxyUrl}/api/v1/${device.type}/${device.deviceNumber}`
      }
    }

    return unifiedDevice
  }

  /**
   * Check if a device is already added to the store
   * @param device Device to check
   * @param existingDevices List of existing devices
   * @returns True if device is already added
   */
  isDeviceAdded(device: UnifiedDevice, existingDevices: UnifiedDevice[]): boolean {
    return existingDevices.some((existingDevice) => {
      // Check if API URLs match (most reliable)
      const deviceApiUrl = existingDevice.properties?.apiBaseUrl as string | undefined
      const newDeviceApiUrl = device.properties?.apiBaseUrl as string | undefined

      if (deviceApiUrl === newDeviceApiUrl && deviceApiUrl) {
        return true
      }

      // If URLs don't match, check more detailed criteria
      const deviceTypeMatch = existingDevice.type === device.type
      const deviceNumMatch = existingDevice.properties?.deviceNumber === device.properties?.deviceNumber
      const serverAddressMatch = existingDevice.ipAddress === device.ipAddress
      const serverPortMatch = existingDevice.port === device.port

      // Device is considered the same only if ALL criteria match
      return deviceTypeMatch && deviceNumMatch && serverAddressMatch && serverPortMatch
    })
  }

  /**
   * Get the proxy URL for a device server
   * @param server Device server
   * @returns Proxy URL
   */
  getProxyUrl(server: DeviceServer): string {
    return `/proxy/${server.address}/${server.port}`
  }

  /**
   * Convert legacy discovered device to new device server format
   * @param device Legacy discovered device
   * @returns New format device server
   */
  convertLegacyDevice(device: DiscoveredDevice): DeviceServer {
    return {
      id: `${device.address}:${device.port}`,
      address: device.address,
      port: device.port,
      serverName: device.ServerName || 'Unknown Server',
      manufacturer: device.Manufacturer || 'Unknown Manufacturer',
      version: device.ManufacturerVersion,
      location: device.Location || 'Unknown Location',
      lastDiscovered: new Date(device.discoveryTime),
      isManual: device.isManualEntry || false,
      devices: [] // Devices will be fetched separately
    }
  }

  /**
   * Process a discovered device to the new format
   * @param device Discovered device
   * @returns Device server
   */
  private async processDiscoveredDevice(device: DiscoveredDevice): Promise<DeviceServer> {
    const server: DeviceServer = this.convertLegacyDevice(device)
    server.devices = await this.fetchServerDevices(server)
    log.debug(`[ProxiedDiscoveryService] Devices processed for server ${server.id}:`, JSON.parse(JSON.stringify(server.devices)))
    return server
  }

  /**
   * Fetch all Alpaca devices for a given server
   * @param server Device server
   * @returns List of Alpaca devices on the server
   */
  private async fetchServerDevices(server: DeviceServer): Promise<DeviceServerDevice[]> {
    const proxyUrl = this.getProxyUrl(server)
    log.debug(
      `[ProxiedDiscoveryService] Attempting to fetch configured devices for server: ${server.id} via ${proxyUrl}/management/v1/configureddevices`
    )
    try {
      const response = await axios.get<{ Value: ConfiguredAlpacaDevice[] }>(`${proxyUrl}/management/v1/configureddevices`)
      log.debug(`[ProxiedDiscoveryService] Raw configured devices response for ${server.id}:`, response.data)
      return (
        response.data.Value?.map((dev: ConfiguredAlpacaDevice) => ({
          id: `${server.id}-${dev.DeviceType}-${dev.DeviceNumber}`,
          name: dev.DeviceName || `${dev.DeviceType} ${dev.DeviceNumber}`,
          type: dev.DeviceType,
          deviceNumber: dev.DeviceNumber,
          uniqueId: dev.UniqueID,
          isAdded: false
        })) || []
      )
    } catch (error) {
      log.warn(`Failed to fetch configured devices for ${server.serverName} (${server.address}:${server.port}):`, error)
      return [] // Return empty array if fetching fails
    }
  }

  /**
   * Set the discovery status and notify listeners
   * @param status New status
   */
  private _setStatus(status: DiscoveryStatus): void {
    this._status = status
    // TODO: Emit an event or use a reactive system if UI needs to react to status changes directly
    // For now, status is primarily for internal logic and polled by getDiscoveryResults
  }
}

// Export singleton instance
export const proxiedDeviceDiscoveryService = new ProxiedDiscoveryService()
