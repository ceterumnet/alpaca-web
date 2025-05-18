# Alpaca DeviceState Optimization Strategy

## 1. Introduction

The Alpaca `devicestate` endpoint is a powerful feature for optimizing communication with ASCOM Alpaca devices. It allows clients to retrieve multiple device properties in a single HTTP GET request, significantly reducing network traffic and potentially speeding up UI updates compared to fetching each property individually.

However, not all Alpaca drivers implement `devicestate` comprehensively. Some drivers may:

- Not implement `devicestate` at all.
- Implement `devicestate` but only return a subset of the device's properties.
- Have a faulty `devicestate` implementation.

This document outlines the strategy employed in this project to leverage `devicestate` effectively while gracefully handling its varying levels of support across different drivers. The `cameraActions.ts` module serves as the primary reference implementation for this pattern.

## 2. Core Concepts & State Management

To manage `devicestate` interactions, the following state properties and actions are used (primarily within device-specific action modules like `cameraActions.ts`, with `fetchDeviceState` residing in `coreActions.ts`):

- **`_deviceStateAvailableProps: Map<string, Set<string>>`**:

  - **Purpose**: This map tracks, for each `deviceId`, a `Set` of property names (lowercase) that have been confirmed to be returned by that device's `devicestate` endpoint.
  - **Population**: It's populated/updated after a successful call to `fetchDeviceState` during polling. The keys from the `devicestate` response are added to this set.
  - **Usage**: During polling, if `devicestate` is used, only properties present in this set for the given device are assumed to be covered by the `devicestate` response. Others are fetched individually.

- **`_deviceStateUnsupported: Set<string>`**:

  - **Purpose**: This set stores `deviceId`s for which `devicestate` is known to be unsupported or has consistently failed.
  - **Population**: A device is added to this set if calls to its `devicestate` endpoint (via `fetchDeviceState` in `coreActions.ts`) result in errors. _Currently, `cameraActions.ts` relies on `fetchDeviceState` (in `coreActions.ts`) to handle errors and return `null`, but `cameraActions.ts` itself doesn't explicitly add to `_deviceStateUnsupported`. The `coreActions.ts`'s `fetchDeviceState` logs an error and returns `null` but doesn't seem to directly update `_deviceStateUnsupported` either. This might be an area for future refinement to explicitly mark a device as unsupported after a certain number of failures._
  - **Usage**: If a `deviceId` is in this set, the polling logic will bypass attempts to use `devicestate` and will fetch all required properties individually.

- **`fetchDeviceState(deviceId, options)` (Action in `coreActions.ts`)**:
  - **Purpose**: This core action is responsible for making the actual HTTP GET request to the `/api/v1/{device_type}/{device_number}/devicestate` endpoint.
  - **Functionality**:
    - It takes `deviceId` and optional `options` (like `cacheTtlMs`, `forceRefresh`).
    - It includes basic caching logic via `lastDeviceStateFetch` to avoid redundant calls within a short timeframe if `forceRefresh` is false and `cacheTtlMs` is provided.
    - If the `devicestate` call is successful, it returns the JSON object containing the device properties.
    - If the call fails (e.g., network error, 404, 500), it logs an error and returns `null`.

## 3. Implementation Pattern (based on `cameraActions.ts`)

The strategy unfolds in two main phases: initial property fetching and ongoing property polling.

### 3.1. Initial Property Fetch (e.g., `fetchCameraProperties`)

When a device connects, or when its static properties need to be initially populated:

1.  **Attempt `devicestate`**:
    - Call `this.fetchDeviceState(deviceId, { forceRefresh: true, cacheTtlMs: ... })`.
    - If the call is successful and returns a `deviceState` object:
      - Iterate through a predefined list of desired `readOnlyProperties`.
      - For each property, if it's present in the `deviceState` object, its value is used.
      - _(Note: `cameraActions.ts` in its `fetchCameraProperties` method does not explicitly populate `_deviceStateAvailableProps` at this stage. This is primarily handled during the polling phase. This could be a point of optimization to populate it here as well.)_
2.  **Individual Fallback**:
    - After the `devicestate` attempt (whether successful or not), iterate through the `readOnlyProperties` list again.
    - For any property that was _not_ successfully retrieved from `devicestate` (i.e., its value is still `undefined` in the local `properties` object), make an individual `client.getProperty(property)` call.
    - Errors during individual calls are typically caught and logged, allowing the process to continue for other properties.
3.  **Additional Properties**: Some properties, like `gains` or `offsets` (which determine `gainMode`/`offsetMode`), are fetched individually as their presence and format require specific logic beyond a simple `devicestate` check.
4.  **Start Polling**: After initial properties are fetched, `this.startCameraPropertyPolling(deviceId)` is called.

### 3.2. Ongoing Property Polling (e.g., `startCameraPropertyPolling`)

Once initial setup is done, dynamic properties are periodically updated via polling:

1.  **Prerequisites**:
    - Ensure the device is connected and a client is available.
    - Initialize `this._deviceStateAvailableProps.set(deviceId, new Set<string>())` if not already present for the device.
2.  **`devicestate` Attempt**:
    - Check if `deviceId` is in `this._deviceStateUnsupported`. If so, skip to step 3 (Individual Fallback for all properties).
    - Call `deviceStateResult = await this.fetchDeviceState(deviceId, { forceRefresh: true, cacheTtlMs: pollInterval / 2 })`.
    - **If `deviceStateResult` is not null (successful fetch)**:
      - Update `this._deviceStateAvailableProps.get(deviceId)`: Iterate through `Object.keys(deviceStateResult)` and add each (lowercase) property key to the set for the current `deviceId`. This ensures `_deviceStateAvailableProps` accurately reflects what the device _actually_ returns via `devicestate`.
      - Populate a local `properties` object with values from `deviceStateResult` for all keys found.
      - Set a flag like `usingDeviceState: true` in the device's store properties.
