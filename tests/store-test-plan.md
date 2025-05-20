# UnifiedStore Test Plan

This document outlines the testing strategy for `UnifiedStore.ts` and its associated modules.

## 1. Overview

The `UnifiedStore` is the central Pinia store for managing device interactions in the Alpaca-Web application. It aggregates state and actions from various modules, each responsible for a specific device type or core functionality.

Testing will focus on:

- Correct initialization of the store and its modules.
- Accuracy of getters.
- Proper execution of actions, including state mutations, event emissions, and interactions with mock Alpaca clients.
- Robustness of error handling within actions.

## 2. Tools and Setup

- **Test Runner:** Vitest
- **Assertion Library:** Vitest's built-in `expect`
- **Mocking:** Vitest's mocking capabilities (`vi.fn()`, `vi.spyOn()`, `vi.mock()`)
- **Pinia Testing:** `@pinia/testing` for creating a testing Pinia instance and simplifying store testing.

**Setup Steps (for each test file):**

1.  Import necessary functions from Vitest (`describe`, `it`, `expect`, `beforeEach`, `vi`).
2.  Import `createPinia` and `setActivePinia` from `pinia`.
3.  Import `useUnifiedStore` and any relevant types.
4.  Mock external dependencies, particularly `@/api/AlpacaClient` and specific device clients (`@/api/alpaca/*-client`).
5.  In a `beforeEach` block:
    - Call `setActivePinia(createPinia())` to ensure a fresh Pinia instance for each test.
    - Initialize the `UnifiedStore`.

## 3. Test Suites

### 3.1. `UnifiedStore.ts` (Main Store Integration)

