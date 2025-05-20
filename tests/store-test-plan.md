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
  - **State:** Verify initial `DiscoveryState`.
  - **`startDiscovery`:**
    - Set `isDiscovering` to true.
    - Clear existing `discoveryTimeout`.
    - Emit `discoveryStarted` event.
    - Prevent starting if already discovering.
  - **`stopDiscovery`:**
    - Set `isDiscovering` to false.
    - Clear `discoveryTimeout`.
    - Emit `discoveryStopped` event.
    - Prevent stopping if not discovering.

### 3.5. `simulationActions.ts`

- **File:** `tests/stores/modules/simulationActions.test.ts`
- **Focus:** Test management of simulation settings and simulated device behaviors.
- **Key Tests:**
  - **State:** Verify initial `SimulationState`.
  - **`setAllowSimulations`:**
    - Toggle `allowSimulations` state.
  - **`getSimulatedDevices`:**
    - Filter and return devices with `properties.isSimulation === true`.
  - **`simulateCameraExposure`:**
    - Mock `updateDeviceProperties` and `_emitEvent`.
    - Verify state changes (`isExposing`, `exposureProgress`, `cameraState`, `imageReady`).
    - Verify `cameraExposureStarted`, `cameraExposureChanged`, `cameraExposureComplete` events are emitted with correct payloads.
    - Test timer logic (mock `setInterval`, `clearInterval`).
  - **`simulateTelescopeSlew`:**
    - Mock `updateDeviceProperties` and `_emitEvent`.
    - Verify state changes (`isSlewing`, `rightAscension`, `declination`).
    - Verify `telescopeSlewStarted`, `telescopeSlewCompleted` events.
    - Test with simulated device only.
  - **`shouldFallbackToSimulation`:**
    - Test with `allowSimulations` true/false.
    - Test with simulated and non-simulated devices.
  - **`simulateDeviceMethod`:**
    - Test dispatch to specific simulation methods (e.g., `simulateCameraExposure`).
    - Test generic fallback for unhandled methods.
    - Test behavior when called for non-simulation device or when simulations are disabled.
    - Verify event emission.

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

- `fetchTelescopeProperties`: Fetching read-only props.
- `startTelescopePropertyPolling`: `devicestate` usage, formatting LST.
- `parkTelescope`, `unparkTelescope`.
- `setTelescopeTracking`.
- `setTelescopeGuideRateDeclination`, `setTelescopeGuideRateRightAscension`, `setTelescopeSlewSettleTime`.
- `slewToCoordinates`, `slewToAltAz`: Target setting, async/sync calls, event emissions.
- `abortSlew`.

#### 3.6.3. `filterWheelActions.ts`

- `_getFilterWheelClient`: Test client creation.
- `fetchFilterWheelDetails`: `getPosition`, `getFilterNames`, `getFocusOffsets`.
- `setFilterWheelPosition`.
- `setFilterWheelName`.
- Polling actions.
- Connection handlers.

#### 3.6.4. `domeActions.ts`

- `_getDomeClient`.
- `fetchDomeStatus`: `getDomeState`.
- `_executeDomeAction` helper function.
- Specific actions: `openDomeShutter`, `closeDomeShutter`, etc.
- `setDomeParkPosition`, `slewDomeToAltitude`, `slewDomeToAzimuth`, `syncDomeToAzimuth`, `setDomeSlavedState`.
- Polling and connection handlers.

#### 3.6.5. `focuserActions.ts`

- `_getFocuserClient`.
- `fetchFocuserDetails` (capabilities) and `fetchFocuserStatus` (dynamic state).
- `moveFocuser`, `haltFocuser`, `setFocuserTempComp`.
- Polling and connection handlers.

#### 3.6.6. `rotatorActions.ts`

- `initializeRotatorState`, `clearRotatorState`.
- `fetchRotatorCapabilities` (`canreverse`).
- `fetchRotatorStatus`.
- `moveAbsolute`, `moveRelative`, `haltRotator`, `syncToPosition`, `setRotatorReverse`.
- Ensure `this.$patch` is handled correctly with Pinia testing utilities or spied upon.

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

#### 3.6.10. `safetyMonitorActions.ts`

- `_getSafetyMonitorClient`.
- `fetchSafetyMonitorDeviceStatus`: `fetchStatus` (for `IsSafe`).
- Polling and connection handlers.

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
  - In `beforeEach`, reset the implementation for `mockedCreateAlpacaClient` to ensure it returns the base mock structure, potentially with fresh `vi.fn()` instances for methods that track calls/state per test:
    ```typescript
    mockedCreateAlpacaClient.mockImplementation(
      (..._args: any[]) =>
        ({
          ...mockAlpacaClientInstance,
          setProperty: vi.fn().mockResolvedValue(undefined),
          getProperty: vi.fn().mockResolvedValue(null)
        }) as unknown as AlpacaClient
    )
    ```

- **Spying on Store Actions (e.g., `_emitEvent`):**

  - **Pattern:** `mockEmitEvent = vi.spyOn(store as any, '_emitEvent');`
    - The `as any` is sometimes necessary if the method is not part of the public type definition but is internally accessible.
  - **Typing the Spy:** `let mockEmitEvent: MockInstance<(event: DeviceEvent) => void>;` (Adjust args and return type as needed).

