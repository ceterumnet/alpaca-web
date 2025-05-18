# Camera Gain/Offset: Values vs. Index Mode Implementation Strategy

This document outlines the proposed strategy for handling the two different modes of camera gain and offset control as defined by the Alpaca specification, within the `cameraActions.ts` store module.

## Background

The Alpaca specification allows cameras to manage gain and offset in two primary ways:

1.  **List/Index Mode:**

    - The camera provides a list of predefined string names for gain/offset (e.g., `camera.gains` = `["Low", "Medium", "High"]` or `camera.offsets` = `["100", "200"]`).
    - The `camera.gain` (or `camera.offset`) property, when read, returns the _currently selected index_ (a number) into that list.
    - To set the gain/offset, the client sends the desired _index_ (a number) to the `PUT /camera/{device_number}/gain` (or `offset`) endpoint. The endpoint always expects a numeric parameter.

2.  **Values Mode:**
    - The `camera.gains` (or `camera.offsets`) list is typically empty or not present/supported by the device for this mode.
    - The `camera.gain` (or `camera.offset`) property, when read, returns the _actual numeric gain/offset value_.
    - This value is constrained by `camera.gainmin`/`camera.gainmax` (or `camera.offsetmin`/`camera.offsetmax`).
    - To set the gain/offset, the client sends the desired _numeric value_ to the `PUT /camera/{device_number}/gain` (or `offset`) endpoint. The endpoint always expects a numeric parameter.

The core challenge is that the same `PUT /gain` and `PUT /offset` Alpaca endpoints are used for both modes, and they always expect a numeric parameter. The _meaning_ of that number (whether it's an index or a direct value) changes based on the camera's current operational mode for gain/offset.

## Proposed Implementation Strategy

### 1. Enhance Stored Camera Properties

The `CameraDeviceProperties` interface (likely within `cameraActions.ts` or an imported types file) will be augmented to store the determined operational mode for both gain and offset:

- `cam_gainMode: 'list' | 'value' | 'unknown'`
- `cam_offsetMode: 'list' | 'value' | 'unknown'`

**Mode Determination Logic (within `fetchCameraProperties` or similar data-fetching action):**

- **For `cam_gainMode`:**
  - If the fetched `gains` property is an array with `length > 0`, `cam_gainMode` is set to `'list'`.
  - Else, if `gainmin` and `gainmax` are both valid numbers, `cam_gainMode` is set to `'value'`.
  - Otherwise, `cam_gainMode` is set to `'unknown'`.
- **For `cam_offsetMode`:**
  - A similar logic applies, using the `offsets`, `offsetmin`, and `offsetmax` properties.

These determined modes will be stored alongside other camera properties in the Pinia store for the specific device.

### 2. Implement `setCameraGain` and `setCameraOffset` Store Actions

New store actions will be created with flexible signatures:

- `async setCameraGain(deviceId: string, desiredGain: number | string): Promise<void>`
- `async setCameraOffset(deviceId: string, desiredOffset: number | string): Promise<void>`

**Internal Logic for `setCameraGain` (and similarly for `setCameraOffset`):**

1.  **Retrieve Context:** Get the `CameraClient` instance and the current device properties from the store. This includes `cam_gainMode`, the `gains` array (if any), `gainmin`, and `gainmax`.
2.  **Mode-Specific Value Preparation:**
    - **If `cam_gainMode` is `'list'`:**
      - If `desiredGain` is a `string`: Attempt to find its corresponding index in the `device.properties.gains` array. If the name is not found, an error should be logged, and an appropriate event emitted.
      - If `desiredGain` is a `number`: Treat it as the intended index. Validate that this number is a valid index within the bounds of the `gains` array.
      - The `numericValueToSend` to the client's `setGain` method will be the validated index.
    - **If `cam_gainMode` is `'value'`:**
      - If `desiredGain` is a `string`: Attempt to parse it into a numeric value. If parsing fails, an error should be logged/emitted.
      - If `desiredGain` is a `number`: Use it directly.
      - Validate the resulting numeric value against the `device.properties.gainmin` and `device.properties.gainmax`. Clamp or error if out of bounds, as appropriate for the application's desired behavior (discussion needed: clamp vs. error).
      - The `numericValueToSend` to the client's `setGain` method will be this validated (and possibly clamped) numeric value.
    - **If `cam_gainMode` is `'unknown'` (or if mode detection failed previously):**
      - Log an error. It's not possible to reliably interpret `desiredGain`. An event indicating this issue should be emitted. The call to the client should likely be skipped.
3.  **Client Call:** If a valid `numericValueToSend` is determined, call `cameraClient.setGain(numericValueToSend)`.
4.  **State Update:** After a successful client call, re-fetch relevant camera properties (e.g., `gain`, `camerastate`, and potentially others that might be affected) to update the store.
5.  **Event Emission:** Emit events to signal the outcome of the operation (success, failure, specific error details).

### Benefits of This Approach

- **Clear UI Guidance:** The UI can subscribe to `cam_gainMode` and `cam_offsetMode` from the store. This allows it to dynamically render the most appropriate input control for the user:
  - A dropdown/select list populated from the `gains` (or `offsets`) array if in `'list'` mode.
  - A numeric input field (e.g., a slider or text box with min/max validation derived from `gainmin`/`gainmax`) if in `'value'` mode.
- **Simplified UI Interaction:** The UI's responsibility is primarily presentation. It can pass the user's direct selection (a string name from a dropdown, or a number from an input field) to the store action, without needing to perform complex mode detection or value translation itself.
- **Centralized and Robust Logic:** The complex logic for mode detection, value/index interpretation, and validation is encapsulated within the store actions. This makes the system more maintainable and less prone to inconsistencies.

### Open Questions / Discussion Points for UI/UX

- **Error Handling for Invalid User Input:**
  - If in `'list'` mode and the user somehow provides a gain name not in the list, how should this be handled? (The store action would error, but the UI might pre-validate).
  - If in `'value'` mode and the user enters a value outside `gainmin`/`gainmax`: Should the store action clamp the value to the nearest valid limit, or reject the request? The Alpaca spec implies the device itself would reject out-of-range values, so the action might best reflect that by erroring.
- **Behavior for `'unknown'` Mode:** If `cam_gainMode` is `'unknown'`, the UI should ideally disable the gain control or display an informative message indicating that the gain cannot be set until the mode is clarified (which might point to a device communication issue or an unusual camera configuration).

This strategy aims to provide a robust and user-friendly way to manage camera gain and offset settings, accommodating the flexibility of the Alpaca specification.
