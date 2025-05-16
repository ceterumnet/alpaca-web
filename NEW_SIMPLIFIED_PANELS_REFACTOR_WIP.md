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

### 2. Store Modules Created

Corresponding Pinia store modules have been created to handle the logic for each refactored panel type:

- `src/stores/modules/filterWheelActions.ts`
- `src/stores/modules/domeActions.ts`
- `src/stores/modules/observingConditionsActions.ts`
- `src/stores/modules/switchActions.ts`

These modules are integrated into the main `src/stores/UnifiedStore.ts`.

### 3. Device Types (`device.types.ts`)

- The file `src/types/device.types.ts` has been manually edited to resolve duplicate type guards and ensure correct definitions for all device types, including `ObservingConditionsDevice` and its associated type guard `isObservingConditions`. This file currently reports no linter errors.

## Current Status & Outstanding Issues

While the refactored panels and store modules are structurally in place, there are significant TypeScript typing issues that need to be addressed.

### 1. TypeScript "this context" Errors in Panels

All refactored panels (`SimplifiedFilterWheelPanel.vue`, `SimplifiedDomePanel.vue`, `SimplifiedObservingConditionsPanel.vue`, `SimplifiedSwitchPanel.vue`) show TypeScript errors when calling actions on the `UnifiedStore` instance. The error message typically is:

```
The 'this' context of type 'Store<"unifiedStore", { ... }>' is not assignable to method's 'this' of type '[DeviceType]ActionContext'.
  Type 'Store<"unifiedStore", { ... }>' is not assignable to type 'CoreState'.
    The types of 'deviceClients.forEach' are incompatible between these types.
      Type '(callbackfn: (value: { ... }) => ...' is not assignable to type '(callbackfn: (value: AlpacaClient, ...)) => void'.
        ...
          Type '{ ... }' is missing the following properties from type 'AlpacaClient': getDeviceUrl, buildUrl, logRequest, logResponse, and 3 more.
```

This indicates a mismatch between the expected `this` context within the action modules (e.g., `FilterWheelActionContext`) and the actual `this` context provided by the Pinia store. The core of the issue seems to stem from how `CoreState` (defined in `src/stores/modules/coreActions.ts`) and its `deviceClients` property (which should hold instances of `AlpacaClient` or its derivatives) are typed and accessed across the composed store actions.

### 2. Architectural Challenge: Store Modularity and Typing

The current modular approach for `UnifiedStore.ts`, where actions from different files (`coreActions.ts`, `filterWheelActions.ts`, etc.) are combined, presents challenges for TypeScript's type inference and `this` context management.

Each device-specific action module defines an `[DeviceType]ActionContext` type (e.g., `FilterWheelActionContext`) which combines its own state, `CoreState`, and its own action signatures. When an action is called from a Vue component (e.g., `store.setFilterWheelPosition(...)`), TypeScript expects the `this` inside `setFilterWheelPosition` to conform to `FilterWheelActionContext`. However, the actual `this` seems to be the broader Pinia store instance, which, while containing all parts of `CoreState`, might not be directly assignable, especially concerning the `deviceClients` map within `CoreState` and its expected `AlpacaClient` interface.

Your note about `CoreState` and the mechanics of `this` and TypeScript being important was prescient.

## Affected Files

- **Panels (TypeScript errors):**
  - `src/components/devices/SimplifiedFilterWheelPanel.vue`
  - `src/components/devices/SimplifiedDomePanel.vue`
  - `src/components/devices/SimplifiedObservingConditionsPanel.vue`
  - `src/components/devices/SimplifiedSwitchPanel.vue`
- **Store Modules (Define `ActionContext` types and actions):**
  - `src/stores/modules/filterWheelActions.ts`
  - `src/stores/modules/domeActions.ts`
  - `src/stores/modules/observingConditionsActions.ts`
  - `src/stores/modules/switchActions.ts`
- **Core Store Files (Central to the typing issue):**
  - `src/stores/UnifiedStore.ts`
  - `src/stores/modules/coreActions.ts` (Defines `CoreState` and `deviceClients`)
  - `src/api/alpaca/base-client.ts` (Defines `AlpacaClient`)

## Next Steps

Focus should be on resolving the TypeScript "this context" and `CoreState`/`AlpacaClient` typing issues within the `UnifiedStore` and its modules. This might involve:

1.  Re-evaluating how `CoreState` (especially `deviceClients`) is defined and shared across modules.
2.  Adjusting the `AlpacaClient` base class or how derived clients are stored/typed in `deviceClients`.
3.  Modifying how `ActionContext` types are defined in each module to correctly align with Pinia's `this`.

Once these typing issues are resolved, the refactored panels should be free of linter errors and operate as intended.