3.  **Individual Fallback (for remaining properties)**:
    - Identify `individualPropsToFetch`: These are properties from the `propsToFetch` list that were _not_ successfully retrieved via `devicestate`. This is determined by checking if `deviceStateResult` is null OR if a property is not in `this._deviceStateAvailableProps.get(deviceId)`.
      - `const individualPropsToFetch = propsToFetch.filter((prop) => !deviceStateResult || !deviceStateProps.has(prop.toLowerCase()))`
    - If `individualPropsToFetch` is not empty, iterate through these properties and fetch each one using `await client.getProperty(property)`.
    - Collect these values into the local `properties` object.
4.  **Update Store**:
    - Update the device in the store using `this.updateDeviceProperties(deviceId, properties)`.
    - Map any properties to "friendly names" if necessary (e.g., `binx` to `binningX`) and update again.

## 4. Flow Summary for Polling

```text
Polling Interval Tick for Device X:
|
+-> Is Device X in _deviceStateUnsupported?
|   |
|   +-- YES: Go to "Poll All Individually"
|   |
|   +-- NO: Attempt fetchDeviceState(Device X)
|       |
|       +-- SUCCESS (deviceStateObject received):
|       |   |
|       |   +-> Update _deviceStateAvailableProps for Device X with keys from deviceStateObject.
|       |   +-> Use values from deviceStateObject for known available props.
|       |   +-> Identify props NOT in deviceStateObject or _deviceStateAvailableProps.
|       |   +-> Go to "Poll Remaining Individually" for these identified props.
|       |
|       +-- FAILURE (null received or error):
|           |
|           +-> (Consider logic to add Device X to _deviceStateUnsupported after N failures)
|           +-> Go to "Poll All Individually"
|
+-> "Poll All Individually":
|   |
|   +-> For each property in propsToFetch: client.getProperty()
|
+-> "Poll Remaining Individually":
|   |
|   +-> For each property in individualPropsToFetch: client.getProperty()
|
+-> Update device in store with all fetched properties.
```

## 5. Benefits

- **Reduced Network Traffic**: For devices with good `devicestate` support, many properties are fetched in one call.
- **Improved Responsiveness**: Fewer round trips can lead to faster UI updates.
- **Graceful Degradation**: The system automatically falls back to individual property calls for devices with partial or no `devicestate` support.
- **Dynamic Adaptation**: `_deviceStateAvailableProps` allows the system to learn which properties a specific device provides via `devicestate`.

## 6. Considerations & Future Work

- **Refactoring**: The described logic is complex and largely duplicated across different device action modules (e.g., `cameraActions.ts`, `telescopeActions.ts`). Refactoring this into a common, reusable utility or a base class method within `coreActions.ts` or a dedicated service method could significantly reduce code duplication and improve maintainability. This utility could manage the `_deviceStateAvailableProps` and `_deviceStateUnsupported` logic internally.
- **`_deviceStateUnsupported` Management**:
  - The criteria for adding a device to `_deviceStateUnsupported` could be more explicit (e.g., after X consecutive failures of `fetchDeviceState`).
  - Consider a mechanism for periodically re-testing `devicestate` for devices in `_deviceStateUnsupported` in case their firmware is updated or the issue was transient.
- **Initial Population of `_deviceStateAvailableProps`**: Populate `_deviceStateAvailableProps` during the `fetch<DeviceType>Properties` phase as well, not just during polling, for earlier optimization.
- **Clearer Separation of Concerns**: The `fetchDeviceState` in `coreActions.ts` is good, but the higher-level logic of deciding _what_ to do with its result (populating `_deviceStateAvailableProps`, deciding on fallbacks) is currently in each device module. A more centralized service could handle this.

This detailed understanding should provide a solid foundation for applying this pattern to other modules and for future refactoring efforts.

## 7. Module Implementation Status

This section summarizes the current implementation status of the `devicestate` optimization pattern across the various store modules in `src/stores/modules/`.

### Implemented:

- **`cameraActions.ts`**: Serves as the primary reference implementation for the `devicestate` polling strategy.
- **`telescopeActions.ts`**: Implements the `devicestate` polling strategy, including the use of `_deviceStateAvailableProps` and `_deviceStateUnsupported` and calls to `fetchDeviceState`.

### Not Implemented (or uses a device-specific pattern):

These modules currently fetch properties individually or use device-specific client methods rather than the common `fetchDeviceState` pattern with `_deviceStateAvailableProps` and `_deviceStateUnsupported`.

- **`coverCalibratorActions.ts`**: Directly fetches properties using individual client calls.
- **`domeActions.ts`**: Uses a client-specific `getDomeState()` method.
- **`filterWheelActions.ts`**: Fetches properties individually; polling also uses direct client property access.
- **`observingConditionsActions.ts`**: Uses a client-specific `getAllConditions()` method.
- **`rotatorActions.ts`**: Fetches properties individually using `client.get()`.
- **`safetyMonitorActions.ts`**: Uses a client-specific `fetchStatus()` method.
- **`switchActions.ts`**: Fetches properties using device-specific client methods like `maxSwitch()`, `getAllSwitchDetails()`, and `getSwitchValue()`.

### Not Applicable:

These modules do not typically manage ongoing device property polling in a way that would directly benefit from this specific `devicestate` optimization pattern.

- **`coreActions.ts`**: Provides the `fetchDeviceState` utility and other core functionalities but doesn't implement the polling pattern for a specific device type.
- **`discoveryActions.ts`**: Handles device discovery.
- **`eventSystem.ts`**: Manages event emission and listeners.
- **`simulationActions.ts`**: Provides simulated device behavior.
