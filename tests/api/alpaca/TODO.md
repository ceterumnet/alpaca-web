# Alpaca Client Unit Test TODO

This document tracks the progress of creating unit tests for the Alpaca client files.

## Client Test Status

- [x] `camera-client.ts`
- [x] `covercalibrator-client.ts`
- [x] `dome-client.ts`
- [x] `filterwheel-client.ts`
- [ ] `focuser-client.ts`
- [ ] `observingconditions-client.ts`
- [ ] `rotator-client.ts`
- [ ] `safetymonitor-client.ts`
- [ ] `switch-client.ts`
- [ ] `telescope-client.ts`

## Notes & Patterns

(Add any notes, common patterns, or decisions made during testing here to help with subsequent tests.)

1.  **Mocking `fetch`**: Use `vi.fn()` for `global.fetch` and reset it in `beforeEach`.

    ```typescript
    const mockFetch = (global.fetch = vi.fn())
    beforeEach(() => {
      client = new XxxClient(baseUrl, deviceNumber, mockXxxDevice as Device)
      mockFetch.mockReset()
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })
    ```

2.  **Mock Device**: Create a `mockXxxDevice` of type `UnifiedDevice` (or the specific device type if more appropriate) to pass to the client constructor. Populate it with essential properties used by the client or its base class.

3.  **Base Client Properties**: Test that the constructor correctly initializes properties from `AlpacaClient` (baseUrl, deviceType, deviceNumber, device, clientId).

4.  **Capability Methods** (e.g., `canAbortExposure`, `canSpecificAction`):

    - These are typically `getProperty` calls returning a boolean.
    - Test for both `true` and `false` responses from the mock.
    - Verify the correct endpoint and `GET` method are used.
    - Example mock response: `{ Value: true, ErrorNumber: 0, ErrorMessage: '' }`.

5.  **Action Methods** (e.g., `startExposure`, `specificAction`):

    - These are often `put` or `callMethod` calls, resulting in `PUT` requests.
    - Verify the correct endpoint and `PUT` method.
    - Verify that parameters are correctly formatted in the request body (e.g., using `URLSearchParams`). Remember `ClientID` is added automatically by `base-client`.
    - Alpaca spec often dictates PascalCase for parameters in the request body (e.g., `Duration`, `Light`).
    - Example mock response for successful PUT: `{ Value: null, ErrorNumber: 0, ErrorMessage: '' }`.

6.  **Property Getters** (e.g., `getCameraState`, `getSpecificValue`):

    - These are `getProperty` calls returning numbers, strings, or booleans.
    - Verify the correct endpoint and `GET` method.
    - Mock the `Value` in the response with a sample valid value.

7.  **Property Setters** (e.g., `setGain`, `setSpecificProperty`):

    - These are `setProperty` calls, resulting in `PUT` requests.
    - `setProperty(propertyName, value)` uses `toParamFormat(propertyName)` from `base-client.ts` to format the parameter name in the request body. This usually converts camelCase/lowercase `propertyName` to PascalCase (e.g., `cooleron` -> `Cooleron`, `startx` -> `StartX`). Expect the exact casing from `toParamFormat` in the test's `expectedBody`.
    - Boolean values passed to `setProperty` are converted to "True" or "False" strings by `toAscomValue()` in `base-client.ts` before being sent in the request body.
    - The stringification of `URLSearchParams` seems to preserve the order of parameter definition/appending, not strictly alphabetizing. Client code might result in specific device parameters appearing before `ClientID` in the request body. Tests for `expectedBody` need to match this observed order.
    - If a method sets multiple properties (e.g., `setBinning(binX, binY)`), expect multiple `mockFetch` calls.

8.  **Complex Getter Methods** (e.g., `getCameraInfo`):

    - These methods often involve multiple `getProperty` calls, conditional logic, and error handling (`try-catch` blocks).
    - Set up a `consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});` in `beforeEach` within the `describe` block for this method, and restore it in `afterEach`.
    - **Happy Path Test**: Mock successful responses for all expected properties. Use `mockFetch.mockImplementation()` to serve responses based on the requested property name.
    - **Conditional Logic Tests**: For each significant conditional branch:
      - Set up mock properties to trigger that specific branch (e.g., `sensortype: 0` for monochrome, `cangetcoolerpower: false`).
      - Assert that properties _dependent_ on that condition are fetched or _not_ fetched as appropriate.
      - Verify that `console.warn` is called (or not called) for expected scenarios (e.g., failing to fetch a property that has a capability flag set to true vs. not attempting to fetch when the flag is false).
      - When checking that certain properties are _not_ fetched, ensure the test logic correctly identifies the Alpaca method name from the URL path rather than using a simple `includes()` check on the full URL string, especially for capability-reporting properties (e.g., `cangetcoolerpower` vs. `coolerpower`).
    - **List vs. Value Mode** (e.g., for `gains`/`gain`/`gainmin`/`gainmax`):
      - _List Mode_: If `getProperty('gains')` returns a non-empty array, then `getProperty('gain')` (for index) should be called, but `getProperty('gainmin')` and `getProperty('gainmax')` should _not_.
      - _Value Mode (empty list)_: If `getProperty('gains')` returns an empty array, then `getProperty('gain')` (for value), `getProperty('gainmin')`, and `getProperty('gainmax')` _should_ all be called.
      - _Value Mode (list fetch fails)_: If `getProperty('gains')` fails, then `getProperty('gain')` (for value), `getProperty('gainmin')`, and `getProperty('gainmax')` _should_ still be called, and a warning for the failed list fetch should be logged.

