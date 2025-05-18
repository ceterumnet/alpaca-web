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
  - State & capability reads: `CameraClient.getCameraState()`, `CameraClient.isImageReady()`, most `can...` methods, sensor dimensions, exposure limits are read via `fetchCameraProperties` and polling actions.
  - The `fetchCameraProperties` action now also determines and stores `cam_gainMode` and `cam_offsetMode` to correctly interpret gain/offset values, and ensures properties like `gains`, `gainmin`, `gainmax`, `offsets`, `offsetmin`, `offsetmax`, `readoutmodes`, and `subexposureduration` are fetched.
  - Setting binning: `CameraClient.setBinning()`.
  - Setting cooler state & target temperature: `CameraClient.setCooler()` and `CameraClient.setTemperature()`.

- **Client Functionalities NOW Exposed by Store Actions:**

  - `CameraClient.setGain(...)` (exposed via `setCameraGain` action, handles list/value modes).
  - `CameraClient.setOffset(...)` (exposed via `setCameraOffset` action, handles list/value modes).
  - `CameraClient.setReadoutMode(...)` (exposed via `setCameraReadoutMode` action).
  - `CameraClient.setSubframe(...)` (exposed via `setCameraSubframe` action).
  - `CameraClient.stopExposure()` (exposed via `stopCameraExposure` action).
  - `CameraClient.pulseGuide(...)` (exposed via `pulseGuideCamera` action).
  - `CameraClient.getSubExposureDuration()` (now fetched by `fetchCameraProperties`).
  - `CameraClient.setSubExposureDuration(...)` (exposed via `setCameraSubExposureDuration` action).

- **Partially Exposed or Indirectly Used Client Functionalities:**

  - None remaining from the previously listed items.

- **Client Functionalities NOT Exposed/Used by Store Actions:**
  - None remaining from the previously listed items.
- **Special Note on Gain/Offset:** The `setCameraGain` and `setCameraOffset` actions now incorporate logic to handle Alpaca's dual-mode (list/index vs. direct value) for these settings, based on `cam_gainMode` and `cam_offsetMode` determined during property fetching.

### 2. CoverCalibrator

- **Store Module:** `src/stores/modules/coverCalibratorActions.ts`
- **Alpaca Client:** `src/api/alpaca/covercalibrator-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:**
  - Core GET properties: `CoverCalibratorClient.getBrightness()`, `getCalibratorState()`, `getCoverState()`, `getMaxBrightness()` are covered by the `fetchCoverCalibratorStatus` store action.
  - The V2+ properties `CoverCalibratorClient.getCalibratorChanging()` and `CoverCalibratorClient.getCoverMoving()` are now also fetched by `fetchCoverCalibratorStatus` (via the client's `getCoverCalibratorState()` helper).
  - All PUT methods: `CoverCalibratorClient.calibratorOff()`, `calibratorOn()`, `closeCover()`, `haltCover()`, `openCover()` are exposed as store actions.
- **Client Functionalities NOT Exposed/Used by Store Actions:**
  - None remaining. The `fetchCoverCalibratorStatus` action now includes the V2 properties by leveraging the client's `getCoverCalibratorState()` helper.

### 3. Dome

- **Store Module:** `src/stores/modules/domeActions.ts`
- **Alpaca Client:** `src/api/alpaca/dome-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:**
  - All GET properties from `DomeClient` (e.g., `altitude`, `azimuth`, `atHome`, `shutterStatus`, `slewing`, `slaved`, all `can...` capabilities) are effectively exposed via the `fetchDomeStatus` store action, which uses `DomeClient.getDomeState()`.
  - Shutter control: `DomeClient.openShutter()`, `DomeClient.closeShutter()`.
  - Basic movement/state commands: `DomeClient.parkDome()`, `DomeClient.findHomeDome()`, `DomeClient.abortSlewDome()`.
- **Client Functionalities NOW Exposed by Store Actions:**
  - `DomeClient.setPark()` (exposed via `setDomeParkPosition` action).
  - `DomeClient.slewToAltitude(...)` (exposed via `slewDomeToAltitude` action).
  - `DomeClient.slewToAzimuth(...)` (exposed via `slewDomeToAzimuth` action).
  - `DomeClient.syncToAzimuth(...)` (exposed via `syncDomeToAzimuth` action).
  - `DomeClient.setSlaved(...)` (exposed via `setDomeSlavedState` action).
- **Client Functionalities NOT Exposed/Used by Store Actions:**
  - None remaining.

### 4. FilterWheel

- **Store Module:** `src/stores/modules/filterWheelActions.ts`
- **Alpaca Client:** `src/api/alpaca/filterwheel-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:** Public methods from `FilterWheelClient` such as `getFocusOffsets`, `getFilterNames`, `getPosition`, and `setPosition` are utilized by the store actions. The client's `getFilterWheelState()` helper is not directly called, but the `fetchFilterWheelDetails` action achieves similar data retrieval. The `setFilterName` method was removed from the client as it was non-standard.
- **Conclusion:** The `filterWheelActions.ts` fully exposes the functionalities currently offered by `FilterWheelClient.ts`.

### 5. Focuser

- **Store Module:** `src/stores/modules/focuserActions.ts`
- **Alpaca Client:** `src/api/alpaca/focuser-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:**
  - All GET properties from `FocuserClient` (`getPosition`, `isMoving`, `getTemperature`, `getStepSize`, `getMaxStep`, `getMaxIncrement`, `getTempComp`) are effectively exposed and read via the `fetchFocuserDetails` and `fetchFocuserStatus` store actions.
  - All PUT/command methods (`move`, `halt`, `setTempComp`) are exposed as dedicated store actions.
  - Polling and connection/disconnection events are handled, triggering appropriate data fetching and status updates.
