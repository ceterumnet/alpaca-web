# Alpaca Client Unit Test TODO

This document tracks the progress of creating unit tests for the Alpaca client files.

## Client Test Status

- [x] `camera-client.ts`
- [x] `covercalibrator-client.ts`
- [ ] `dome-client.ts`
- [ ] `filterwheel-client.ts`
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
