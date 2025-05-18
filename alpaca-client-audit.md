# Alpaca Client API Audit

This document outlines an audit of the Alpaca client implementations in `src/api/alpaca/` against the Alpaca API specification found in `docs/alpaca/AlpacaDeviceAPI_v1.yaml`.

The audit was performed by comparing the methods and properties implemented in each client file with the endpoints listed in the specification for the corresponding device type. Common device methods (handled by `AlpacaClient` base class) were generally not part of this specific audit unless a client was overriding or directly interacting with them in a device-specific way.

## General Notes:

- Parameter casing for PUT requests: The Alpaca specification states "Parameter names are not case sensitive". Client implementations generally use helper functions (`toParamFormat`) which should handle appropriate casing (typically PascalCase for Alpaca parameters).
- The `get<DeviceType>State()` methods in many clients are helper functions that bundle multiple GET requests. Their contents were checked against available spec properties.

## Audit Summary by Client:

### 1. `DomeClient` (`src/api/alpaca/dome-client.ts`)

- **Status:** Compliant
- **Findings:** All Dome-specific GET properties and PUT methods found in the Alpaca specification's `/dome/{device_number}/` paths appear to be implemented in `dome-client.ts`.
  - The `getDomeState()` method is a client-side convenience and correctly lists properties from the spec.

### 2. `CameraClient` (`src/api/alpaca/camera-client.ts`)

- **Status:** Mostly Compliant
- **Findings:**
  - Most methods and properties align with the `/camera/{device_number}/` specification.
  - **`imagearrayvariant` Endpoint:** The spec lists `GET /camera/{device_number}/imagearrayvariant`. The client implements `getImageData()` which targets `imagearray`. The `imagearrayvariant` endpoint is not explicitly used. This might be an optional endpoint for different image data encodings/types or advanced scenarios.
  - **`cameratype` Property:** The client's `getCameraInfo()` method attempts to fetch a property named `cameratype`. This property was not found in the `grep_search` results for camera-specific paths (`/camera/{device_number}/...`). It might be a common device property, an extension, or an erroneous inclusion in the client's list. Further investigation of the full spec schema for Camera or common properties would be needed to confirm its origin and validity.
  - **`setccdtemperature` Property (GET):** Client's `getCameraInfo()` attempts to GET a property named `setccdtemperature`. The Alpaca spec _does_ include `GET /camera/{device_number}/setccdtemperature` (line 1701 of spec file), which likely returns the current temperature setpoint. This is correctly implemented.

### 3. `CoverCalibratorClient` (`src/api/alpaca/covercalibrator-client.ts`)

- **Status:** Compliant
- **Findings:** The `CoverCalibratorClient` fully implements the Alpaca specification for its device type based on the `/covercalibrator/{device_number}/` endpoints. No missing parts identified.

### 4. `FilterWheelClient` (`src/api/alpaca/filterwheel-client.ts`)

- **Status:** Partially Compliant
- **Findings:**
  - GET properties (`focusoffsets`, `names`, `position`) and PUT `position` (to set filter position) are correctly implemented.
  - **`setFilterName(filterNumber, name)` Method:**
    - The client implements this by PUTting to a `/name` endpoint (e.g., `/api/v1/filterwheel/0/name`).
    - The Alpaca spec paths obtained from `grep_search` for `/filterwheel/{device_number}/` do **not** show a PUTtable `/name` endpoint. They only show `GET /names`.
    - This indicates a potential mismatch or reliance on a non-standard extension/assumption. The standard way to change filter names, if supported by a device, needs to be clearly defined by the Alpaca specification for FilterWheel. The client code itself acknowledges this uncertainty.

### 5. `FocuserClient` (`src/api/alpaca/focuser-client.ts`)

- **Status:** Compliant
- **Findings:** The `FocuserClient` appears to fully implement the Alpaca specification for its device type based on the `/focuser/{device_number}/` endpoints. No missing parts identified.

### 6. `ObservingConditionsClient` (`src/api/alpaca/observingconditions-client.ts`)

- **Status:** Mostly Compliant
- **Findings:**
  - Most properties and methods are well-aligned with the `/observingconditions/{device_number}/` specification.
  - **Missing Implementation:** The client does not implement the `refresh` (PUT `/observingconditions/{device_number}/refresh`) method. This method is part of the Alpaca specification for ObservingConditions devices and is used to command the device to immediately refresh its sensor readings.

### 7. `RotatorClient` (`src/api/alpaca/rotator-client.ts`)

- **Status:** Compliant
- **Findings:** The `RotatorClient` appears to fully implement the Alpaca specification for its device type based on the `/rotator/{device_number}/` endpoints. No missing parts identified.

### 8. `SafetyMonitorClient` (`src/api/alpaca/safetymonitor-client.ts`)

- **Status:** Compliant
- **Findings:** The `SafetyMonitorClient` correctly implements the `issafe` (GET `/safetymonitor/{device_number}/issafe`) property, which is the only specific endpoint listed for this device type in the Alpaca specification grep results.

### 9. `SwitchClient` (`src/api/alpaca/switch-client.ts`)

- **Status:** Partially Compliant
- **Findings:**
  - The client implements synchronous methods for getting and setting switch names and values.
  - **Missing Implementations:** The client does not implement several features from the `/switch/{device_number}/` Alpaca Switch specification:
    - Asynchronous operations: `setasync` (PUT), `setasyncvalue` (PUT), `statechangecomplete` (GET).
    - Capability checks: `canasync` (GET property), `canwrite` (GET method).
  - This means the client only supports synchronous switch operations and does not check if a switch is writable before attempting to set it, nor does it leverage asynchronous capabilities if a device offers them.

### 10. `TelescopeClient` (`src/api/alpaca/telescope-client.ts`)

- **Status:** Mostly Compliant
- **Findings:**
  - The client implements a very comprehensive set of Telescope methods and properties from the `/telescope/{device_number}/` specification. Most core functionalities are covered.
  - **Minor Omissions/Not Implemented (examples):**
    - Several GETtable properties related to physical attributes, advanced guide rate settings, pier side predictions, and slew settle times are not explicitly exposed as individual methods or included in the `getTelescopeState()` helper. Examples:
      - `aperturearea` (GET)
      - `aperturediameter` (GET)
      - `guideratedeclination` (GET/PUT)
      - `guideraterightascension` (GET/PUT)
      - `ispulseguiding` (GET)
      - `slewsettletime` (GET/PUT)
    - Capability properties like `cansetdeclinationrate`, `cansetguiderates`, `cansetpierside`, `cansetrightascensionrate` are not exposed as individual client methods.
    - Methods like `axisrates` (GET, to get available rates for an axis) and `destinationsideofpier` (GET, to predict side of pier) are not implemented.
  - The omissions are generally for more advanced, detailed, or informational properties/methods rather than core telescope control functions, but represent parts of the spec not fully exposed by the client.

---

End of Audit.
