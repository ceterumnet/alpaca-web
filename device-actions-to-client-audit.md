# Device Actions to Alpaca Client Audit

This document outlines an audit comparing the Pinia store modules (`src/stores/modules/*Actions.ts`) with their corresponding Alpaca client classes (`src/api/alpaca/*-client.ts`). The goal is to determine if the functionalities offered by the client classes are fully exposed and utilized as actions in the store modules, ensuring comprehensive Alpaca support within the application.

## General Notes:

- Store actions often use generic `callDeviceMethod` or `client.getProperty` / `client.put` from the base client, which then map to the specific Alpaca commands. This audit considers functionality as "used" if the store action correctly invokes the equivalent operation offered by the specific typed client, even if not calling the named typed client method directly.
- Helper methods within clients (e.g., `get<DeviceType>State()`) are considered in terms of the properties they fetch and whether store actions achieve similar comprehensive data retrieval.

## Audit Summary by Module & Client:

### 1. Camera

- **Store Module:** `src/stores/modules/cameraActions.ts`
- **Alpaca Client:** `src/api/alpaca/camera-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:**
  - Exposure control: `CameraClient.startExposure()`, `CameraClient.abortExposure()`.
  - Image data retrieval: `CameraClient.getImageData()` (functionally covered).
  - State & capability reads: `CameraClient.getCameraState()`, `CameraClient.isImageReady()`, most `can...` methods, sensor dimensions, exposure limits, gain/offset modes/limits are read via `fetchCameraProperties` and polling actions.
  - Setting binning: `CameraClient.setBinning()`.
  - Setting cooler state & target temperature: `CameraClient.setCooler()` and `CameraClient.setTemperature()`.
- **Partially Exposed or Indirectly Used Client Functionalities:**
  - Setting gain, offset, readout mode, subframe: The current values of these properties are polled and read by store actions. However, dedicated store actions to _set_ these values (e.g., an action that would call `CameraClient.setGain()`, `CameraClient.setOffset()`, `CameraClient.setReadoutMode()`, or `CameraClient.setSubframe()`) are not present.
- **Client Functionalities NOT Exposed/Used by Store Actions:**
  - `CameraClient.stopExposure()`: No store action is available to stop an ongoing exposure and attempt to retrieve the partial image data.
  - `CameraClient.pulseGuide(...)`: No store action for camera pulse guiding. The `canPulseGuide` capability is read.
  - `CameraClient.getSubExposureDuration()`: This property is not explicitly fetched by store actions for UI display or logic, though it could be added to polling or `fetchCameraProperties`.
  - `CameraClient.setSubExposureDuration(...)`: No store action is available to set the sub-exposure duration.

### 2. CoverCalibrator

- **Store Module:** `src/stores/modules/coverCalibratorActions.ts`
- **Alpaca Client:** `src/api/alpaca/covercalibrator-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:**
  - Core GET properties: `CoverCalibratorClient.getBrightness()`, `getCalibratorState()`, `getCoverState()`, `getMaxBrightness()` are covered by the `fetchCoverCalibratorStatus` store action.
  - All PUT methods: `CoverCalibratorClient.calibratorOff()`, `calibratorOn()`, `closeCover()`, `haltCover()`, `openCover()` are exposed as store actions.
- **Client Functionalities NOT Exposed/Used by Store Actions:**
  - `CoverCalibratorClient.getCalibratorChanging()` (Alpaca V2+ property).
  - `CoverCalibratorClient.getCoverMoving()` (Alpaca V2+ property).
  - The `fetchCoverCalibratorStatus` action does not currently include these V2 properties, although the client's `getCoverCalibratorState()` helper method does retrieve them.

### 3. Dome

- **Store Module:** `src/stores/modules/domeActions.ts`
- **Alpaca Client:** `src/api/alpaca/dome-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:**
  - All GET properties from `DomeClient` (e.g., `altitude`, `azimuth`, `atHome`, `shutterStatus`, `slewing`, all `can...` capabilities) are effectively exposed via the `fetchDomeStatus` store action, which uses `DomeClient.getDomeState()`.
  - Shutter control: `DomeClient.openShutter()`, `DomeClient.closeShutter()`.
  - Basic movement/state commands: `DomeClient.parkDome()`, `DomeClient.findHomeDome()`, `DomeClient.abortSlewDome()`.
- **Client Functionalities NOT Exposed/Used by Store Actions:**
  - `DomeClient.setPark()`
  - `DomeClient.slewToAltitude(...)`
  - `DomeClient.slewToAzimuth(...)`
  - `DomeClient.syncToAzimuth(...)`
  - `DomeClient.setSlaved(...)`

### 4. FilterWheel

- **Store Module:** `src/stores/modules/filterWheelActions.ts`
- **Alpaca Client:** `src/api/alpaca/filterwheel-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:** All public methods from `FilterWheelClient` (`getFocusOffsets`, `getFilterNames`, `getPosition`, `setPosition`, `setFilterName`) are utilized by the store actions. The client's `getFilterWheelState()` helper is not directly called, but the `fetchFilterWheelDetails` action achieves similar data retrieval.
- **Note:** The `setFilterName` functionality in both the client and store action relies on a method that the client implementation itself notes as potentially speculative concerning the official Alpaca specification.
- **Conclusion:** The `filterWheelActions.ts` fully exposes the functionalities currently offered by `FilterWheelClient.ts`.

### 5. Focuser

- **Store Module:** No dedicated `focuserActions.ts` module was found in the provided file list for this audit.
- **Alpaca Client:** `src/api/alpaca/focuser-client.ts`

