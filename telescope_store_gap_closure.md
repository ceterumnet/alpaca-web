# Telescope Store Gap Closure Plan

This document tracks the effort to close the gap between the Alpaca telescope client and the store actions, ensuring all Alpaca/ASCOM capabilities are exposed in the store and available for the UI.

---

## Table: Alpaca Client Methods vs. Store Actions

| Capability                 | Alpaca Client | Store Action | Status | Notes                |
| -------------------------- | :-----------: | :----------: | :----: | -------------------- |
| findHome                   |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| syncToCoordinates          |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| syncToAltAz                |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| syncToTarget               |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| slewToTarget               |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| slewToTargetAsync          |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| moveAxis                   |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| pulseGuide                 |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| setTargetRightAscension    |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| setTargetDeclination       |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| isPulseGuiding             |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| getApertureArea            |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| getApertureDiameter        |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| getAxisRates               |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| getDestinationSideOfPier   |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| getGuideRateDeclination    |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| getGuideRateRightAscension |      ✔️       |      ✔️      |  [x]   | Implemented in store |
| getSlewSettleTime          |      ✔️       |      ✔️      |  [x]   | Implemented in store |

---

## Implementation Plan

- [x] All Alpaca client methods are now implemented in the store.
- [x] For each action, followed the established pattern:
  - Used `getDeviceClient` to get the Alpaca client.
  - Called the appropriate client method.
  - Emitted events and updated store state as needed.
  - Handled errors and emitted error events.
- [x] For read-only/capability properties, fetched once on connection (in `fetchTelescopeProperties`).
- [x] For dynamic/pollable properties, added to polling if not available via devicestate.
- [x] Documented and checked off each item as implemented.

---

## Notes on Property Fetching and Polling

- **Read-only/capability properties** (e.g., `canfindhome`, `canpulseguide`, `canSync`) are fetched once on connection.
- **Dynamic/pollable properties** (e.g., `isPulseGuiding`, `guideRateDeclination`) are polled if not available via devicestate, following the same pattern as existing dynamic properties.
- **All new actions** emit events and update store state as appropriate.

---

## Progress Log

- [x] Implemented findHome, syncToCoordinates, syncToAltAz, and syncToTarget actions in the store (using deviceMethodCalled/devicePropertyChanged/deviceApiError events).
- [x] Implemented slewToTarget, slewToTargetAsync, moveAxis, and pulseGuide actions in the store.
- [x] Implemented setTargetRightAscension, setTargetDeclination, and isPulseGuiding in the store.
- [x] Implemented getApertureArea, getApertureDiameter, getAxisRates, getDestinationSideOfPier, getGuideRateDeclination, getGuideRateRightAscension, and getSlewSettleTime in the store.
- [x] **Gap between Alpaca client and store is now closed!**
