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
  - State-related GET properties from `DomeClient` (e.g., `altitude`, `azimuth`, `atHome`, `atPark`, `shutterStatus`, `slewing`, `slaved`) are exposed and updated in the store via the `fetchDomeStatus` store action, which utilizes `DomeClient.getDomeState()`. The `DomeClient.getDomeState()` helper method also fetches all `can...` capability properties (e.g., `canfindhome`, `canpark`), making them available within the action, though they are not individually mapped to distinct boolean properties in the `DomeDeviceProperties` of the store state.
  - Shutter control: `DomeClient.openShutter()`, `DomeClient.closeShutter()`.
  - Basic movement/state commands: `DomeClient.parkDome()`, `DomeClient.findHomeDome()`, `DomeClient.abortSlewDome()`.
- **Client Functionalities NOW Exposed by Store Actions:**
  - `DomeClient.setPark()` (exposed via `setDomeParkPosition` action).
  - `DomeClient.slewToAltitude(...)` (exposed via `slewDomeToAltitude` action).
  - `DomeClient.slewToAzimuth(...)` (exposed via `slewDomeToAzimuth` action).
  - `DomeClient.syncToAzimuth(...)` (exposed via `syncDomeToAzimuth` action).
  - `DomeClient.setSlaved(...)` (exposed via `setDomeSlavedState` action).
- **Client Functionalities NOT Exposed/Used by Store Actions:**
  - Individual `can...` capability properties (e.g., `canfindhome`, `canpark`), while fetched by the `DomeClient.getDomeState()` helper method within `fetchDomeStatus`, are not explicitly mapped to or stored as individual boolean flags within the `DomeDeviceProperties` in the device's store state. Their values are accessible within the `fetchDomeStatus` action via the result of `getDomeState()` but are not persisted as distinct reactive properties.

### 4. FilterWheel

- **Store Module:** `src/stores/modules/filterWheelActions.ts`
- **Alpaca Client:** `src/api/alpaca/filterwheel-client.ts`

**Findings:**

- **Exposed & Used Client Functionalities:** Public methods from `FilterWheelClient` such as `getFocusOffsets`, `getFilterNames`, `getPosition`, and `setPosition` are utilized by the store actions. The client's `getFilterWheelState()` helper is not directly called, but the `fetchFilterWheelDetails` action achieves similar data retrieval. The `setFilterName` method, noted in the client as a common custom extension rather than a standard Alpaca call, is present in `FilterWheelClient` and is utilized by the `setFilterWheelName` store action.
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
  - `FocuserClient.isTempCompAvailable()`: The client implements this method to check if temperature compensation is available. The store actions (`fetchFocuserStatus`) fetch the `tempComp` state directly, and its presence (or null value) can imply availability. However, the `tempcompavailable` boolean property itself is not explicitly fetched by store actions and stored as a distinct capability in `FocuserDeviceProperties`.
  - `FocuserClient.getAbsolute()`: The client has a method to read the `absolute` property (whether the focuser is absolute positioning). This property is not currently fetched by store actions or stored in `FocuserDeviceProperties`.