9.  **Error Handling**: For methods that can throw `AlpacaError`, test these paths by mocking `fetch` to return error statuses (e.g., `ok: false, status: 500`) or Alpaca error objects in the JSON response.

10. **Alpaca Endpoints & Parameter Casing**: Pay close attention to the expected Alpaca endpoint names (lowercase, e.g., `canabortexposure`, `startexposure`) and the casing of parameters within the request body (often PascalCase for `PUT` requests, e.g., `Duration`, `Light`, `Cooleron`).

11. **Speeding Up Error/Retry Tests**: For tests that verify error handling with retries (which can be slow due to default retry delays), temporarily modify `DEFAULT_OPTIONS` from `@/api/alpaca/types` at the beginning of the specific test. Set `retries`, `retryDelay`, and `timeout` to very small values (e.g., 1, 1, 100 respectively). Adjust mock fetch call counts and assertions accordingly. CRITICALLY, ensure these global `DEFAULT_OPTIONS` are restored to their original values in a `finally` block to prevent test interference.

    ```typescript
    it('some error test that should be fast', async () => {
      const originalRetries = DEFAULT_OPTIONS.retries
      const originalRetryDelay = DEFAULT_OPTIONS.retryDelay
      const originalTimeout = DEFAULT_OPTIONS.timeout

      DEFAULT_OPTIONS.retries = 1
      DEFAULT_OPTIONS.retryDelay = 1
      DEFAULT_OPTIONS.timeout = 100

      try {
        // ... test logic mocking fetch for 1 retry (2 total calls)
        // expect(mockFetch).toHaveBeenCalledTimes(1 + 1);
      } catch (error) {
        // ... expect error
      } finally {
        DEFAULT_OPTIONS.retries = originalRetries
        DEFAULT_OPTIONS.retryDelay = originalRetryDelay
        DEFAULT_OPTIONS.timeout = originalTimeout
      }
    })
    ```

This detailed list should serve as a good guide for the remaining client tests.

### Lessons Learned / Common Pitfalls from `dome-client.ts`

Based on the implementation of `dome-client.spec.ts`, the following points are crucial to remember for subsequent client tests to avoid repeated errors:

1.  **Module Path Aliases (`@/`):**

    - Ensure that Vitest configuration (`vitest.config.ts` or `vite.config.ts`) correctly resolves path aliases (e.g., `@/api/alpaca/errors`, `@/stores/types/device-store.types`).
    - Linter errors might initially flag these if not perfectly configured, but they should resolve correctly during the test run if Vitest is set up properly.

2.  **Enum Assumptions:**

    - Do not assume the existence of enums (e.g., `DomeState.Open`) unless they are explicitly defined and imported. Alpaca often uses simple numeric or string literals for states. Verify with the Alpaca specification or client implementation.