- **Client Functionalities NOT Exposed/Used by Store Actions (or only indirectly):**
  - `FocuserClient.isTempCompAvailable()`: The client implements this method to check if temperature compensation is available. The store actions (`fetchFocuserStatus`) fetch the `tempComp` state directly, and its presence (or null value) implies availability. The `tempcompavailable` boolean property itself is not explicitly fetched and stored as a distinct capability in `FocuserDeviceProperties`.
- **Conclusion:** The `focuserActions.ts` module comprehensively exposes and utilizes the functionalities provided by `FocuserClient.ts`. The approach for `tempcompavailable` is implicit but functional.

### 6. ObservingConditions

- **Store Module:** `src/stores/modules/observingConditionsActions.ts`
- **Alpaca Client:** `src/api/alpaca/observingconditions-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:**
  - All sensor reading GET methods from `ObservingConditionsClient` (e.g., `getCloudCover`, `getDewPoint`, `getPressure`) are covered by the `fetchObservingConditions` store action, which uses `ObservingConditionsClient.getAllConditions()`.
  - `ObservingConditionsClient.setAveragePeriod()`.
  - `ObservingConditionsClient.refresh()` (exposed via `refreshObservingConditionsReadings` action).
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

- **Exposed & Used Client Functionalities:** Core public methods of the `SwitchClient` (e.g., `maxSwitch`, `getSwitchName`, `getSwitchValue`, `setSwitchName`, `setSwitchValue`, `setSwitch`) are utilized by the store actions. Reads are often consolidated via `client.getAllSwitchDetails()` within the `fetchSwitchDetails` action. The `canAsync` and `canWrite` capabilities for each switch are now also included in the details fetched by `fetchSwitchDetails`.
- **Client Functionalities NOW Exposed by Store Actions:**
  - `SwitchClient.setAsyncSwitch(id, state)` (exposed via `setAsyncSwitchStateStoreAction` action).
  - `SwitchClient.setAsyncSwitchValue(id, value)` (exposed via `setAsyncSwitchValueStoreAction` action).
  - `SwitchClient.isStateChangeComplete(id, transactionID)` (exposed via `getSwitchStateChangeCompleteStoreAction` action).
- **Client Functionalities NOT Exposed/Used by Store Actions:**
  - None remaining from the previously listed items. (Note: The store actions for async operations currently assume `Promise<void>` and don't explicitly handle `TransactionID` returns from the client, which might be a future enhancement if client methods are updated to return them.)
- **Conclusion:** The `switchActions.ts` now exposes both synchronous and asynchronous functionalities offered by `SwitchClient.ts`. The client implements asynchronous operations and capability checks as per the Alpaca Switch specification, and these are now accessible via store actions or included in fetched switch details.

### 10. Telescope

    - **Store Module:** `src/stores/modules/telescopeActions.ts`
    - **Alpaca Client:** `src/api/alpaca/telescope-client.ts`

    **Findings:**
    - **Exposed & Used Client Functionalities:**
        - A broad range of GET properties for capabilities and state are read via `fetchTelescopeProperties` and polling. With the `TelescopeClient.getTelescopeState()` method updated to include more properties (like `aperturearea`, `aperturediameter`, `guideratedeclination`, `guideraterightascension`, `ispulseguiding`, `slewsettletime`, `cansetdeclinationrate`, `cansetguiderates`, `cansetpierside`, `cansetrightascensionrate`), these are now assumed to be fetched and available in the device's store state.
        - Core movement commands: `TelescopeClient.park()`, `unpark()`, `slewToCoordinates()` (and async), `slewToAltAz()` (and async), `abortSlew()`.
        - Setting tracking state and rate: `TelescopeClient.setTracking()`, `setTrackingRate()` (actual store action for setting rate might use `callDeviceMethod` if not `client.setTrackingRate()`).
        - Setting target RA/Dec: `TelescopeClient.setTargetRightAscension()`, `TelescopeClient.setTargetDeclination()`.
    - **Client Functionalities NOW Exposed by Store Actions:**
        - `TelescopeClient.setGuideRateDeclination(...)` (exposed via `setTelescopeGuideRateDeclination` action).
        - `TelescopeClient.setGuideRateRightAscension(...)` (exposed via `setTelescopeGuideRateRightAscension` action).
        - `TelescopeClient.setSlewSettleTime(...)` (exposed via `setTelescopeSlewSettleTime` action).
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
        - `TelescopeClient.getAxisRates(...)` (This client method requires a parameter and is not part of `getTelescopeState()`; no dedicated store action calls it.)
        - `TelescopeClient.getDestinationSideOfPier(...)` (This client method requires parameters and is not part of `getTelescopeState()`; no dedicated store action calls it.)
        - Note: While many informational properties are now included in `getTelescopeState()`, dedicated store getters for each individual property (e.g., `getApertureAreaAction`) are not typically created; the data is accessed from the device's state object populated by `fetchTelescopeProperties` or polling.

---

End of Audit.
