/**
 * DirectDiscoveryService.ts
 *
 * This service handles device discovery by directly querying the /management/v1/configureddevices
 * endpoint of an Alpaca system, typically the one serving the UI.
 * It implements the IDeviceDiscoveryService interface.
 */

import log from '@/plugins/logger'
import axios from 'axios'
// import { debugLog } from '@/utils/debugUtils'; // Temporarily use console.log for critical tracing
import type { DiscoveredDevice } from '@/types/DiscoveredDevice' // May not be used if convertLegacyDevice is N/A
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

export class DirectDiscoveryService implements IDeviceDiscoveryService {
  private _status: DiscoveryStatus = 'idle'
  private _lastDiscoveryTime: Date | null = null
  private _lastError: string | null = null
  private _manualBaseUrl: string | null = null // Added for manual host/port
  private _discoveryResults: DiscoveryResult = {
    servers: [],
    status: 'idle',
    lastDiscoveryTime: null,
    error: null
  }

  // Getters
  get status(): DiscoveryStatus {
    return this._status
  }
  get lastDiscoveryTime(): Date | null {
    return this._lastDiscoveryTime
  }
  get lastError(): string | null {
    return this._lastError
  }

  private _getBaseUrl(): string {
    if (this._manualBaseUrl) {
      return this._manualBaseUrl
    }
    // In a browser environment, window.location.origin is the base URL (scheme, hostname, port)
    // For non-browser environments or if a different default is needed, this could be configurable.
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:11111' // Default fallback for non-browser
  }

  /**
   * Sets a manual host and port to be used for subsequent discovery attempts.
   * @param host The hostname or IP address.
   * @param port The port number.
   */
  public setManualHostPort(host: string, port: number): void {
    if (!host || port <= 0 || port > 65535) {
      log.error('Invalid host or port provided for manual discovery.')
      // Optionally throw an error or handle more gracefully
      this._manualBaseUrl = null // Reset if invalid
      return
    }
    // Assuming http for now. Could be made configurable if https is needed.
    this._manualBaseUrl = `http://${host}:${port}`
    log.info(`[DirectDiscoveryService] Manual base URL set to: ${this._manualBaseUrl}`)
    // Reset error and status if we're setting a new manual host,
    // so the next discovery attempt starts fresh.
    this._lastError = null
    this._setStatus('idle')
  }

