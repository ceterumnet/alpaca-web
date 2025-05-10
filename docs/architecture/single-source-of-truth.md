# Simplifying Components and Enforcing a Single Source of Truth

## Motivation

Recent work on the Alpaca/ASCOM web app revealed architectural issues that led to bugs, UI inconsistencies, and maintenance challenges. The most significant problems were:

- **Tight coupling** between UI components and device clients
- **Multiple sources of truth** for device state, leading to reactivity issues
- **Incorrect protocol usage** (e.g., using PUT for endpoints that require GET)
- **Scattered error handling** and diagnostics

This document outlines the principles and migration plan for simplifying components and moving to a single source of truth for device state and operations.

---

## Principles

### 1. Single Source of Truth

- All device state and operations must flow through the service/store abstraction (e.g., `unifiedStore`).
- UI components should **never** access device clients or make direct API calls.
- The store/service is responsible for:
  - Fetching and caching device state
  - Handling all device operations (get/set/call)
  - Managing error handling, retries, and fallbacks

### 2. Decoupled UI Components

- Components should only consume state and actions exposed by the store/service.
- Components focus on rendering and user interaction, not business logic or protocol details.
- Diagnostics and error messages should be surfaced via the store/service.

### 3. Protocol Correctness

- The service layer must use the correct HTTP methods and endpoints as per the Alpaca/ASCOM spec.
- Special cases (e.g., `imagearray` must use GET) are handled in the service, not in the UI.

### 4. Centralized Error Handling

- All error handling, retries, and fallback logic are centralized in the service/store.
- UI components display errors surfaced by the store, and may offer user actions to retry or diagnose.

---

## Refactoring and Migration Plan

1. **Remove direct client access from all UI components.**
   - Replace any use of `unifiedStore.getDeviceClient()` or direct client methods with service/store methods.
2. **Enforce use of service/store for all device operations.**
   - Use methods like `getDeviceProperty`, `callDeviceMethod`, or the new `executeDeviceOperation` abstraction.
3. **Fix protocol usage in the service layer.**
   - Ensure endpoints like `imagearray` use GET, not PUT.
   - Add special-case handling in the service for endpoints that deviate from the generic method call pattern.
4. **Centralize error handling and diagnostics.**
   - Add diagnostic helpers and auto-fix tools to the service/store.
   - Surface connection/client errors to the UI via the store.
5. **Improve reactivity and state updates.**
   - Use Vue reactivity best practices in the store/service.
   - Ensure state changes in the store trigger UI updates.
6. **Document migration steps and add comments for any temporary workarounds.**

---

## Files to Refactor: `getDeviceClient` Usages

The following files currently call `getDeviceClient` directly and should be refactored to use the service/store abstraction methods instead:

- ~~src/components/panels/BasePanel.vue~~ ✅
- ~~src/components/panels/features/CameraExposureControl.vue~~ ✅
- ~~src/components/ui/DeviceConnectionDiagnostic.vue~~ ✅
- ~~src/stores/UnifiedStore.ts~~ ✅
- ~~src/stores/modules/coreActions.ts~~ ✅
- ~~src/stores/modules/telescopeActions.ts~~ ✅
- ~~src/stores/modules/cameraActions.ts~~ ✅
- ~~tests/stores/UnifiedStore-AlpacaClient.test.ts~~ ✅ (unit tests, reviewed and compliant)

**Note:**

- Some usages in store modules may be valid for internal logic, but all UI and service-facing code should use the new abstraction.
- Unit test usages can remain for coverage, but should be reviewed for relevance after refactoring.

---

## Benefits

- **Simpler, more maintainable components**
- **Consistent, reliable UI state**
- **Easier debugging and diagnostics**
- **Protocol correctness and future-proofing**
- **Centralized error handling and improved user experience**

---

## Future Improvements

- Complete migration of all device operations to the service/store abstraction
- Add more robust diagnostics and auto-fix tools
- Continue to improve TypeScript typing and context in the store
- Expand test coverage for service/store logic

## Additional Future Improvements

- Enforce strict separation between top-level device fields (e.g., id, name, apiBaseUrl) and the `properties` object, which should only contain raw Alpaca/ASCOM device properties.
- Normalize all device objects on ingestion (discovery, manual add, simulation) to promote core fields to the top level and remove them from `properties`.
- Define and use TypeScript types for device-specific properties (e.g., CameraProperties, TelescopeProperties) to improve type safety and reduce subtle bugs.
- Add runtime or build-time checks to ensure core fields are never present in `properties` after normalization.
- Document and enforce that all code should access core fields from the top level, not from `properties`.

---

_This document is a living guide. Please update it as the architecture evolves or new lessons are learned._
