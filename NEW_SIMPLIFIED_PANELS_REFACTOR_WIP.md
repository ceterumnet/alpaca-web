# Simplified Panels Refactor - Work In Progress

## Overview

This document outlines the current status of the refactoring effort for the simplified device control panels. The primary goal is to move all Alpaca API interactions into the `UnifiedStore`, making the Vue components responsible only for UI presentation and dispatching actions to the store.

## Progress So Far

### 1. Panels Refactored

The following panels have been refactored to use the `UnifiedStore` for their data and actions, removing direct Alpaca calls:

- `src/components/devices/SimplifiedFilterWheelPanel.vue`
- `src/components/devices/SimplifiedDomePanel.vue`
- `src/components/devices/SimplifiedObservingConditionsPanel.vue`
- `src/components/devices/SimplifiedSwitchPanel.vue`
- `src/components/devices/SimplifiedRotatorPanel.vue`

### 2. Store Modules Created

Corresponding Pinia store modules have been created to handle the logic for each refactored panel type:

- `src/stores/modules/filterWheelActions.ts`
- `src/stores/modules/domeActions.ts`
- `src/stores/modules/observingConditionsActions.ts`
- `src/stores/modules/switchActions.ts`
- `src/stores/modules/rotatorActions.ts`
- `src/stores/modules/coreActions.ts` (Central to device management)
- `src/stores/modules/simulationActions.ts` (For device simulation)
- `src/stores/modules/eventSystem.ts` (For store-wide events)

These modules are integrated into the main `src/stores/UnifiedStore.ts`.

### 3. Device Types (`device.types.ts`)

- The file `src/types/device.types.ts` has been manually edited to resolve duplicate type guards and ensure correct definitions for all device types, including `ObservingConditionsDevice` and its associated type guard `isObservingConditions`. This file currently reports no linter errors.

### 4. Store Module Typing and "this" Context Refinements

Significant effort has been invested in resolving complex TypeScript typing issues within the `UnifiedStore` modules:

- **Initial Challenge**: The modular store structure led to "this context" errors. TypeScript struggled with the `this` type within actions, especially concerning `CoreState` (particularly `deviceClients: Map<string, AlpacaClient>`) and `AlpacaClient` instances losing their method signatures when accessed from the reactive `Map`.
- **Solution Strategy**:
  - **Standardized `this` Context**: The `this` type for actions within all store modules (e.g., `coreActions.ts`, `simulationActions.ts`, `switchActions.ts`, `rotatorActions.ts`) has been standardized to `UnifiedStoreType`. `UnifiedStoreType` (derived from `ReturnType<typeof useUnifiedStore>`) represents the entire store instance, including all combined state and actions.
  - **Explicit Action Signatures**: Each module creator function (e.g., `createCoreActions()`) now has an explicit return type, including a defined interface for its actions (e.g., `ICoreActions`, `ISimulationActions`, `SwitchActionsSignatures`, `IRotatorActions`). This improves type safety and clarity.
  - **`AlpacaClient` Typing**: The issue of `AlpacaClient` instances in the `deviceClients` map losing their method signatures was addressed by:
    - Using `markRaw()` when setting client instances into the `deviceClients` map. This tells Vue/Pinia to not make the client deeply reactive, preserving its class instance methods.
    - Employing type assertions (e.g., `client as AlpacaClient`) when retrieving clients from the map to reassure TypeScript of the correct type.
- **Specific Module Fixes**:
  - **`coreActions.ts`**:
    - `CoreState` and `ICoreActions` were refined.
    - The `this` type for all actions in `ICoreActions` and their implementations was changed to `UnifiedStoreType`.
    - Errors related to missing `shouldFallbackToSimulation` and `simulateDeviceMethod` were resolved by defining these in `simulationActions.ts` and ensuring they are correctly part of `UnifiedStoreType`.
    - Unused `CoreActionContext` type was removed.
  - **`simulationActions.ts`**:
    - `shouldFallbackToSimulation` and `simulateDeviceMethod` were added with `this: UnifiedStoreType`.
    - `createSimulationActions` now has an explicit return type and an `ISimulationActions` interface.
    - `DeviceEvent` import usage was clarified with type assertions to satisfy the linter.
  - **`switchActions.ts`**:
    - Numerous "Property does not exist on type 'SwitchActionContext'" errors were resolved.
    - The `this` type was changed from `SwitchActionContext` to `UnifiedStoreType` for all actions.
    - `createSwitchActions` now has an explicit return type (`{ state: () => SwitchModuleState; actions: SwitchActionsSignatures; }`).
    - Imports were updated (`UnifiedStoreType`, `DeviceEvent`), unused `CoreState` import removed.
    - Explicit type annotations (e.g., `const device: Device | null`) were added where needed to satisfy linter for imported types.
  - **`rotatorActions.ts`** (New):
    - Created with `RotatorModuleState` and `IRotatorActions`.
    - `this` context standardized to `UnifiedStoreType`.
    - Alpaca calls use generic `client.get()` and `client.put()` methods, assuming these are provided by `AlpacaClient` from `coreActions`.
    - Assumes existence of `handleAlpacaError` and `emitDeviceEvent` on `UnifiedStoreType`.
- **Architectural Review**: Confirmed that device-specific property fetching methods (e.g., `fetchCameraProperties`) were already correctly located in their respective modules (`cameraActions.ts`, `telescopeActions.ts`) and not in `coreActions.ts`.

## Current Status

The described changes have been applied to `coreActions.ts`, `simulationActions.ts`, `switchActions.ts`, and now `rotatorActions.ts`. These modules should now be free of the previously discussed linter errors related to "this context" and property existence.

The "this context" errors previously noted in the Vue panels (e.g., `SimplifiedSwitchPanel.vue`, and potentially `SimplifiedRotatorPanel.vue` before this refactor) — where the panel's store instance `this` (of `Store<"unifiedStore", ...>`) was not assignable to an action's expected `this` (e.g., `SwitchActionContext`) — should now be resolved. This is because the actions themselves now declare their `this` context as `UnifiedStoreType`, which aligns with the actual `this` provided by Pinia when actions are invoked from components.

## Next Steps

1.  **Verify Panel Linter Errors**: Confirm that the TypeScript errors in the refactored panels (`SimplifiedFilterWheelPanel.vue`, `SimplifiedDomePanel.vue`, `SimplifiedObservingConditionsPanel.vue`, `SimplifiedSwitchPanel.vue`, `SimplifiedRotatorPanel.vue`) are indeed resolved following the store module updates.
2.  **Review Other Device Action Modules**: Apply the same typing strategy (standardize `this` to `UnifiedStoreType`, explicit return types for creator functions, well-defined action interfaces) to other device-specific action modules if they exhibit similar typing issues:
    - `src/stores/modules/filterWheelActions.ts`
    - `src/stores/modules/domeActions.ts`
    - `src/stores/modules/observingConditionsActions.ts`
    - `src/stores/modules/cameraActions.ts`
    - `src/stores/modules/telescopeActions.ts`
3.  **Runtime Testing**: Conduct thorough runtime testing of all refactored panels and associated store functionality to ensure:
    - Real device interactions are working correctly.
    - Simulation fallbacks trigger as expected.
    - State updates are propagating to the UI.
    - No new runtime errors have been introduced.
4.  **Continue Panel Refactoring**: If any device control panels have not yet been refactored to use the `UnifiedStore`, continue this process.
5.  **Documentation**: Update any relevant developer documentation or comments to reflect the established store architecture and typing patterns.

Once these steps are complete, the simplified panels refactor should achieve its goal of a more maintainable and type-safe architecture.