**Findings:**

- **Client Functionalities NOT Exposed/Used by Store Actions:** Due to the absence of a specific store module for Focuser, none of the functionalities of `FocuserClient` (e.g., `getPosition`, `isMoving`, `move`, `halt`, `setTempComp`, `getTemperature`) are currently exposed through dedicated store actions.

### 6. ObservingConditions

- **Store Module:** `src/stores/modules/observingConditionsActions.ts`
- **Alpaca Client:** `src/api/alpaca/observingconditions-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:**
  - All sensor reading GET methods from `ObservingConditionsClient` (e.g., `getCloudCover`, `getDewPoint`, `getPressure`) are covered by the `fetchObservingConditions` store action, which uses `ObservingConditionsClient.getAllConditions()`.
  - `ObservingConditionsClient.setAveragePeriod()`.
- **Client Functionalities NOT Exposed/Used by Store Actions:**
  - `ObservingConditionsClient.getSensorDescription(...)`
  - `ObservingConditionsClient.getTimeSinceLastUpdate(...)`

### 7. Rotator

- **Store Module:** `src/stores/modules/rotatorActions.ts`
- **Alpaca Client:** `src/api/alpaca/rotator-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:**
  - Most GET properties: `RotatorClient.canReverse()`, `isMoving()`, `mechanicalPosition()`, `getPosition()`, `getReverse()`, `getTargetPosition()` are covered by `fetchRotatorStatus` and `fetchRotatorCapabilities` actions.
  - PUT methods: `RotatorClient.halt()`, `move()` (relative), `moveAbsolute()`, `syncToPosition()`, `setReverse()`.
- **Client Functionalities NOT Exposed/Used by Store Actions:**
  - `RotatorClient.getStepSize()`
  - `RotatorClient.moveMechanical(...)`

### 8. SafetyMonitor

- **Store Module:** `src/stores/modules/safetyMonitorActions.ts`
- **Alpaca Client:** `src/api/alpaca/safetymonitor-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:** The `fetchSafetyMonitorDeviceStatus` store action uses `SafetyMonitorClient.fetchStatus()`, which internally calls `SafetyMonitorClient.getIsSafe()`. This ensures that all functionalities of the `SafetyMonitorClient` are effectively exposed and utilized.
- **Conclusion:** The `safetyMonitorActions.ts` fully exposes the functionalities of `SafetyMonitorClient.ts`.

### 9. Switch

- **Store Module:** `src/stores/modules/switchActions.ts`
- **Alpaca Client:** `src/api/alpaca/switch-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:** All public methods of the `SwitchClient` (e.g., `maxSwitch`, `getSwitchName`, `getSwitchValue`, `setSwitchName`, `setSwitchValue`, `setSwitch`) are utilized by the store actions. Reads are often consolidated via `client.getAllSwitchDetails()` within the `fetchSwitchDetails` action.
- **Conclusion:** The `switchActions.ts` appears to fully expose the functionalities currently offered by `SwitchClient.ts` (noting that the client itself may not implement all async/capability features from the full Alpaca Switch spec).

### 10. Telescope

    - **Store Module:** `src/stores/modules/telescopeActions.ts`
    - **Alpaca Client:** `src/api/alpaca/telescope-client.ts`

    **Findings:**
    - **Exposed & Used Client Functionalities:**
        - A broad range of GET properties for capabilities and state are read via `fetchTelescopeProperties` and polling (which uses `client.getProperty()` and `client.getDeviceState()`).
        - Core movement commands: `TelescopeClient.park()`, `unpark()`, `slewToCoordinates()` (and async), `slewToAltAz()` (and async), `abortSlew()`.
        - Setting tracking state and rate: `TelescopeClient.setTracking()`, `setTrackingRate()`.
        - Setting target RA/Dec: `TelescopeClient.setTargetRightAscension()`, `setTargetDeclination()`.
    - **Partially Exposed or Mismatched Usage by Store Actions:**
        - The `slewToAltAz` store action attempts to set `targetaltitude` and `targetazimuth` properties via `callDeviceMethod` before slewing. The `TelescopeClient`'s `slewToAltAz` methods accept altitude/azimuth as direct parameters, and the client doesn't have specific `setTargetAltitude`/`setTargetAzimuth` public methods. This represents a potential mismatch in how the action tries to interact with the client for Alt/Az slews.
    - **Client Functionalities NOT Exposed/Used by Store Actions:**
        - `TelescopeClient.setpark()`
        - `TelescopeClient.slewToTarget()` / `slewToTargetAsync()`
        - `TelescopeClient.syncToAltAz(...)`
        - `TelescopeClient.syncToCoordinates(...)`
        - `TelescopeClient.syncToTarget()`
        - `TelescopeClient.findHome()`
        - `TelescopeClient.moveAxis(...)` (The `canMoveAxis` capability is read, but no store action calls `moveAxis`.)
        - `TelescopeClient.pulseGuide(...)` (The `canPulseGuide` capability is read, but no store action calls `pulseGuide`.)
        - `TelescopeClient.setUTCDate(...)` (The `utcdate` property is read via polling, but no store action to explicitly set it.)
        - Several specific GET methods for advanced capabilities or detailed properties (e.g., `aperturearea`, `guideratedeclination` (GET/PUT methods in client if implemented), `axisrates`, `destinationsideofpier`) are not directly exposed through dedicated store actions, though some values might be part of the data fetched by `getTelescopeState()`.

---

End of Audit.