- **Testing Event Emission (`_emitEvent`):**

  - If `_emitEvent` is called with a single event object (e.g., `this._emitEvent({ type: '''deviceAdded''', ... })`):
    ```typescript
    expect(mockEmitEvent).toHaveBeenCalledTimes(1)
    const emittedEvent = mockEmitEvent.mock.calls[0][0] // Event object is the first arg of the first call
    expect(emittedEvent.type).toBe('''deviceAdded''')
    if (emittedEvent.type === '''deviceAdded''') {
      // Type guard for type-specific properties
      expect(emittedEvent.device).toHaveProperty('''id''', '''expectedId''')
    }
    ```
  - **Silent Options:** For tests checking that an event is _not_ emitted (e.g., `options.silent === true`), filter the calls to be specific:
    ```typescript
    const deviceAddedCalls = mockEmitEvent.mock.calls.filter((call) => {
      const event = call[0]
      return event.type === '''deviceAdded'''
    })
    expect(deviceAddedCalls.length).toBe(0)
    ```
  - **Discriminated Unions (e.g., `DeviceEvent`):** When asserting specific event payloads from a discriminated union type, remember to use type guards to narrow down the event type before accessing type-specific properties. For example:
    ```typescript
    const deviceConnectedEventCall = mockEmitEvent.mock.calls.find(
      (call) => call[0].type === '''deviceConnected'''
    )
    expect(deviceConnectedEventCall).toBeDefined()
    if (deviceConnectedEventCall) {
      const eventPayload = deviceConnectedEventCall[0] // as DeviceEvent
      if (eventPayload.type === '''deviceConnected''') { // Type guard
        expect(eventPayload.deviceId).toBe(deviceId)
      } else {
        throw new Error('Expected deviceConnected event') // Or fail test
      }
    }
    ```

- **Lifecycle and Cleanup:**

  - Use `vi.clearAllMocks()` in `beforeEach` to reset call counts and mock implementations between tests.
  - For specific mocks (like `mockedCreateAlpacaClient`), also re-apply a base `mockImplementation` in `beforeEach` if its behavior needs to be consistent at the start of each test, especially if some tests use `mockImplementationOnce`.

- **Linter Workarounds:**

  - For generic mock function signatures like `(..._args: any[])`, linters might complain about `_args` being unused or `any` type. Using `eslint-disable-next-line @typescript-eslint/no-unused-vars` and `@typescript-eslint/no-explicit-any` locally for these specific lines is acceptable if the overall mock typing is sound.

- **Debugging Tips:**

  - Liberal use of `console.log` within the store actions being tested can be very helpful to trace execution flow and inspect state during test runs.
  - Carefully analyze the `Expected` vs. `Received` sections in Vitest error outputs.

- **Error Handling in Asynchronous Actions:**

  - When an `async` store action (e.g., `connectDevice`) internally calls a mocked client method that is designed to `throw` an error for a failure test case, the `catch` block in the store action must `return` a value (e.g., `false`) rather than re-throwing the error if the test expects the action's promise to _resolve_ (e.g., to `false`). If the `catch` block re-throws, the action's promise will _reject_, leading to test failures like "promise rejected instead of resolving".

    ```typescript
    // In store action:
    // async connectDevice(deviceId: string): Promise<boolean> {
    //   try {
    //     await client.setProperty('''connected''', true); // This might throw in a test
    //     // ... success logic ...
    //     return true;
    //   } catch (error) {
    //     // ... error handling logic ...
    //     return false; // Crucial: ensures promise resolves to false
    //   }
    // }

    // In test:
    // await expect(store.connectDevice(deviceId)).resolves.toBe(false);
    ```

- **Vitest Asynchronous Assertions:**

  - For `async` actions that are expected to resolve (even if to a "failure" value like `false`), `await expect(actionPromise).resolves.toBe(expectedValue)` provides clearer intent and error messages than `const result = await actionPromise; expect(result).toBe(expectedValue)`. This is especially true if the promise might unexpectedly reject.

- **Correct Type/Enum Usage:**
  - Always ensure that status strings or other values set in actions (e.g., `device.status = 'error'`) match the exact values defined in their respective types (e.g., `DeviceState`). Mismatches (like `'connectionError'` vs. `'error'`) can lead to subtle bugs and test failures. Refer to type definition files (`*.types.ts`) when in doubt.

Key Learnings from `eventSystem.ts` testing:

- **`addEventListener` Signature:** Confirmed that `addEventListener` in the current system takes a single argument: a listener function `(event: DeviceEvent) => void`. Listeners are generic and must filter events by `event.type` internally.
- **Initial State of `eventHandlers`:** The `eventHandlers` property (for the legacy string-based event system) initializes as an empty object `{}` rather than a `Map`. Tests should expect this.
- **Testing Guarded Code Paths:** To test code paths that are behind conditional guards (e.g., the debug log in `emit` which only runs if `eventHandlers[event]` exists), ensure the test setup satisfies these guard conditions (e.g., by adding a dummy handler).
- **Vitest Mock Typing:** For complex function signatures or when Vitest's inference is tricky, explicitly typing mocks using the full function signature can be more robust (e.g., `vi.fn<(event: DeviceEvent) => void>()` or `import('vitest').Mock<(event: DeviceEvent) => void>`).
- **`DeviceEvent` Payloads:** When creating `DeviceEvent` objects for tests, ensure they include all properties required by their specific `type` (e.g., a `device` object for `deviceAdded` events). Refer to `device-store.types.ts`.
- **`console.error` Spying:** Use `vi.spyOn(console, 'error').mockImplementation(() => {})` for tests involving `console.error` and remember to call `mockRestore()` in `afterEach`.

By following these patterns, future tests should be more straightforward to implement and less prone to the tricky mocking and typing issues encountered initially.

This plan provides a comprehensive approach to testing the UnifiedStore and its modules, ensuring reliability and maintainability.