  async discoverDevices(options?: DiscoveryOptions): Promise<DiscoveryResult> {
    if (this._status === 'discovering') {
      throw new Error('Discovery already in progress')
    }
    this._setStatus('discovering')
    // debugLog('Starting direct device discovery with options:', options); // Keep this as debugLog or change if needed
    log.info('[DirectDiscoveryService] Starting direct device discovery with options:', options) // Changed for visibility

    const baseUrl = this._getBaseUrl()
    // In direct mode, we assume there's one "server" which is the system itself.
    const serverId = `direct-${baseUrl}`

    try {
      const response = await axios.get<{
        ServerTransactionID?: number
        ClientTransactionID?: number
        ErrorNumber?: number
        ErrorMessage?: string
        Value: ConfiguredAlpacaDevice[]
      }>(`${baseUrl}/management/v1/configureddevices`)

      log.debug('[DirectDiscoveryService] Full response.data from API:', JSON.parse(JSON.stringify(response.data)))

      const configuredDevices = response.data.Value || []
      log.debug('[DirectDiscoveryService] Raw configuredDevices from API (response.data.Value):', JSON.parse(JSON.stringify(configuredDevices)))

      this._lastDiscoveryTime = new Date()

      const serverDevices: DeviceServerDevice[] = configuredDevices.map((dev) => ({
        id: `${serverId}-${dev.DeviceType}-${dev.DeviceNumber}`,
        name: dev.DeviceName || `${dev.DeviceType} ${dev.DeviceNumber}`,
        type: dev.DeviceType,
        deviceNumber: dev.DeviceNumber,
        uniqueId: dev.UniqueID,
        isAdded: false // Initial state
      }))
      log.debug('[DirectDiscoveryService] Mapped serverDevices:', JSON.parse(JSON.stringify(serverDevices)))

      const currentServer: DeviceServer = {
        id: serverId,
        address: new URL(baseUrl).hostname, // Extract hostname
        port: parseInt(new URL(baseUrl).port, 10) || (new URL(baseUrl).protocol === 'https:' ? 443 : 80), // Extract port
        serverName: `Direct Alpaca System (${new URL(baseUrl).hostname})`,
        manufacturer: 'N/A in direct mode',
        version: 'N/A in direct mode',
        location: 'N/A in direct mode',
        lastDiscovered: this._lastDiscoveryTime,
        isManual: false, // This isn't a manually added server in the traditional sense
        devices: serverDevices
      }
      log.debug('[DirectDiscoveryService] Constructed currentServer object:', JSON.parse(JSON.stringify(currentServer)))

      this._discoveryResults = {
        servers: [currentServer],
        status: 'success',
        lastDiscoveryTime: this._lastDiscoveryTime,
        error: null
      }
      this._setStatus('success')
      return this._discoveryResults
    } catch (error) {
      log.error('Error during direct device discovery:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during direct discovery'
      this._lastError = errorMessage
      this._discoveryResults = {
        servers: [], // Clear servers on error or keep previous?
        status: 'error',
        lastDiscoveryTime: this._lastDiscoveryTime, // Keep last attempt time
        error: errorMessage
      }
      this._setStatus('error')
      // Decide whether to throw or return the error state
      // For consistency with ProxiedDiscoveryService, which throws, let's throw.
      throw error
    }
  }

  async addManualDevice(params: ManualDeviceParams): Promise<DeviceServer> {
    // In direct discovery mode, manual addition of a *different* server is not supported.
    // This method could potentially be used to *refresh* the current direct server info
    // if the params match the current baseUrl, but discoverDevices already does that.
    // debugLog('addManualDevice called in DirectDiscoveryService, typically a NOP or error.', params);
    log.info('[DirectDiscoveryService] addManualDevice called, typically NOP/error:', params) // Changed for visibility
    throw new Error('Manual device addition is not applicable in Direct Discovery mode.')
  }

  getDiscoveryResults(): DiscoveryResult {
    return this._discoveryResults
  }

  createUnifiedDevice(server: DeviceServer, device: DeviceServerDevice): UnifiedDevice {
    // The API base URL is direct, not proxied.
    const apiBaseUrl = `http://${server.address}:${server.port}/api/v1/${device.type}/${device.deviceNumber}`

    const unifiedDevice: UnifiedDevice = {
      id: `${server.id}-${device.type}-${device.deviceNumber}`, // Ensure unique ID based on server and device
      name: device.name || `${device.type} ${device.deviceNumber}`,
      type: device.type,
      ipAddress: server.address,
      port: server.port,
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      status: 'idle',
      properties: {
        discoveryTime: server.lastDiscovered.toISOString(),
        alpacaPort: server.port, // Assuming the main port is the Alpaca port in direct mode
        serverName: server.serverName,
        manufacturer: server.manufacturer,
        version: server.version,
        location: server.location,
        isManualEntry: server.isManual,
        deviceNumber: device.deviceNumber,
        apiBaseUrl: apiBaseUrl
      }
    }
    return unifiedDevice
  }

  isDeviceAdded(device: UnifiedDevice, existingDevices: UnifiedDevice[]): boolean {
    // This logic can be identical to ProxiedDiscoveryService if it's generic enough
    // For now, a simple check based on apiBaseUrl should suffice for uniqueness.
    return existingDevices.some((existingDevice) => existingDevice.properties?.apiBaseUrl === device.properties?.apiBaseUrl)
  }

  getProxyUrl(server: DeviceServer): string {
    // No proxy in direct mode. Return the direct base URL for the Alpaca device API.
    // This might seem redundant if createUnifiedDevice already constructs this, but the interface requires it.
    // It should point to the server itself: http://address:port
    return `http://${server.address}:${server.port}`
  }

  convertLegacyDevice(device: DiscoveredDevice): DeviceServer {
    // This method is for converting from the old broadcast-discovered device format.
    // It's not really applicable to DirectDiscoveryService, which fetches ConfiguredAlpacaDevice.
    // debugLog('convertLegacyDevice called in DirectDiscoveryService, typically a NOP or error.', device);
    log.info('[DirectDiscoveryService] convertLegacyDevice called, typically NOP/error:', device) // Changed for visibility
    throw new Error('Legacy device conversion is not applicable in Direct Discovery mode.')
  }

  private _setStatus(status: DiscoveryStatus): void {
    this._status = status
    // TODO: Consider event emission if needed for reactive UI updates beyond polling getDiscoveryResults.
  }
}

// Export a singleton instance (optional, depends on how it will be consumed)
export const directDiscoveryService = new DirectDiscoveryService()
