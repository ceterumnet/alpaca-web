# Simplified Panels vs Store Capabilities Audit

This document audits the **simplified device panels** in `src/components/devices` against their respective store modules and the Alpaca/ASCOM capabilities they expose. The goal is to identify what is implemented in the UI versus what is available in the store (and thus, per Alpaca/ASCOM), and highlight any gaps.

# General Improvements Progress

## Header Improvements (Implemented in PanelLayoutView.vue)

- [x] Device name/title visible in header
- [x] Connection status indicator
- [x] Connect/Disconnect button
- [x] Maximize/Restore button
- [x] Device selector dropdown
- [x] Tooltips/help for header controls
- [x] Accessibility (ARIA labels, keyboard navigation)
- [x] Live status indicator (color/icon)
- [x] Responsive layout for header controls
- [x] **Camera panel input styling now uses design tokens and aw-input/aw-select classes for consistency**
- [x] **Gain/offset mode logic is now determined in the store and exposed as cam_gainMode/cam_offsetMode; UI uses these as the single source of truth**

_These improvements are implemented in `PanelLayoutView.vue` and `SimplifiedCameraPanel.vue`._

---

## Table of Contents

- [Camera](#camera)
- [Dome](#dome)
- [Switch](#switch)
- [Focuser](#focuser)
- [Rotator](#rotator)
- [Filter Wheel](#filter-wheel)
- [Cover Calibrator](#cover-calibrator)
- [Safety Monitor](#safety-monitor)
- [Observing Conditions](#observing-conditions)
- [Telescope](#telescope)

---

## Telescope Panel Refactor Implementation Plan & Progress

This section tracks the ongoing refactor and feature completion for the Telescope panel (`SimplifiedTelescopePanel.vue`).

## Implementation Plan

- [ ] **Collapsible, Responsive Sections**: Position, Movement, Tracking, Advanced, Info
- [ ] **Live Device Data**: Show RA, Dec, Alt, Az, Side of Pier, status flags (slewing, parked, tracking)
- [ ] **Human-Friendly RA/Dec Entry**: Allow entry in both decimal and sexagesimal (HH:MM:SS / ±DD:MM:SS) formats, with validation and feedback
- [ ] **Slew to Coordinates**: Wire up to store action, with validation/loading/notifications
- [ ] **Sync to Coordinates**: Show if supported, wire up to store action
- [ ] **Direction Pad**: Wire up to moveAxis/abortSlew, disable when slewing
- [ ] **Pulse Guiding**: Show if supported, wire up to store action
- [ ] **Tracking Toggle/Rate**: Wire up to store, show available rates
- [ ] **Park/Unpark/Find Home**: Wire up to store actions, show loading/feedback
- [ ] **Telescope Info**: Show model, firmware, aperture, focal length, mount type, site info, etc.
- [ ] **UX/Feedback**: Use notification and logging systems for all actions/errors
- [ ] **Accessibility**: ARIA labels, keyboard navigation
- [ ] **Theming**: Use aw-btn, aw-input, aw-select, etc.
- [ ] **Remove Redundant Code/Styles**: Clean up as we go

## Progress Table

| Feature/Section                | Status  | Notes |
| ------------------------------ | ------- | ----- |
| Collapsible, Responsive Layout | Planned |       |
| Live Device Data               | Planned |       |
| Human-Friendly RA/Dec Entry    | Planned |       |
| Slew to Coordinates            | Planned |       |
| Sync to Coordinates            | Planned |       |
| Direction Pad                  | Planned |       |
| Pulse Guiding                  | Planned |       |
| Tracking Toggle/Rate           | Planned |       |
| Park/Unpark/Find Home          | Planned |       |
| Telescope Info                 | Planned |       |
| UX/Feedback                    | Planned |       |
| Accessibility                  | Planned |       |
| Theming                        | Planned |       |
| Remove Redundant Code/Styles   | Planned |       |

_This table will be updated as each feature is implemented._

---

## Camera

### Panel: `SimplifiedCameraPanel.vue`

#### UI Features

- Image display (with histogram, stretch, debayer, etc.) ([CameraImageDisplay.vue](src/components/panels/features/CameraImageDisplay.vue))
- Exposure control (start/abort, duration, frame type, progress tracking, error handling, event emission) ([CameraExposureControl.vue](src/components/panels/features/CameraExposureControl.vue))
- Gain, offset, binning controls ([SimplifiedCameraPanel.vue](src/components/devices/SimplifiedCameraPanel.vue))
- Cooler toggle and target temperature ([SimplifiedCameraPanel.vue](src/components/devices/SimplifiedCameraPanel.vue))
- Current temperature display ([SimplifiedCameraPanel.vue](src/components/devices/SimplifiedCameraPanel.vue))
- **All input/select elements now use aw-input/aw-select classes from forms.css for style consistency**
- **Gain/offset mode is now determined in the store and exposed as cam_gainMode/cam_offsetMode; UI uses these directly**

#### Store Properties/Actions Used (with code references)

- Exposure: `startCameraExposure`, `abortCameraExposure` ([cameraActions.ts](src/stores/modules/cameraActions.ts))
  - **Progress tracking, error handling, and event emission are implemented in [CameraExposureControl.vue](src/components/panels/features/CameraExposureControl.vue)**
- Gain/Offset/Binning: `setCameraGain`, `setCameraOffset`, `setCameraBinning` ([cameraActions.ts](src/stores/modules/cameraActions.ts))
- Cooler/Temp: `setCameraCooler` ([cameraActions.ts](src/stores/modules/cameraActions.ts))
- Subframe/ROI: `setCameraSubframe` ([cameraActions.ts](src/stores/modules/cameraActions.ts))
- Readout Mode: `setCameraReadoutMode` ([cameraActions.ts](src/stores/modules/cameraActions.ts))
- Pulse Guide: `pulseGuideCamera` ([cameraActions.ts](src/stores/modules/cameraActions.ts))
- Image Format: `setPreferredImageFormat` ([cameraActions.ts](src/stores/modules/cameraActions.ts))
- Error/Status: Error/status events and device properties ([cameraActions.ts](src/stores/modules/cameraActions.ts))
- **Gain/offset mode logic: store determines mode and exposes as cam_gainMode/cam_offsetMode**

#### Not Surfaced in UI (from store/Alpaca)

- Subframe/ROI controls (`setCameraSubframe`) — not present in UI
- Readout mode selection (`setCameraReadoutMode`) — not present in UI
- Pulse guiding (`pulseGuideCamera`) — not present in UI
- Preferred Alpaca image download mechanism (binary/JSON) (`setPreferredImageFormat`) — not present in UI
- Some error/status reporting details — only partial error/status surfaced in UI

#### Summary Table (with code references)

| Capability | Store Exposed | Panel UI | Code Reference(s) |
| --- | :-: | :-: | --- |
| Exposure (start/abort, progress, error handling) | ✔️ | ✔️ | [cameraActions.ts](src/stores/modules/cameraActions.ts), [SimplifiedCameraPanel.vue](src/components/devices/SimplifiedCameraPanel.vue), [CameraExposureControl.vue](src/components/panels/features/CameraExposureControl.vue) |
| Gain/Offset/Binning | ✔️ | ✔️ | [cameraActions.ts](src/stores/modules/cameraActions.ts), [SimplifiedCameraPanel.vue](src/components/devices/SimplifiedCameraPanel.vue) |
| Cooler/Temp | ✔️ | ✔️ | [cameraActions.ts](src/stores/modules/cameraActions.ts), [SimplifiedCameraPanel.vue](src/components/devices/SimplifiedCameraPanel.vue) |
| Subframe/ROI | ✔️ | ❌ | [cameraActions.ts](src/stores/modules/cameraActions.ts) only |
| Readout Mode | ✔️ | ✔️ | [cameraActions.ts](src/stores/modules/cameraActions.ts) only |
| Pulse Guide | ✔️ | ❌ | [cameraActions.ts](src/stores/modules/cameraActions.ts) only |
| Preferred Alpaca Image Download (binary/JSON) | ✔️ | ❌ | [cameraActions.ts](src/stores/modules/cameraActions.ts) only |
| Error/Status Details | ✔️ | Partial | [cameraActions.ts](src/stores/modules/cameraActions.ts), [SimplifiedCameraPanel.vue](src/components/devices/SimplifiedCameraPanel.vue) |
| Image Display/Advanced | ✔️ | ✔️ | [cameraActions.ts](src/stores/modules/cameraActions.ts), [CameraImageDisplay.vue](src/components/panels/features/CameraImageDisplay.vue) |
| Image History | ❌ | ❌ | Not present |

### Proposed Improvements & UX Suggestions

#### 1. Feature Completeness (Gap Analysis)

- **Read-Only Properties**: Not currently displayed. Suggest adding camera name/model, serial number, firmware version, pixel size, sensor dimensions, full well capacity, etc.
- **ROI (Region of Interest) Controls**: Not present. If supported, allow users to set ROI (startX, startY, numX, numY).
- **Subframe Controls**: Not present. If supported, expose subframe controls.
- **Readout Modes**: Not present. If supported, provide a dropdown to select readout mode.
- **Bayer Pattern/Color Info**: Not clearly surfaced. Show detected Bayer pattern and sensor type in a user-friendly way.
- **Exposure Presets**: Not present. Allow users to save and quickly select common exposure settings.
- **Image Format Selection**: Not present. If supported, allow selection of image format (RAW, FITS, JPEG, etc.).
- **Bit Depth**: Not present. If supported, expose as a setting.
- **Gain/Offset Ranges**: Min/max not shown. Dynamically fetch and display valid range, with tooltips or validation.
- **Cooler Power**: Not present. If available, display cooler power usage.
- **Exposure Progress**: No progress bar/countdown. Add visual feedback during exposure.
- **Busy/Idle State**: No explicit indicator. Add busy/idle state indicator.
- **Error Handling**: Only partial. Provide more granular error messages (e.g., connection lost, exposure failed, property set failed).
- **Image Download/Save**: No download button. Add ability to download current image.
- **Image Metadata**: Not shown. Display metadata (exposure, gain, binning, timestamp) alongside the image.
- **Zoom/Pan**: Not present. Allow zooming and panning on the image.
- **Histogram Controls**: Only basic. Allow user to adjust histogram stretch or view per-channel histograms for color cameras.
- **Image History**: Not present. Add a feature to view/download previous images in the session.

#### 2. General UX Improvements

- **Panel Header**: Add a clear header with camera name, connection status, and a connect/disconnect button.
- **Section Collapsibility**: Allow users to collapse/expand sections (Exposure, Settings, Cooling).
- **Responsive Design**: Ensure all controls are usable on mobile/tablet (test with container queries).
- **Sliders for Gain/Offset**: Use sliders with numeric input for easier adjustment.
- **Input Validation**: Prevent invalid values and provide immediate feedback.
- **Loading Indicators**: Show spinners or skeletons for all async actions, not just property sets.
- **Tooltips/Help**: Add tooltips or info icons explaining each setting.
- **Default Values**: Show default values and reset-to-default buttons for settings.
- **Presets**: Allow users to save/load their favorite camera settings.
- **Accessibility**: Ensure all controls are accessible via keyboard and have ARIA labels.
- **Success/Failure Toasts**: Show toast notifications for successful/failed actions.
- **Live Status**: Use color or icons to indicate live status (e.g., cooling active, exposure in progress). | Histogram Controls | ⚠️ | Add stretch, per-channel options | | Section Collapsibility | ❌ | Add collapsible sections | | Tooltips/Help | ❌ | Add tooltips/info icons | | Accessibility | ⚠️ | Review ARIA/keyboard support | | Toast Notifications | ❌ | Add for actions | | Presets | ❌ | Allow saving/loading settings | | Image History | ❌ | Add image history viewer/downloader |

#### 3. Suggested UI Additions (Summary Table)

| Feature/Control        | Current? | Suggestion/Gap                             |
| ---------------------- | -------- | ------------------------------------------ |
| Camera Info            | ❌       | Add camera model, serial, pixel size, etc. |
| ROI/Subframe           | ❌       | Add controls if supported                  |
| Readout Mode           | ❌       | Dropdown if supported                      |
| Gain/Offset Sliders    | ⚠️       | Use sliders + numeric input, show min/max  |
| Exposure Progress      | ❌       | Add progress bar/countdown                 |
| Image Download         | ❌       | Add download button                        |
| Image Metadata         | ❌       | Show next to image                         |
| Histogram Controls     | ⚠️       | Add stretch, per-channel options           |
| Section Collapsibility | ❌       | Add collapsible sections                   |
| Tooltips/Help          | ❌       | Add tooltips/info icons                    |
| Accessibility          | ⚠️       | Review ARIA/keyboard support               |
| Toast Notifications    | ❌       | Add for actions                            |
| Presets                | ❌       | Allow saving/loading settings              |
| Image History          | ❌       | Add image history viewer/downloader        |

---

## Dome

### Panel: `SimplifiedDomePanel.vue`

#### UI Features

- Shutter open/close ([SimplifiedDomePanel.vue](src/components/devices/SimplifiedDomePanel.vue))
- Slewing, park, find home, abort slew ([SimplifiedDomePanel.vue](src/components/devices/SimplifiedDomePanel.vue))
- Status display (shutter, slewing, at home, at park, altitude, azimuth) ([SimplifiedDomePanel.vue](src/components/devices/SimplifiedDomePanel.vue))

#### Store Properties/Actions Used (with code references)

- Shutter: `openDomeShutter`, `closeDomeShutter` ([domeActions.ts](src/stores/modules/domeActions.ts))
- Slew/Park/Home/Abort: `slewDomeToAzimuth`, `slewDomeToAltitude`, `parkDomeDevice`, `findDomeHome`, `abortDomeSlew` ([domeActions.ts](src/stores/modules/domeActions.ts))
- Slaving: `setDomeSlavedState` ([domeActions.ts](src/stores/modules/domeActions.ts))
- Direct Az/Alt: `slewDomeToAzimuth`, `slewDomeToAltitude` ([domeActions.ts](src/stores/modules/domeActions.ts))
- Error/Status: Error/status events ([domeActions.ts](src/stores/modules/domeActions.ts))

#### Not Surfaced in UI (from store/Alpaca)

- Slaving (`setDomeSlavedState`) — not present in UI
- Direct Az/Alt control — not present in UI
- Advanced error/status reporting — only partial status in UI

#### Summary Table (with code references)

| Capability | Store Exposed | Panel UI | Code Reference(s) |
| --- | :-: | :-: | --- |
| Shutter Open/Close | ✔️ | ✔️ | [domeActions.ts](src/stores/modules/domeActions.ts), [SimplifiedDomePanel.vue](src/components/devices/SimplifiedDomePanel.vue) |
| Slew/Park/Home/Abort | ✔️ | ✔️ | [domeActions.ts](src/stores/modules/domeActions.ts), [SimplifiedDomePanel.vue](src/components/devices/SimplifiedDomePanel.vue) |
| Slaving | ✔️ | ❌ | [domeActions.ts](src/stores/modules/domeActions.ts) only |
| Direct Az/Alt Control | ✔️ | ❌ | [domeActions.ts](src/stores/modules/domeActions.ts) only |
| Error/Status Details | ✔️ | Partial | [domeActions.ts](src/stores/modules/domeActions.ts), [SimplifiedDomePanel.vue](src/components/devices/SimplifiedDomePanel.vue) |

---

## Switch

### Panel: `SimplifiedSwitchPanel.vue`

#### UI Features

- Boolean and numeric switch controls ([SimplifiedSwitchPanel.vue](src/components/devices/SimplifiedSwitchPanel.vue))
- Edit switch names ([SimplifiedSwitchPanel.vue](src/components/devices/SimplifiedSwitchPanel.vue))
- Status display for each switch ([SimplifiedSwitchPanel.vue](src/components/devices/SimplifiedSwitchPanel.vue))

#### Store Properties/Actions Used (with code references)

- Set value: `setDeviceSwitchValue` ([switchActions.ts](src/stores/modules/switchActions.ts))
- Set name: `setDeviceSwitchName` ([switchActions.ts](src/stores/modules/switchActions.ts))
- Error/Status: Error/status events ([switchActions.ts](src/stores/modules/switchActions.ts))

#### Not Surfaced in UI (from store/Alpaca)

- Edit description — not supported in store or UI
- Advanced error/status reporting — only partial status in UI

#### Summary Table (with code references)

| Capability | Store Exposed | Panel UI | Code Reference(s) |
| --- | :-: | :-: | --- |
| Boolean/Numeric Switch | ✔️ | ✔️ | [switchActions.ts](src/stores/modules/switchActions.ts), [SimplifiedSwitchPanel.vue](src/components/devices/SimplifiedSwitchPanel.vue) |
| Edit Name | ✔️ | ✔️ | [switchActions.ts](src/stores/modules/switchActions.ts), [SimplifiedSwitchPanel.vue](src/components/devices/SimplifiedSwitchPanel.vue) |
| Edit Description | ❌ | ❌ | Not supported |
| Error/Status Details | ✔️ | Partial | [switchActions.ts](src/stores/modules/switchActions.ts), [SimplifiedSwitchPanel.vue](src/components/devices/SimplifiedSwitchPanel.vue) |

---

## Focuser

### Panel: `SimplifiedFocuserPanel.vue`

#### UI Features

- Move to position, move in/out, halt ([SimplifiedFocuserPanel.vue](src/components/devices/SimplifiedFocuserPanel.vue))
- Step size, max step display ([SimplifiedFocuserPanel.vue](src/components/devices/SimplifiedFocuserPanel.vue))
- Temperature and temp compensation toggle ([SimplifiedFocuserPanel.vue](src/components/devices/SimplifiedFocuserPanel.vue))
- Status display (moving/idle) ([SimplifiedFocuserPanel.vue](src/components/devices/SimplifiedFocuserPanel.vue))

#### Store Properties/Actions Used (with code references)

- Move: `moveFocuser` ([focuserActions.ts](src/stores/modules/focuserActions.ts))
- Halt: `haltFocuser` ([focuserActions.ts](src/stores/modules/focuserActions.ts))
- Temp comp: `setFocuserTempComp` ([focuserActions.ts](src/stores/modules/focuserActions.ts))
- Error/Status: Error/status events ([focuserActions.ts](src/stores/modules/focuserActions.ts))

#### Not Surfaced in UI (from store/Alpaca)

- Relative move — only absolute move is implemented
- Advanced error/status reporting — only partial status in UI

#### Summary Table (with code references)

| Capability | Store Exposed | Panel UI | Code Reference(s) |
| --- | :-: | :-: | --- |
| Move To Position | ✔️ | ✔️ | [focuserActions.ts](src/stores/modules/focuserActions.ts), [SimplifiedFocuserPanel.vue](src/components/devices/SimplifiedFocuserPanel.vue) |
| Move In/Out | ✔️ | ✔️ | [focuserActions.ts](src/stores/modules/focuserActions.ts), [SimplifiedFocuserPanel.vue](src/components/devices/SimplifiedFocuserPanel.vue) |
| Halt | ✔️ | ✔️ | [focuserActions.ts](src/stores/modules/focuserActions.ts), [SimplifiedFocuserPanel.vue](src/components/devices/SimplifiedFocuserPanel.vue) |
| Temp Compensation | ✔️ | ✔️ | [focuserActions.ts](src/stores/modules/focuserActions.ts), [SimplifiedFocuserPanel.vue](src/components/devices/SimplifiedFocuserPanel.vue) |
| Step Size/Max Step | ✔️ | ✔️ | [focuserActions.ts](src/stores/modules/focuserActions.ts), [SimplifiedFocuserPanel.vue](src/components/devices/SimplifiedFocuserPanel.vue) |
| Absolute/Relative Move | Partial | Partial | Only absolute move implemented |
| Error/Status Details | ✔️ | Partial | [focuserActions.ts](src/stores/modules/focuserActions.ts), [SimplifiedFocuserPanel.vue](src/components/devices/SimplifiedFocuserPanel.vue) |

---

## Rotator

### Panel: `SimplifiedRotatorPanel.vue`

#### UI Features

- Move absolute/relative, halt, sync ([SimplifiedRotatorPanel.vue](src/components/devices/SimplifiedRotatorPanel.vue))
- Reverse direction toggle ([SimplifiedRotatorPanel.vue](src/components/devices/SimplifiedRotatorPanel.vue))
- Status display (position, mechanical position, moving, target, reversed) ([SimplifiedRotatorPanel.vue](src/components/devices/SimplifiedRotatorPanel.vue))

#### Store Properties/Actions Used (with code references)

- Move absolute/relative: `moveAbsolute`, `moveRelative` ([rotatorActions.ts](src/stores/modules/rotatorActions.ts))
- Halt: `haltRotator` ([rotatorActions.ts](src/stores/modules/rotatorActions.ts))
- Sync: `syncToPosition` ([rotatorActions.ts](src/stores/modules/rotatorActions.ts))
- Reverse: `setRotatorReverse` ([rotatorActions.ts](src/stores/modules/rotatorActions.ts))
- Error/Status: Error/status events ([rotatorActions.ts](src/stores/modules/rotatorActions.ts))

#### Not Surfaced in UI (from store/Alpaca)

- Advanced error/status reporting — only partial status in UI

#### Summary Table (with code references)

| Capability | Store Exposed | Panel UI | Code Reference(s) |
| --- | :-: | :-: | --- |
| Move Absolute/Relative | ✔️ | ✔️ | [rotatorActions.ts](src/stores/modules/rotatorActions.ts), [SimplifiedRotatorPanel.vue](src/components/devices/SimplifiedRotatorPanel.vue) |
| Halt | ✔️ | ✔️ | [rotatorActions.ts](src/stores/modules/rotatorActions.ts), [SimplifiedRotatorPanel.vue](src/components/devices/SimplifiedRotatorPanel.vue) |
| Sync | ✔️ | ✔️ | [rotatorActions.ts](src/stores/modules/rotatorActions.ts), [SimplifiedRotatorPanel.vue](src/components/devices/SimplifiedRotatorPanel.vue) |
| Reverse | ✔️ | ✔️ | [rotatorActions.ts](src/stores/modules/rotatorActions.ts), [SimplifiedRotatorPanel.vue](src/components/devices/SimplifiedRotatorPanel.vue) |
| Error/Status Details | ✔️ | Partial | [rotatorActions.ts](src/stores/modules/rotatorActions.ts), [SimplifiedRotatorPanel.vue](src/components/devices/SimplifiedRotatorPanel.vue) |

---

## Filter Wheel

### Panel: `SimplifiedFilterWheelPanel.vue`

#### UI Features

- Select filter position ([SimplifiedFilterWheelPanel.vue](src/components/devices/SimplifiedFilterWheelPanel.vue))
- Edit filter names ([SimplifiedFilterWheelPanel.vue](src/components/devices/SimplifiedFilterWheelPanel.vue))
- Display current position/name/offset ([SimplifiedFilterWheelPanel.vue](src/components/devices/SimplifiedFilterWheelPanel.vue))

#### Store Properties/Actions Used (with code references)

- Set position: `setFilterWheelPosition` ([filterWheelActions.ts](src/stores/modules/filterWheelActions.ts))
- Set name: `setFilterWheelName` ([filterWheelActions.ts](src/stores/modules/filterWheelActions.ts))
- Error/Status: Error/status events ([filterWheelActions.ts](src/stores/modules/filterWheelActions.ts))

#### Not Surfaced in UI (from store/Alpaca)

- Edit offset — not supported in store or UI
- Advanced error/status reporting — only partial status in UI

#### Summary Table (with code references)

| Capability | Store Exposed | Panel UI | Code Reference(s) |
| --- | :-: | :-: | --- |
| Select Filter | ✔️ | ✔️ | [filterWheelActions.ts](src/stores/modules/filterWheelActions.ts), [SimplifiedFilterWheelPanel.vue](src/components/devices/SimplifiedFilterWheelPanel.vue) |
| Edit Name | ✔️ | ✔️ | [filterWheelActions.ts](src/stores/modules/filterWheelActions.ts), [SimplifiedFilterWheelPanel.vue](src/components/devices/SimplifiedFilterWheelPanel.vue) |
| Edit Offset | ❌ | ❌ | Not supported |
| Error/Status Details | ✔️ | Partial | [filterWheelActions.ts](src/stores/modules/filterWheelActions.ts), [SimplifiedFilterWheelPanel.vue](src/components/devices/SimplifiedFilterWheelPanel.vue) |

---

## Cover Calibrator

### Panel: `SimplifiedCoverCalibratorPanel.vue`

#### UI Features

- Open/close/halt cover ([SimplifiedCoverCalibratorPanel.vue](src/components/devices/SimplifiedCoverCalibratorPanel.vue))
- Calibrator on/off, set brightness ([SimplifiedCoverCalibratorPanel.vue](src/components/devices/SimplifiedCoverCalibratorPanel.vue))
- Status display (cover, calibrator, brightness) ([SimplifiedCoverCalibratorPanel.vue](src/components/devices/SimplifiedCoverCalibratorPanel.vue))

#### Store Properties/Actions Used (with code references)

- Open/close/halt: `openCover`, `closeCover`, `haltCover` ([coverCalibratorActions.ts](src/stores/modules/coverCalibratorActions.ts))
- Calibrator on/off, set brightness: `calibratorOn`, `calibratorOff` ([coverCalibratorActions.ts](src/stores/modules/coverCalibratorActions.ts))
- Error/Status: Error/status events ([coverCalibratorActions.ts](src/stores/modules/coverCalibratorActions.ts))

#### Not Surfaced in UI (from store/Alpaca)

- Advanced error/status reporting — only partial status in UI

#### Summary Table (with code references)

| Capability | Store Exposed | Panel UI | Code Reference(s) |
| --- | :-: | :-: | --- |
| Open/Close/Halt Cover | ✔️ | ✔️ | [coverCalibratorActions.ts](src/stores/modules/coverCalibratorActions.ts), [SimplifiedCoverCalibratorPanel.vue](src/components/devices/SimplifiedCoverCalibratorPanel.vue) |
| Calibrator On/Off | ✔️ | ✔️ | [coverCalibratorActions.ts](src/stores/modules/coverCalibratorActions.ts), [SimplifiedCoverCalibratorPanel.vue](src/components/devices/SimplifiedCoverCalibratorPanel.vue) |
| Set Brightness | ✔️ | ✔️ | [coverCalibratorActions.ts](src/stores/modules/coverCalibratorActions.ts), [SimplifiedCoverCalibratorPanel.vue](src/components/devices/SimplifiedCoverCalibratorPanel.vue) |
| Error/Status Details | ✔️ | Partial | [coverCalibratorActions.ts](src/stores/modules/coverCalibratorActions.ts), [SimplifiedCoverCalibratorPanel.vue](src/components/devices/SimplifiedCoverCalibratorPanel.vue) |

---

## Safety Monitor

### Panel: `SimplifiedSafetyMonitorPanel.vue`

#### UI Features

- Safety status display (safe/unsafe/unknown) ([SimplifiedSafetyMonitorPanel.vue](src/components/devices/SimplifiedSafetyMonitorPanel.vue))
- Device description ([SimplifiedSafetyMonitorPanel.vue](src/components/devices/SimplifiedSafetyMonitorPanel.vue))

#### Store Properties/Actions Used (with code references)

- Status: Device properties ([switchActions.ts](src/stores/modules/switchActions.ts))
- Error/Status: Error/status events ([switchActions.ts](src/stores/modules/switchActions.ts))

#### Not Surfaced in UI (from store/Alpaca)

- Advanced error/status reporting — only partial status in UI
- Any control — safety monitor is read-only

#### Summary Table (with code references)

| Capability | Store Exposed | Panel UI | Code Reference(s) |
| --- | :-: | :-: | --- |
| Safety Status | ✔️ | ✔️ | [switchActions.ts](src/stores/modules/switchActions.ts), [SimplifiedSafetyMonitorPanel.vue](src/components/devices/SimplifiedSafetyMonitorPanel.vue) |
| Description | ✔️ | ✔️ | [switchActions.ts](src/stores/modules/switchActions.ts), [SimplifiedSafetyMonitorPanel.vue](src/components/devices/SimplifiedSafetyMonitorPanel.vue) |
| Error/Status Details | ✔️ | Partial | [switchActions.ts](src/stores/modules/switchActions.ts), [SimplifiedSafetyMonitorPanel.vue](src/components/devices/SimplifiedSafetyMonitorPanel.vue) |

---

## Observing Conditions

### Panel: `SimplifiedObservingConditionsPanel.vue`

#### UI Features

- Display of all major observing conditions ([SimplifiedObservingConditionsPanel.vue](src/components/devices/SimplifiedObservingConditionsPanel.vue))
- Set averaging period ([SimplifiedObservingConditionsPanel.vue](src/components/devices/SimplifiedObservingConditionsPanel.vue))

#### Store Properties/Actions Used (with code references)

- Fetch conditions: `fetchObservingConditions` ([observingConditionsActions.ts](src/stores/modules/observingConditionsActions.ts))
- Set averaging period: `setObservingConditionsAveragePeriod` ([observingConditionsActions.ts](src/stores/modules/observingConditionsActions.ts))
- Error/Status: Error/status events ([observingConditionsActions.ts](src/stores/modules/observingConditionsActions.ts))

#### Not Surfaced in UI (from store/Alpaca)

- Advanced error/status reporting — only partial status in UI
- Some advanced settings (if supported)

#### Summary Table (with code references)

| Capability | Store Exposed | Panel UI | Code Reference(s) |
| --- | :-: | :-: | --- |
| Display Conditions | ✔️ | ✔️ | [observingConditionsActions.ts](src/stores/modules/observingConditionsActions.ts), [SimplifiedObservingConditionsPanel.vue](src/components/devices/SimplifiedObservingConditionsPanel.vue) |
| Set Averaging Period | ✔️ | ✔️ | [observingConditionsActions.ts](src/stores/modules/observingConditionsActions.ts), [SimplifiedObservingConditionsPanel.vue](src/components/devices/SimplifiedObservingConditionsPanel.vue) |
| Error/Status Details | ✔️ | Partial | [observingConditionsActions.ts](src/stores/modules/observingConditionsActions.ts), [SimplifiedObservingConditionsPanel.vue](src/components/devices/SimplifiedObservingConditionsPanel.vue) |

---

## Telescope

### Panel: `SimplifiedTelescopePanel.vue`

#### UI Features

- Display of RA/Dec, Alt/Az ([SimplifiedTelescopePanel.vue](src/components/devices/SimplifiedTelescopePanel.vue))
- Slew to coordinates ([SimplifiedTelescopePanel.vue](src/components/devices/SimplifiedTelescopePanel.vue))
- Manual move (directional) ([SimplifiedTelescopePanel.vue](src/components/devices/SimplifiedTelescopePanel.vue))
- Park/unpark, find home ([SimplifiedTelescopePanel.vue](src/components/devices/SimplifiedTelescopePanel.vue))
- Tracking toggle and rate ([SimplifiedTelescopePanel.vue](src/components/devices/SimplifiedTelescopePanel.vue))

#### Store Properties/Actions Used (with code references)

- Slew to coordinates: `slewToCoordinates`