- **Conclusion:** The `focuserActions.ts` module exposes and utilizes most functionalities provided by `FocuserClient.ts`. The approach for determining temperature compensation availability is implicit. The `absolute` property and the explicit `tempcompavailable` capability are not currently integrated into the store's state.

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
        - Capability and static properties such as `canfindhome`, `canpark`, `cansetpark`, `canpulseguide`, `cansettracking`, `canslew`, `canslewaltaz`, `cansync`, `cansyncaltaz`, `alignmentmode`, `equatorialsystem`, `focallength`, `doesrefraction`, `siteelevation`, `sitelatitude`, `sitelongitude`, and `trackingrates` are read by the `fetchTelescopeProperties` store action using individual `client.getProperty()` calls.
        - Dynamic state properties including `rightascension`, `declination`, `altitude`, `azimuth`, `siderealtime`, `slewing`, `tracking`, `trackingrate`, `atpark`, `athome`, `utcdate`, and `sideofpier` are read via polling actions (using `fetchDeviceState` or direct `client.getProperty()` calls).
        - Core movement commands: `TelescopeClient.park()`, `unpark()`, `slewToCoordinates()` (and async), `slewToAltAz()` (and async), `abortSlew()`.
        - Setting tracking state and rate: `TelescopeClient.setTracking()` is used. The `setTelescopeTracking` action also supports setting `TrackingRate` via the same `callDeviceMethod('settracking', ...)` call, as allowed by the Alpaca specification for the `/tracking` endpoint. The client also has a direct `TelescopeClient.setTrackingRate()` method which is not separately called by a dedicated store action.
        - Setting target RA/Dec: `TelescopeClient.setTargetRightAscension()` and `TelescopeClient.setTargetDeclination()` are utilized by the `slewToCoordinates` store action.
    - **Client Functionalities NOW Exposed by Store Actions:**
        - `TelescopeClient.setGuideRateDeclination(...)` (exposed via `setTelescopeGuideRateDeclination` action).
        - `TelescopeClient.setGuideRateRightAscension(...)` (exposed via `setTelescopeGuideRateRightAscension` action).
        - `TelescopeClient.setSlewSettleTime(...)` (exposed via `setTelescopeSlewSettleTime` action).
    - **Partially Exposed or Mismatched Usage by Store Actions:**
        - The `slewToAltAz` store action attempts to set `targetaltitude` and `targetazimuth` properties via `callDeviceMethod` before slewing. The `TelescopeClient`'s `slewToAltAz` methods accept altitude/azimuth as direct parameters, and the client (and Alpaca specification) doesn't have specific writable `setTargetAltitude`/`setTargetAzimuth` public methods or properties. This represents a mismatch.
    - **Client Functionalities NOT Exposed/Used by Store Actions:**
        - `TelescopeClient.setpark()`
        - `TelescopeClient.slewToTarget()` / `slewToTargetAsync()`
        - `TelescopeClient.syncToAltAz(...)`
        - `TelescopeClient.syncToCoordinates(...)`
        - `TelescopeClient.syncToTarget()`
        - `TelescopeClient.findHome()`
        - `TelescopeClient.setUTCDate(...)` (The `utcdate` property is read via polling, but no store action to explicitly set it.)
        - `TelescopeClient.getAxisRates(...)`
        - `TelescopeClient.getDestinationSideOfPier(...)`
        - `TelescopeClient.getTelescopeState()`: This client helper method, which fetches a comprehensive list of telescope properties, is not currently utilized by any store action.
        - Reading static properties: `aperturearea` (via `client.getApertureArea()`), `aperturediameter` (via `client.getApertureDiameter()`), `ispulseguiding` (via `client.isPulseGuiding()`) are not called by store actions.
        - Reading guide rates and slew settle time: While these can be *set* via actions, their current values (Alpaca properties: `guideratedeclination`, `guideraterightascension`, `slewsettletime`; Client methods: `client.getGuideRateDeclination()`, `client.getGuideRateRightAscension()`, `client.getSlewSettleTime()`) are not explicitly fetched by `fetchTelescopeProperties` or polling.
        - `TelescopeClient.moveAxis(...)`: The `canMoveAxis` capability (via `client.canMoveAxis(axis)`) is not currently read by `fetchTelescopeProperties`, and no store action calls `client.moveAxis(...)`.
        - Additional capabilities not read by `fetchTelescopeProperties` (though available in `TelescopeClient`): `canunpark` (via `client.canUnpark()`), `canslewasync` (via `client.canSlewAsync()`), `canslewaltazasync` (via `client.canSlewAltAzAsync()`).
        - Note: Because `TelescopeClient.getTelescopeState()` is not used, many informational properties potentially available from a device (as listed in the client's `getTelescopeState` helper) are not automatically fetched or made available in the store unless explicitly read by `fetchTelescopeProperties` or polling actions. Dedicated store getters for each individual property are not typically created; data is accessed from the device's state object.

---

End of Audit.