- **File:** `tests/stores/UnifiedStore.test.ts`
- **Focus:** Test the combined state, getters, and the aggregation of actions from all modules. Ensure the store is defined correctly and modules are integrated as expected.
- **Key Tests:**
  - **Initialization:**
    - Verify that the store can be initialized.
    - Check that the initial state correctly combines states from all modules.
    - Ensure all module actions are present in the store's actions.
  - **Getters:**
    - `devicesList`: Test with no devices, one device, multiple devices.
    - `connectedDevices`: Test with no connected devices, some connected, all connected.
    - `selectedDevice`: Test with no selection, valid selection, invalid selection.
  - **Action Aggregation:**
    - Verify that a sample action from each module (e.g., `createCoreActions().actions.addDevice`) is callable on the `UnifiedStore` instance. (Detailed testing of each action will be in its module's test suite).

### 3.2. `coreActions.ts`

- **File:** `tests/stores/modules/coreActions.test.ts`
- **Focus:** Test fundamental device management, client creation, state transitions, and event emissions.
- **Key Tests:**
  - **State:** Verify initial `CoreState`.
  - **`addDevice` / `addDeviceWithCheck`:**
    - Adding a new device (check `devices` map, `devicesArray`, client creation, event emission).
    - Attempting to add a duplicate device.
    - Adding a device with and without `apiBaseUrl`.
  - **`removeDevice`:**
    - Removing an existing device (check `devices` map, `devicesArray`, client removal, event emission).
    - Attempting to remove a non-existent device.
    - Ensure `selectedDeviceId` is cleared if the selected device is removed.
    - Verify module-specific cleanup is called (e.g., `stopCameraPropertyPolling`).
  - **`updateDevice`:**
    - Updating properties of an existing device (check `devices` map, `devicesArray`, event emission).
    - Handling `apiBaseUrl` changes (client recreation).
  - **`updateDeviceProperties`:**
    - Updating specific properties, check for event emission (`devicePropertyChanged`).
    - Ensure capability updates (`updateDeviceCapabilities`) are triggered.
  - **`connectDevice`:**
    - ✅ Successful connection (state changes: `isConnecting`, `isConnected`, `status`; client interaction: `setProperty('''connected''', true)`; event emission: `deviceConnected`).
    - ✅ Connection to an already connected device.
    - ✅ Connection failure (state changes, event emission: `deviceConnectionError` - status correctly updated to `'error'`).
    - ✅ Ensure device-specific property fetching is called (e.g., `fetchCameraProperties` for camera devices) - (Tested for camera).
  - **`disconnectDevice`:**
    - Successful disconnection (state changes, client interaction, event emission: `deviceDisconnected`).
    - Disconnection failure.
    - Ensure device-specific polling stop is called (e.g., `stopCameraPropertyPolling`).
  - **`createDeviceClient`:**
    - Client creation with valid `apiBaseUrl`.
    - Client creation by parsing device ID.
    - Failure cases (missing `apiBaseUrl`, invalid format).
  - **`getDeviceById`, `getDeviceClient`, `hasValidApiUrl`, `deviceExists`:** Basic getter/checker functionality.
  - **`selectDevice`, `toggleSidebar`, `setTheme`:** Simple state mutations.
  - **`getDevicesByType`, `hasDevice`, `clearDevices`:** Device list management.
  - **`createSimulatedDevice`:** Verify simulation device creation.
  - **`updateDeviceCapabilities`, `deviceSupports`, `deviceHas`:** Capability logic.
  - **`fetchDeviceState`:** Test with cache, force refresh, and client errors.
  - **`executeDeviceOperation`, `getDeviceProperty`, `setDeviceProperty`, `callDeviceMethod`, `callDeviceMethodWithFallback`:**
    - Mock `AlpacaClient` methods.
    - Test successful calls, error handling, and fallback logic (if applicable for `callDeviceMethodWithFallback`).
    - Verify correct parameters are passed to client methods.
    - Event emission for `setDeviceProperty` and `callDeviceMethod`.
  - **`getDevicePropertyOptimized`**: Test devicestate fallback logic.

### 3.3. `eventSystem.ts`

- **File:** `tests/stores/modules/eventSystem.test.ts`
- **Focus:** Test event listener management and event emission logic, including batching.
- **Key Tests:**
  - ✅ **State:** Verify initial `EventSystemState`.
  - **`addEventListener` / `removeEventListener`:**
    - ✅ Adding and removing listeners (Note: `addEventListener` takes one listener argument: `(event: DeviceEvent) => void`).
  - **`_emitEvent`:**
    - ✅ Direct emission to listeners.
    - ✅ Queueing events when `isBatching` is true.
  - **`batch`:**
    - ✅ Test `start`, `end`, and `queue` methods.
    - ✅ Ensure events are queued during batching and emitted correctly on `end`.
  - **Legacy Emitter (`on`, `off`, `emit`):**
    - ✅ Test adding, removing, and triggering legacy handlers.
    - ✅ Verify debug logging for specific '''callDeviceMethod''' events.

### 3.4. `discoveryActions.ts`

- **File:** `tests/stores/modules/discoveryActions.test.ts`
- **Focus:** Test discovery process initiation and termination.
- **Key Tests:**
  - ✅ **State:** Verify initial `DiscoveryState`.
  - ✅ **`startDiscovery`:**
    - ✅ Set `isDiscovering` to true.
    - ✅ Clear existing `discoveryTimeout`.
    - ✅ Emit `discoveryStarted` event.
    - ✅ Prevent starting if already discovering.
  - ✅ **`stopDiscovery`:**
    - ✅ Set `isDiscovering` to false.
    - ✅ Clear `discoveryTimeout`.
    - ✅ Emit `discoveryStopped` event.
    - ✅ Prevent stopping if not discovering.

### 3.6. Device-Specific Action Modules (Camera, Telescope, etc.)

For each device-specific module (e.g., `cameraActions.ts`, `telescopeActions.ts`, etc.), create a corresponding test file (e.g., `tests/stores/modules/cameraActions.test.ts`).

**General Test Structure for Device Modules:**

- **Focus:** Test device-specific state, actions, property fetching, polling, and interaction with mocked device clients.
- **Mocking:**
  - Mock the corresponding Alpaca device client (e.g., `CameraClient`, `TelescopeClient`).
  - Mock methods from `coreActions` that are used by the device module (e.g., `getDeviceById`, `getDeviceClient`, `updateDeviceProperties`, `_emitEvent`, `callDeviceMethod`, `fetchDeviceState`).
- **Key Tests:**
  - **State:** Verify initial module-specific state (e.g., `CameraState`).
  - **Property Fetching (e.g., `fetchCameraProperties`, `fetchTelescopeProperties`):**
    - Mock client methods to return sample data.
    - Verify `updateDeviceProperties` is called with correct data.
    - Verify `start...PropertyPolling` is called.
    - Error handling if client calls fail.
  - **Property Polling (e.g., `startCameraPropertyPolling`, `stopCameraPropertyPolling`, `_poll...Status`):**
    - Mock client `getProperty` or `fetchDeviceState`.
    - Test starting and stopping polling (check interval timers, map entries).
    - Test the polling function itself:
      - Verify `updateDeviceProperties` is called with polled data.
      - Test behavior when device is disconnected during polling.
      - Test `devicestate` usage and fallback to individual property polling.
      - Test polling of different properties based on device state (e.g., `isExposing` for camera).
    - Test `setPropertyPollingInterval`.
  - **Device Control Actions (e.g., `startCameraExposure`, `parkTelescope`, `setFilterWheelPosition`):**
    - Mock client methods (e.g., `startexposure`, `park`, `setPosition`).
    - Verify `callDeviceMethod` or direct client methods are called with correct parameters.
    - Verify `updateDeviceProperties` is called to reflect action initiation and completion.
    - Verify relevant events are emitted (e.g., `cameraExposureStarted`, `telescopeParked`).
    - Test error handling paths (client call failures).
    - Test parameter validation where applicable.
  - **Specific Logic (e.g., `trackExposureProgress` in `cameraActions`):**
    - Test complex internal logic, timers, state transitions.
    - Mock dependencies heavily.
  - **Connection Handlers (e.g., `handleCameraConnected`, `handleDomeDisconnected`):**
    - Verify that property fetching/polling is initiated on connect.
    - Verify that polling is stopped and state is cleared on disconnect.
  - **State Cleanup (e.g., `cleanupDeviceState` in `cameraActions`):**
    - Verify internal module state is cleaned up.

**Specific considerations for each module:**

#### 3.6.1. `cameraActions.ts`

- ✅ `fetchCameraProperties`: `getCameraInfo` mock, gain/offset mode detection. (All tests passing)
- ✅ `startCameraPropertyPolling`: `devicestate` usage, polling different props based on `isExposing`. (All tests passing)
- ✅ `setPropertyPollingInterval`: Updating interval, restarting polling, min interval. (All tests passing)
- ✅ `startCameraExposure`: Test PUT with named parameters, state updates, event emission, `trackExposureProgress` call. (All tests passing for success and error cases: client fail, device not found, client not found).
- ✅ `trackExposureProgress`: Complex logic with `setInterval`, `camerastate` checking, `imageready` polling, fallback logic, timeout, device disconnect, camera error state. (All 7 tests passing).
- **`handleExposureComplete` Test Suite:**
  - Successfully resolved all failing tests.
  - Key fixes involved:
    - Correcting mock implementations for `getDeviceById` to accurately simulate device disappearance at critical points.
    - Ensuring the System Under Test (SUT) in `cameraActions.ts` correctly handles the 'device not found after imageready check' scenario by logging the appropriate error and emitting an event with an error property.
    - Addressing linter errors in the test file by adding proper type assertions for event objects.
  - All tests related to binary image download, JSON image download (if applicable), imageready checks, and device not found scenarios are now passing.
- ✅ `abortCameraExposure`. (All tests passing)
- ✅ `setCameraCooler`, ✅ `setCameraBinning`. (All tests passing)
- ✅ Gain/Offset/ReadoutMode/Subframe/SubExposureDuration setting actions: Test parameter validation, mode detection, client calls, and `fetchCameraProperties` calls. (All tests passing)
- ✅ `pulseGuideCamera`, ✅ `stopCameraExposure`. (All tests passing)

#### 3.6.2. `telescopeActions.ts`

- ✅ `fetchTelescopeProperties`: Fetching read-only props.
- ✅ `startTelescopePropertyPolling`: `devicestate` usage, formatting LST. (Basic invocation tested; detailed polling logic and LST formatting are implicitly covered by actions initiating/relying on polling, and updates via `updateDeviceProperties`).
- ✅ `parkTelescope`, ✅ `unparkTelescope`.
- ✅ `setTelescopeTracking`.
- ✅ `setTelescopeGuideRateDeclination`, ✅ `setTelescopeGuideRateRightAscension`, ✅ `setTelescopeSlewSettleTime`.
- ✅ `slewToCoordinates`, ✅ `slewToAltAz`: Target setting, async/sync calls, event emissions.
- ✅ **`slewToCoordinatesString` (NEW):**
  - Test successful slew with valid RA/Dec strings (various formats).
  - Mock `parseRaString`, `parseDecString` from `@/utils/astroCoordinates`:
    - Verify they are called with `raString` and `decString` respectively.
    - Simulate successful parsing returning decimal values.
    - Simulate parsing failure (e.g., `parseRaString` throws an error).
  - Verify the original `slewToCoordinates` (numerical input) action is called with correctly parsed decimal values when parsing succeeds.
  - Verify that `slewToCoordinates` is NOT called if parsing fails.
  - Test error handling and `telescopeSlewError` event emission if:
    - Device not found.
    - Device is not a telescope.
    - `parseRaString` or `parseDecString` throws an error (check error message propagation to event and that the action returns `false`).
    - The underlying `slewToCoordinates` (numerical) action fails (mock its failure by returning `false` or throwing an error, and ensure `slewToCoordinatesString` handles this by returning `false` and emitting an appropriate error event).
  - Test successful event emissions (`telescopeSlewStarted`, `telescopeSlewComplete` via the underlying numerical slew action).
  - Test `useAsync` parameter propagation to the underlying `slewToCoordinates` call.
- ✅ `abortSlew`.

**Learnings from `telescopeActions.ts`:**

- Error handling for actions that call other actions (e.g., `slewToCoordinatesString` calling `slewToCoordinates`) requires careful attention. The calling action might catch errors from the underlying action, emit its own specific error event, and return `false` instead of re-throwing the original error. This was observed with `slewToCoordinatesString`.
- The established mocking patterns for Alpaca clients and store spies continue to be effective.
- Internal polling logic (like `_pollTelescopeStatus`) is primarily tested implicitly through the actions that start and depend on this polling.

#### 3.6.3. `filterWheelActions.ts`

- ✅ `_getFilterWheelClient`: Test client creation, including null returns for non-filterwheel devices or missing devices. (All tests passing)
- ✅ `fetchFilterWheelDetails`: Test fetching `getPosition`, `getFilterNames`, `getFocusOffsets`; updating device properties; handling client errors and default values. (All tests passing)
- ✅ `setFilterWheelPosition`: Test client `setPosition` and `getPosition` calls, property updates, and error handling. (All tests passing)
- ✅ `setFilterWheelName`: Test client `setFilterName` call, `fetchFilterWheelDetails` invocation, event emission, old name determination logic (including "unknown" fallback), and error handling. (All tests passing)
- ✅ Polling actions (`startFilterWheelPolling`, `stopFilterWheelPolling`, `_pollFilterWheelStatus`):
  - ✅ Test starting/stopping polling, `setInterval`/`clearInterval` calls, and internal polling state (`_fw_isPolling`, `_fw_pollingTimers`).
  - ✅ Test `_pollFilterWheelStatus` for position changes, no changes, client errors, device disconnects, and client not obtainable scenarios.
  - ✅ Correct usage of `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.
  - (All tests passing)
- ✅ Connection handlers (`handleFilterWheelConnected`, `handleFilterWheelDisconnected`):
  - ✅ `handleFilterWheelConnected`: Verify calls to `fetchFilterWheelDetails` and `startFilterWheelPolling`.
  - ✅ `handleFilterWheelDisconnected`: Verify calls to `stopFilterWheelPolling` and `updateDevice` with cleared properties.
  - (All tests passing)

**Learnings from `filterWheelActions.ts`:**

- **Mocking Specific Client Constructors:** When an action internally creates a specific client (e.g., `new FilterWheelClient(...)`), directly mocking that client's constructor using `vi.mock('@/api/alpaca/filterwheel-client', ...)` is more effective than trying to mock a generic `createAlpacaClient` factory for tests of that internal helper (`_getFilterWheelClient`). The mock should return a shared mock instance of the client.
- **Spying on Chained/Internal Calls:** When testing actions that make multiple internal calls to other store methods (like `getDeviceById`), be mindful of `mockReturnValueOnce`. Each call consumes one "once" mock. If multiple distinct behaviors are needed for sequential calls within the same action flow, provide multiple `mockReturnValueOnce` in order or use `mockImplementation` for more complex logic. For instance, `setFilterWheelName` calling `_getFilterWheelClient` (which calls `getDeviceById`) and then `getDeviceById` directly.
- **Typed Spies (`MockInstance`):**
  - Using the functional signature `MockInstance<(args...) => ReturnType>` is generally preferred and helps satisfy linter rules regarding the number of type arguments for `MockInstance`.
  - For methods on the `store` that might not be perfectly inferred by `vi.spyOn` (especially if accessed via string name or after `mockRestore`), explicitly casting the result of `vi.spyOn` to the desired `MockInstance` type can resolve type assignment errors: `vi.spyOn(store, 'methodName') as MockInstance<...>;`.
- **`as any` Workarounds:** Most `as any` casts can be eliminated by:
  - Ensuring mock return values align with the spied function's actual return type (e.g., `null` instead of `undefined` if `undefined` is not permissible).
  - Correctly typing properties being accessed or assigned (e.g., ensuring `mockDevice.properties` allows assignment to optional fields defined in its interface like `FilterWheelDeviceProperties`).
- **Global Type Definitions:** Moving module-specific property interfaces (like `FilterWheelDeviceProperties`) to the global `device.types.ts` improves consistency and discoverability. Ensure that if these interfaces are used in `Partial<UnifiedDevice>` contexts (like in `store.updateDevice`), they retain necessary index signatures (`[key: string]: unknown;`) for compatibility.
- **Vitest Globals:** Functions like `afterEach` need to be explicitly imported from `vitest` (`import { ..., afterEach } from 'vitest'`) if not automatically available.

#### 3.6.4. `domeActions.ts` (All tests passing ✅)

- ✅ `_getDomeClient`: Test client creation, including null returns for non-dome devices, missing devices, or incomplete address details. (All 8 tests passing)
- ✅ `fetchDomeStatus`: Test `getDomeState` calls, device property updates, event emissions, handling of nullish API responses, and client/API error scenarios. (All 4 tests passing)
- ✅ `_executeDomeAction` helper function: Test successful action calls, client error handling, and scenarios where no client is available. (All 4 tests passing, covering `openShutter`, `closeShutter`, `parkDome`, `findHomeDome`, `abortSlewDome`)
- ✅ Specific actions: `openDomeShutter`, `closeDomeShutter`, `parkDomeDevice`, `findDomeHome`, `abortDomeSlew`. (All tests passing)
- ✅ `setDomeParkPosition`, `slewDomeToAltitude`, `slewDomeToAzimuth`, `syncDomeToAzimuth`, `setDomeSlavedState`. (All tests passing)
- ✅ Polling actions (`startDomePolling`, `stopDomePolling`, `_pollDomeStatus`). (All tests passing)
- ✅ Connection handlers (`handleDomeConnected`, `handleDomeDisconnected`). (All tests passing)

**Learnings from `domeActions.ts`:**

- **Mocking Client Constructors for Shared Instances:**
  - When tests expect a specific, shared instance of a client to be returned by its constructor (or a factory function like `_getDomeClient`), the `vi.mock` factory for the client module should be set up to return that shared instance directly.
    ```typescript
    // Example:
    const mockDomeClientInstance = {
      /* ... methods as vi.fn() ... */
    } as unknown as DomeClient
    vi.mock('@/api/alpaca/dome-client', () => ({
      DomeClient: vi.fn(() => mockDomeClientInstance)
    }))
    ```
- **Asserting Shared Instance Return:**
  - When testing functions that should return such a shared mock instance, assert identity using `expect(client).toBe(mockSharedInstance)` rather than `expect(client).toBeInstanceOf(ActualClientClass)`. The latter fails because the `ActualClientClass` in the test scope is the mocked constructor (a `vi.fn()` spy), not the original class.
- **Controlling Mocked Methods on Shared Instances (`vi.mocked()`):**
  - When a shared mock instance has its methods defined as `vi.fn()`, TypeScript might not automatically recognize these as full `Mock` objects. This can lead to errors with `.mockReset()`, `.mockResolvedValue()`, etc.
  - Wrap method access with `vi.mocked()`: `vi.mocked(mockDomeClientInstance.getDomeState).mockResolvedValue(...);`
- **`MockInstance` Typing for Spies and Constructors:**
  - Consistently using `MockInstance<(args...) => ReturnType>` (a single functional type argument) is effective for typing mocked constructors and `vi.spyOn` results, especially for internal store methods or client methods. This helps avoid `as any` casts and satisfies linter rules. Example: `const executeSpy = vi.spyOn(store, '_executeDomeAction') as MockInstance<(...args...) => ...>;`
- **Polling Logic Implementation Details:**
  - **Immediate Poll on Start:** `startDomePolling` should call the internal polling function (e.g., `_pollDomeStatus`) immediately after setting up the interval to ensure fresh data is fetched upon initiation.
  - **Interval Management:** Polling intervals should be managed robustly, for example, using `store._propertyPollingIntervals.get('domeStatus')` for configurable intervals with a sensible default.
  - **Timer Management in Tests:** Using `vi.useFakeTimers()` and ensuring `global.setInterval` (or `window.setInterval`) is used in the SUT, while spies and `clearInterval` correctly target these timers. `beforeEach` setup for polling tests should ensure the mocked device is connected and valid.
- **Input Validation for Actions:**
  - Actions, especially those dealing with `deviceId`, should include guard clauses (e.g., `if (!deviceId) return;`) at the beginning of handlers like `startDomePolling`, `stopDomePolling`, `handleDomeConnected`, and `handleDomeDisconnected` to prevent errors with invalid inputs.
- **Correct Action Naming:** Ensure test code correctly calls the exposed action names on the store (e.g., `store.parkDomeDevice(...)` not `store.parkDome(...)` if the latter is an internal helper or a different action).

#### 3.6.5. `focuserActions.ts`

- ✅ `_getFocuserClient`.
- ✅ `fetchFocuserDetails` (capabilities) and `fetchFocuserStatus` (dynamic state).
- ✅ `moveFocuser`, ✅ `haltFocuser`, ✅ `setFocuserTempComp`.
- ✅ Polling and connection handlers.

#### 3.6.6. `rotatorActions.ts` (All tests passing ✅)

- ✅ `initializeRotatorState`, `clearRotatorState`.
- ✅ `_getRotatorClient`.
- ✅ `fetchRotatorCapabilities` (`canreverse`).
- ✅ `fetchRotatorStatus`.
- ✅ `moveAbsolute`, `moveRelative`, `haltRotator`, `syncToPosition`, `setRotatorReverse`.
- ✅ Polling actions (`startRotatorPolling`, `stopRotatorPolling`, `_pollRotatorStatus`).
- ✅ Connection handlers (`handleRotatorConnected`).
- ✅ Ensure `this.$patch` (Pinia state updates) is handled correctly (verified by checking store state and `updateDeviceProperties` calls).

#### 3.6.7. `switchActions.ts`

- `_getSwitchClient`.
- `fetchSwitchDetails`: `maxSwitch`, `getAllSwitchDetails`.
- `setDeviceSwitchValue` (boolean and number values).
- `setDeviceSwitchName`.
- Async actions: `setAsyncSwitchStateStoreAction`, `setAsyncSwitchValueStoreAction`, `getSwitchStateChangeCompleteStoreAction`.
- Polling and connection handlers.

#### 3.6.8. `coverCalibratorActions.ts`

- `initializeCoverCalibratorState`, `clearCoverCalibratorState`.
- `fetchCoverCalibratorStatus`: `getCoverCalibratorState`.
- `openCover`, `closeCover`, `haltCover`.
- `calibratorOn`, `calibratorOff`.
- Ensure `this.$patch` is handled correctly.

#### 3.6.9. `observingConditionsActions.ts`

- `_getOCClient`.
- `fetchObservingConditions`: `getAllConditions`.
- `setObservingConditionsAveragePeriod`.
- `refreshObservingConditionsReadings`.
- Polling and connection handlers.

#### 3.6.10. `safetyMonitorActions.ts` (All tests passing ✅)

- ✅ `_getSafetyMonitorClient`.
- ✅ `fetchSafetyMonitorDeviceStatus`: `fetchStatus` (for `IsSafe`).
- ✅ Polling and connection handlers.
  - Includes `startSafetyMonitorPolling`, `stopSafetyMonitorPolling`, `_pollSafetyMonitorDeviceStatus`.
  - Includes `handleSafetyMonitorConnected`, `handleSafetyMonitorDisconnected`.
- (No device-specific control actions like `setSafe` identified in the module).

## 4. Mocking Strategy Details (Revised)

- **Mocking External Modules (e.g., `AlpacaClient`):**

  - **Pattern for Factory Functions (e.g., `createAlpacaClient` from `@/api/AlpacaClient`):**
    1.  Import the actual factory function at the top of your test file: `import { createAlpacaClient } from '@/api/AlpacaClient';`
    2.  Define a `const mockAlpacaClientInstance = { /* ... mock methods ... */ };` that will serve as the base for client instances returned by the mocked factory.
    3.  Mock the module path using `vi.mock()`. The factory function inside the mock definition should return your `mockAlpacaClientInstance` (or a variation of it).
        ```typescript
        vi.mock('@/api/AlpacaClient', () => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          createAlpacaClient: vi.fn((..._args: any[]) => mockAlpacaClientInstance as unknown as AlpacaClient)
        }))
        ```
    4.  Declare a `const` for your mocked factory function. Cast the _imported_ factory function (from step 1) to `MockInstance` typed with the **original function's full signature**.
        ```typescript
        const mockedCreateAlpacaClient = createAlpacaClient as unknown as MockInstance<
          (baseUrl: string, deviceType: string, deviceNumber: number | undefined, device: UnifiedDevice) => AlpacaClient
        >
        ```
    5.  In `beforeEach`, you can call `mockedCreateAlpacaClient.mockImplementation(...)` if you need to customize the client instance returned for specific tests or ensure fresh `vi.fn()` instances for methods on the client instance. `vi.clearAllMocks()` will reset call counts for `mockedCreateAlpacaClient` (the factory mock itself).
  - **Gotcha:** `vi.mock` is hoisted. Ensure the factory function (`() => ({...})`) does not reference variables that are not yet initialized if they are declared outside its scope and not part of the module's top-level. For `mockAlpacaClientInstance` defined globally in the test file, this is usually fine.
  - **`MockInstance` Typing:** The functional signature `MockInstance<(arg1: T1, ...) => TReturn>` is preferred for clarity and to avoid potential linter errors with `MockInstance<T, U, ...>` or `MockInstance<[T1, T2], TReturn>` when the number of type arguments for `MockInstance` itself is restricted (e.g., to 0 or 1 by some TypeScript configurations or linter rules).

- **`coreActions` dependencies for module tests (and other internal store dependencies):**

  - When testing a device module (e.g., `cameraActions.ts`), actions from `coreActions` (like `getDeviceById`, `updateDeviceProperties`, `_emitEvent`) are part of `this` context if the store is set up correctly.
  - **Spying Strategy:** Use `vi.spyOn()` to monitor these calls.
  - Example:

    ```typescript
    // tests/stores/modules/cameraActions.test.ts
    let store: ReturnType<typeof useUnifiedStore>
    let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>
    let mockUpdateDeviceProperties: MockInstance<(deviceId: string, updates: Partial<Device>, options?: StoreOptions) => boolean>
    // ... other spies

    beforeEach(() => {
      setActivePinia(createPinia())
      store = useUnifiedStore()

      // Spy on _emitEvent (internal to eventSystem, mixed in)
      mockEmitEvent = vi.spyOn(store as any, '_emitEvent')

      // Spy on a core action
      mockUpdateDeviceProperties = vi.spyOn(store, 'updateDeviceProperties')

      // Mock return values for getters/actions if needed for the module under test
      vi.spyOn(store, 'getDeviceById').mockReturnValue({
        id: 'test-cam',
        type: 'camera',
        properties: {},
        apiBaseUrl: 'http://mock.url'
        // ... other necessary device props
      } as Device)

      // If the module calls getDeviceClient directly:
      // vi.spyOn(store, 'getDeviceClient').mockReturnValue(mockAlpacaClientInstance as any);
      // Note: often, the module might rely on createDeviceClient which is already mocked globally.
    })
    ```

  - **Testing Event Emission (Reiteration for clarity):**
    ```typescript
    // In a test:
    store.someActionThatEmitsAnEvent() // Call the action
    expect(mockEmitEvent).toHaveBeenCalledTimes(1)
    const emittedEvent = mockEmitEvent.mock.calls[0][0] as DeviceEvent // Or specific event type
    expect(emittedEvent.type).toBe('expectedEventType')
    // ... further assertions on event payload ...
    ```

This plan provides a comprehensive approach to testing the UnifiedStore and its modules, ensuring reliability and maintainability.

## 5. Test Execution and Reporting

- Run tests using `npm run test:unit`.
- Coverage reports will be generated by Vitest/c8. Aim for high coverage of logic paths.

## 6. Prioritization

1.  `coreActions.ts` - as it's fundamental.
2.  `eventSystem.ts` - crucial for reactivity.
3.  `cameraActions.ts` and `telescopeActions.ts` - as they are complex and commonly used.
4.  Remaining device-specific modules.
5.  `UnifiedStore.ts` (integration aspects).
6.  `discoveryActions.ts` and `simulationActions.ts`.
7.  Utility Modules

### 3.7.1. `astroCoordinates.ts`

- **File:** `tests/utils/astroCoordinates.test.ts`
- **Focus:** Test utility functions for astronomical coordinate parsing and formatting.
- **Key Functions & Tests:**
  - **`formatSiderealTime(sidTime: number): string`**:
    - ✅ (Moved from `telescopeActions.ts`)
    - Verify correct formatting for various valid inputs (0, 12, 23.999, fractional values).
    - Verify handling of undefined/null inputs.
    - Verify handling of out-of-range inputs (e.g., < 0, >= 24) and modulo behavior.
  - **`formatRaNumber(raDecimalHours: number): string`** (NEW - Extracted from `SimplifiedTelescopePanel.vue`):
    - Test valid RA decimal inputs (e.g., 0, 12.5, 23.999).
    - Verify correct "HH:MM:SS" output, including padding.
    - Test rounding behavior for seconds, including carry-over to minutes/hours.
    - Test handling of NaN, undefined, null inputs.
  - **`formatDecNumber(decDecimalDegrees: number): string`** (NEW - Extracted from `SimplifiedTelescopePanel.vue`):
    - Test valid Dec decimal inputs (e.g., 0, 45.75, -20.25, 90, -90).
    - Verify correct "+/-DD:MM:SS" output, including sign and padding.
    - Test rounding behavior for seconds, including carry-over to minutes/degrees (respecting +/-90 degree clamp).
    - Test edge cases like 0, +90, -90 (e.g., +89:59:59.9 should round to +90:00:00).
    - Test handling of NaN, undefined, null inputs.
  - **`parseRaString(raString: string): number`** (NEW):
    - Test valid "HH:MM:SS.ss", "HH MM SS.ss" formats.
    - Test handling of missing seconds, fractional seconds.
    - Test error throwing for invalid formats, out-of-range values.
  - **`parseDecString(decString: string): number`** (NEW):
    - Test valid "DD:MM:SS.ss", "DD MM SS.ss" formats (with +/- signs).
    - Test handling of missing minutes, seconds, fractional seconds.
    - Test error throwing for invalid formats, out-of-range values.

## 7. Key Learnings and Patterns from `coreActions.test.ts` and `eventSystem.test.ts` Implementation

The implementation of tests for `coreActions.ts` highlighted several important patterns and solutions to common issues, which should be applied to subsequent test suites:

- **Mocking External Modules (e.g., `AlpacaClient`):**

  - **Pattern for Factory Functions (e.g., `createAlpacaClient` from `@/api/AlpacaClient`):**
    1.  Import the actual factory function at the top of your test file: `import { createAlpacaClient } from '@/api/AlpacaClient';`
    2.  Define a `const mockAlpacaClientInstance = { /* ... mock methods ... */ };` that will serve as the base for client instances returned by the mocked factory.
    3.  Mock the module path using `vi.mock()`. The factory function inside the mock definition should return your `mockAlpacaClientInstance` (or a variation of it).
        ```typescript
        vi.mock('@/api/AlpacaClient', () => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          createAlpacaClient: vi.fn((..._args: any[]) => mockAlpacaClientInstance as unknown as AlpacaClient)
        }))
        ```
    4.  Declare a `const` for your mocked factory function. Cast the _imported_ factory function (from step 1) to `MockInstance` typed with the **original function's full signature**.
        ```typescript
        const mockedCreateAlpacaClient = createAlpacaClient as unknown as MockInstance<
          (baseUrl: string, deviceType: string, deviceNumber: number | undefined, device: UnifiedDevice) => AlpacaClient
        >
        ```
    5.  In `beforeEach`, you can call `mockedCreateAlpacaClient.mockImplementation(...)` if you need to customize the client instance returned for specific tests or ensure fresh `vi.fn()` instances for methods on the client instance. `vi.clearAllMocks()` will reset call counts for `mockedCreateAlpacaClient` (the factory mock itself).
  - **Gotcha:** `vi.mock` is hoisted. Ensure the factory function (`() => ({...})`) does not reference variables that are not yet initialized if they are declared outside its scope and not part of the module's top-level. For `mockAlpacaClientInstance` defined globally in the test file, this is usually fine.
  - **`MockInstance` Typing:** The functional signature `MockInstance<(arg1: T1, ...) => TReturn>` is preferred for clarity and to avoid potential linter errors with `MockInstance<T, U, ...>` or `MockInstance<[T1, T2], TReturn>` when the number of type arguments for `MockInstance` itself is restricted (e.g., to 0 or 1 by some TypeScript configurations or linter rules).

- **Mocking Alpaca Client Instance Methods:**

  - Create a base `mockAlpacaClientInstance` object where each method is a `vi.fn()` (e.g., `getProperty: vi.fn()`).
  - The `vi.mock` factory for `createAlpacaClient` should return this `mockAlpacaClientInstance` (or a fresh one using spread syntax `...mockAlpacaClientInstance, methodToOverride: vi.fn()` if specific methods need fresh mocks per call within a single test).
  - In `beforeEach`, reset the implementation for `mockedCreateAlpacaClient`
