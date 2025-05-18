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

- **Status:** Compliant
- **Findings:**
  - Most methods and properties align with the `/camera/{device_number}/` specification.
  - **`imagearrayvariant` Endpoint:** The spec lists `GET /camera/{device_number}/imagearrayvariant`. The client implements `getImageData()` which targets `imagearray`. The `imagearrayvariant` endpoint is considered optional/deprecated and was not implemented.
  - **`cameratype` Property:** The client's `getCameraInfo()` method previously attempted to fetch a property named `cameratype`. This property was not found in the Alpaca specification and has been removed from the client's `getCameraInfo()` property list.
  - **`setccdtemperature` Property (GET):** Client's `getCameraInfo()` attempts to GET a property named `setccdtemperature`. The Alpaca spec _does_ include `GET /camera/{device_number}/setccdtemperature` (line 1701 of spec file), which likely returns the current temperature setpoint. This is correctly implemented.

### 3. `CoverCalibratorClient` (`src/api/alpaca/covercalibrator-client.ts`)

- **Status:** Compliant
- **Findings:** The `CoverCalibratorClient` fully implements the Alpaca specification for its device type based on the `/covercalibrator/{device_number}/` endpoints. No missing parts identified.

### 4. `FilterWheelClient` (`src/api/alpaca/filterwheel-client.ts`)

- **Status:** Compliant
- **Findings:**
  - GET properties (`focusoffsets`, `names`, `position`) and PUT `position` (to set filter position) are correctly implemented.
  - The non-standard `setFilterName(filterNumber, name)` method, which attempted a PUT to a `/name` endpoint not found in the FilterWheel Alpaca specification, has been removed. The client now adheres to the defined specification.

### 5. `FocuserClient` (`src/api/alpaca/focuser-client.ts`)

- **Status:** Compliant
- **Findings:** The `FocuserClient` appears to fully implement the Alpaca specification for its device type based on the `/focuser/{device_number}/` endpoints. No missing parts identified.

### 6. `ObservingConditionsClient` (`src/api/alpaca/observingconditions-client.ts`)

- **Status:** Compliant
- **Findings:**
  - Most properties and methods are well-aligned with the `/observingconditions/{device_number}/` specification.
  - The previously missing `refresh` (PUT `/observingconditions/{device_number}/refresh`) method has been implemented. This method is part of the Alpaca specification and is used to command the device to immediately refresh its sensor readings.

### 7. `RotatorClient` (`src/api/alpaca/rotator-client.ts`)

- **Status:** Compliant
- **Findings:** The `RotatorClient` appears to fully implement the Alpaca specification for its device type based on the `/rotator/{device_number}/` endpoints. No missing parts identified.

### 8. `SafetyMonitorClient` (`src/api/alpaca/safetymonitor-client.ts`)

- **Status:** Compliant
- **Findings:** The `SafetyMonitorClient` correctly implements the `issafe` (GET `/safetymonitor/{device_number}/issafe`) property, which is the only specific endpoint listed for this device type in the Alpaca specification grep results.

### 9. `SwitchClient` (`src/api/alpaca/switch-client.ts`)

- **Status:** Compliant
- **Findings:**
  - The client now implements all features from the `/switch/{device_number}/` Alpaca Switch specification.
  - Previously missing implementations have been added:
    - Asynchronous operations: `setasync` (PUT), `setasyncvalue` (PUT), `statechangecomplete` (GET).
    - Capability checks: `canasync` (GET property), `canwrite` (GET method).
  - The client now supports both synchronous and asynchronous switch operations and can check device capabilities.

### 10. `TelescopeClient` (`src/api/alpaca/telescope-client.ts`)

- **Status:** Compliant
- **Findings:**
  - The client implements a very comprehensive set of Telescope methods and properties from the `/telescope/{device_number}/` specification.
  - Previously omitted properties and methods have been added:
    - GETtable properties: `aperturearea`, `aperturediameter`, `guideratedeclination`, `guideraterightascension`, `ispulseguiding`, `slewsettletime`.
    - PUTtable properties: `guideratedeclination`, `guideraterightascension`, `slewsettletime`.
    - Capability properties: `cansetdeclinationrate`, `cansetguiderates`, `cansetpierside`, `cansetrightascensionrate`.
    - Methods: `axisrates` (GET), `destinationsideofpier` (GET).
  - The client now more fully exposes the capabilities defined in the Alpaca specification for telescopes.

---

End of Audit.
