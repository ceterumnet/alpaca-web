# Proxy and Direct Access to Devices

## Objective

Enable the application to discover Alpaca devices through two distinct methods:

1. **Proxied Mode**

   - Uses existing system with separate discovery server component
   - Relies on `/discovery/` proxy

2. **Direct Mode**
   - Queries Alpaca device's `/management/v1/configureddevices` endpoint directly
   - Uses `window.location.origin` as base URL
   - Includes fallback prompting if direct access fails

## Implementation Details

### 1. Service Interface

- Established `IDeviceDiscoveryService` interface in `src/services/interfaces/DeviceDiscoveryInterface.ts`
- Defines contract for all discovery services

### 2. Proxied Discovery Service

- Renamed `EnhancedDeviceDiscoveryService.ts` to `ProxiedDiscoveryService.ts`
- Updated to implement `IDeviceDiscoveryService` interface
- Fixed imports in dependent files (e.g., `useEnhancedDiscoveryStore.ts`)
- Resolved linter errors related to property naming (e.g., `DeviceName` vs `deviceName`)

### 3. Shared Device Type

- Moved `ConfiguredDevice` interface to `DeviceDiscoveryInterface.ts`
- Renamed to `ConfiguredAlpacaDevice` for clarity
- Aligned with Alpaca specification terminology

### 4. Direct Discovery Service

- Created new `DirectDiscoveryService.ts`
- Implements `IDeviceDiscoveryService` interface
- Primary functionality:
  - Fetches from `[BASE_URL]/management/v1/configureddevices`
  - Transforms API response to `DeviceServer[]` structure
  - Implements `getProxyUrl` for direct device access
- Stubbed methods:
  - `addManualDevice`
  - `convertLegacyDevice`
  - (Throws "Not Applicable" for direct mode)

### 5. Discovery Service Factory

- Created `discoveryServiceFactory.ts`
- Instantiates appropriate service based on `VITE_APP_DISCOVERY_MODE`
- Enables runtime configuration switching

### 6. Store Integration

Updated `useEnhancedDiscoveryStore.ts` to:

- Use `discoveryServiceFactory` for service instantiation
- Fix imports and type usage:
  - Import `UnifiedDevice`
  - Use `UnifiedStore.addDeviceWithCheck`
  - Reference `unifiedStore.devicesList`
- Resolve Vue-specific computed property issues

## Result

Established flexible discovery mechanism allowing environment-based strategy adaptation.