3.  **`DEFAULT_OPTIONS` for Retries/Timeouts (Pattern #11 Reminder):**

    - Strictly apply Pattern #11 by modifying `DEFAULT_OPTIONS.retries`, `DEFAULT_OPTIONS.retryDelay`, and `DEFAULT_OPTIONS.timeout` for error/retry tests to significantly speed them up. Always restore original values in a `finally` block.

4.  **Detailed Assertions for `fetch` Mocks:**

    - **`deviceType` Casing:** The `deviceType` property in the client (e.g., `client.deviceType`) is typically lowercase (e.g., 'dome'), even if the device's `DeviceType` property in `mockXxxDevice` is PascalCase ('Dome'). Ensure assertions match the client's property.
    - **`ClientID` Parameter:** For GET requests, `ClientID` is added as a URL parameter (`?ClientID=xxx`). For PUT requests, `ClientID` is typically added to the `URLSearchParams` body. Ensure `client.clientId` is used for dynamic matching, not hardcoded values.
    - **`ClientTransactionID` Parameter:** This is generally _not_ added by the base client for GET request URLs. For PUT request bodies, it's also generally _not_ automatically added by the base client unless explicitly part of the method's parameters. Double-check if the specific client method or base client logic adds it.
    - **Headers & Signal:** Always expect `headers: { Accept: 'application/json' }` (and `'Content-Type': 'application/x-www-form-urlencoded'` for PUTs) and `signal: expect.any(AbortSignal)` in `toHaveBeenCalledWith` for fetch mocks, as the base client adds these.
    - **PUT Body:** Ensure the PUT body is correctly stringified if using `URLSearchParams` (e.g., `expectedBody.toString()`).

5.  **`AlpacaError` Property Access:**

    - When testing for `AlpacaError`, the device-specific error number is typically at `error.deviceError.errorNumber` or, more safely, `error.deviceError?.errorNumber` to avoid issues if `deviceError` is undefined.

6.  \*\*Complex Getters (e.g., `getDomeState`, `getCameraInfo`):
    - **Property Name Casing (`toTsFormat`):** These methods often use `getProperties()` which internally calls `toTsFormat` (from `src/types/property-mapping.ts`) to convert Alpaca property names (lowercase) to TypeScript format (often camelCase or as per `propertyNameFormats` map).
      - The keys in the _final expected result object_ must match the output of `toTsFormat`.
      - Check `propertyNameFormats` in `property-mapping.ts`. If a property is listed, its `PropertyNameFormat.TS` value is used.
      - If a property is _not_ in `propertyNameFormats`, `toTsFormat` applies a fallback (e.g., `p.charAt(0).toLowerCase() + p.slice(1)`), which often leaves already-lowercase Alpaca names as is.
      - The mock data provided to `mockFetch.mockImplementation` for individual `getProperty` calls should use the _original lowercase Alpaca property names_ as keys.
    - **Type Conversions:** Be mindful of type conversions (e.g., `driverversion` might be a string from the device but converted to a number by `fromAscomValue` or similar logic in the client before being returned). The expected type in `mockDomeStateResponseFinal` should reflect this final type.

By paying close attention to these details, the process of writing unit tests for the remaining Alpaca clients should be smoother and more efficient.

### Additional Learnings (from `filterwheel-client.ts` and `covercalibrator-client.ts` debugging)

12. **`toTsFormat` Fallback Behavior for Property Keys**:

    - If an Alpaca property name (e.g., `coverstate`, `maxbrightness`, `calibratorchanging`, `covermoving`) does not have an explicit `PropertyNameFormat.TS` mapping in `propertyNameFormats` (in `src/types/property-mapping.ts`), the `toTsFormat` function's fallback will likely result in the TypeScript key being identical to the lowercase Alpaca name (e.g., `result.coverstate`, not `result.coverState`).
    - Assertions for keys in objects returned by `getProperties()` (and methods like `getDomeState`, `getCoverCalibratorState` that use it) must reflect this actual transformation. Always verify the expected key name against `toTsFormat`'s behavior for the specific Alpaca property.

13. **`driverVersion` Type Anomaly**:

    - Although the Alpaca specification indicates `DriverVersion` should be a string (e.g., `'1.0'`), during tests for `covercalibrator-client.ts`, the `result.driverVersion` value was consistently a number (`1`), even when the mock was set to provide the string `'1.0'` and `fromAscomValue` was expected to preserve it.
    - For `covercalibrator-client.test.ts`, test mocks for `driverversion` had to provide a number (`1`) to ensure assertions like `expect(result.driverVersion).toBe(mockProperties.driverversion)` passed. Be prepared for potential similar behavior with `driverVersion` in other clients.

14. **Robust Mocking for `getProperties()` and Complex Getters**:
    - When testing methods that internally call `getProperties()` (e.g., `getCoverCalibratorState`, `getCameraInfo`, `getDomeState`), ensure your `mockFetch` implementation is precise and comprehensive:
      - **Specific Property Matching**: Use reliable methods to extract the Alpaca property name from the `fetch` URL (e.g., last path segment) for conditioning your mock's responses, rather than relying on broad `url.includes('someprop')`.
      - **Comprehensive Mocking**: If you're testing a scenario where one sub-property fetch fails (and `getProperties` logs a warning), your mock must still provide valid successful responses for _all other properties_ that the method under test will fetch via `getProperties`. Failure to do so can lead to multiple, unexpected `console.warn` calls from `getProperties`'s internal error handling for successfully fetched but unmocked (or poorly mocked) properties, which can complicate `console.warn` spy assertions.
      - The test `CoverCalibratorClient > getCoverCalibratorState > should return partial data and warn if an individual property fetch fails` provides a good pattern using an `expectedProperties` map to manage all potential fetched values and ensure only the intentionally failing property triggers a warning.
