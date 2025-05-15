## Debugging Summary: Double API Calls & Panel Initialization

**Initial Problem:** The primary issue reported was "double calls" related to `devicestate` and `trackingRate` for telescope panels, perceived as either multiple GET requests or multiple SET requests.

**Key Findings & Learnings:**

1.  **Nature of "Double Calls":**

    - **`trackingRate`:** Confirmed to be multiple **GET** requests for the `trackingrate` property, not SET/PUT requests. The panel's UI was not actually attempting to set the rate multiple times.
    - **`devicestate`:** Initially, `updateCoordinates` (which fetches `devicestate` via `getAlpacaProperties`) was being called multiple times during panel initialization, leading to multiple `devicestate` GETs.

2.  **Root Cause of Panel Re-initialization (`SimplifiedTelescopePanel.vue`):**

    - **Initial Issue:** The dynamic component `:key` in `PanelLayoutView.vue` included `cellConnectionStatus`. When this status changed, it caused the `SimplifiedTelescopePanel` to be completely destroyed and remounted.
    - **Fix Applied:** The `:key` was changed to only `cellDeviceAssignments[position.panelId]`. This stabilized the panel instance, preventing remounts when only the connection status changed. The panel now receives `isConnected` as a prop and reacts to it.

3.  **Panel's Internal Initialization Logic (`SimplifiedTelescopePanel.vue`):**

    - **Polling:** The panel initially had its own `setInterval` for polling coordinates. This was removed to centralize polling in the store and prevent redundant GETs.
    - **`updateCoordinates` Calls:** After removing panel polling and fixing the remount issue, we traced that `updateCoordinates` (responsible for an initial data display) was being called cleanly once during the setup phase (either by the `props.deviceId` watcher or the `props.isConnected` watcher).
    - **`selectedTrackingRate` Watcher:** The watcher for `selectedTrackingRate` (tied to the UI dropdown) was correctly determined _not_ to be firing during initialization because the fetched `trackingRate` from the device (`0`) matched the ref's initial value (`0`). The `isProgrammaticRateUpdate` and `isPanelInitialized` flags were added to make this watcher robust against programmatic changes.
    - **Hoisting/Initialization Order:** Critical errors like "Cannot access 'variable' before initialization" were found due to the order of definitions in `<script setup>`. `currentDevice` and other functions needed to be defined before computed properties or immediate watchers that used them. This was a key fix to allow the panel to set up correctly.

4.  **Store Reactivity (`coreActions.ts` & `PanelLayoutView.vue`):**

    - **Initial Churn:** The watcher for `unifiedStore.devicesList` in `PanelLayoutView.vue` was initially firing excessively (e.g., 30-50+ times) due to its `deep: true` nature and the way device objects were being updated in the store (new objects created on every property update).
    - **Store Refactor (`coreActions.ts` - `updateDevice`, `updateDeviceProperties`):** These functions were refactored to mutate device objects and their properties in place more carefully. When updating the `devicesArray` (which `PanelLayoutView` watches), a device is now replaced with a shallow clone _only if its properties actually changed_, reducing unnecessary reactivity.
    - **`PanelLayoutView.vue` Watcher Refinement:** The watcher was changed from `unifiedStore.devicesList` to a computed property `relevantDeviceStatuses` (mapping to just `id` and `isConnected`). This significantly reduced the number of times it fired.

5.  **Current State of `trackingRate` GETs:**
    - Even with the panel initializing cleanly (calling `updateCoordinates` once for initial display) and the store/parent reactivity improved, the logs indicate that at least two distinct GET requests for `trackingrate` are still occurring during initialization:
      - **GET #1:** Originates from `SimplifiedTelescopePanel.vue` -> `updateCoordinates` -> `getAlpacaProperties` -> `store.getDeviceProperty('trackingrate')`.
      - **GET #2:** Originates from the store's own polling mechanism in `telescopeActions.ts` (`startTelescopePropertyPolling`'s interval -> `client.getProperty('trackingrate')`).
    - Subsequent polling from both the (now removed) panel's timer and the store's timer would have continued this pattern. With the panel's timer removed, the duplication should now primarily be between the panel's _initial_ fetch and the store's _first poll_.

**Primary Suspects for Remaining Multiple `trackingRate` GETs:**

- **Overlap between Panel's Initial Fetch and Store's First Poll:** The panel, upon becoming connected, makes one call via `getAlpacaProperties` (which includes `trackingRate`). Almost concurrently, the store's `startTelescopePropertyPolling` kicks in, and its first execution also fetches `trackingRate`.
- **Internal Logic of `getAlpacaProperties`:** This utility might have its own strategy for fetching properties (e.g., trying `devicestate` then falling back to individual GETs). If it's called by the panel and decides to do an individual GET for `trackingRate`, and the store poller _also_ does an individual GET, that's two.

**Recommendations for Next Session:**

1.  **Confirm Panel's `updateCoordinates` Behavior:** Ensure `updateCoordinates` in `SimplifiedTelescopePanel.vue` is truly only for a one-time initial data population for display, and that the panel's displayed values are then fully reactive to changes in `currentDevice.value.properties` (which are updated by the store's poller). The computed properties setup aims to achieve this.
2.  **Analyze `getAlpacaProperties` Utility (`src/utils/alpacaPropertyAccess.ts`):**
    - How does it decide to fetch `trackingRate`? Does it always do an individual GET for it, or only if not found in `devicestate`?
    - If the panel calls this, and the store poller _also_ fetches `trackingRate`, this is the source of the duplication.
3.  **Store's `startTelescopePropertyPolling` (`telescopeActions.ts`):**
    - Review its logic for fetching `trackingrate`. Does it _always_ fetch it individually, or does it rely on `devicestate` first?
    - Could the first poll run so quickly after connection that it overlaps with the panel's initial `getAlpacaProperties` call?
4.  **Strategy: Single Source of Truth for Polling:**
    - The most robust solution is for the store to be the _sole_ poller.
    - The panel's `updateCoordinates` (if kept) should ideally _not_ trigger network requests itself but perhaps just ensure the UI reflects the latest from the store once, or potentially trigger a _one-time, non-polling_ fetch action in the store if needed specifically on panel activation and if data isn't already fresh.
    - Ensure all displayed dynamic data in the panel is derived via `computed` properties from the store state (`currentDevice.value.properties.propertyName`).
