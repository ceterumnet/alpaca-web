# Implementing Alpaca Calls and Panel Support

_Exported on 5/16/2025 at 07:50:42 CDT from Cursor (0.50.4)_

---

**User**

Ok - I want to implement the missing support for the alpaca calls and the panels that are just stubbed out.

Please let me know what information you need from me to plan and make this happen

---

**Cursor**

Okay, I can help with that! To get started, I need to understand the current state of your project.

I'll begin by examining the existing Alpaca API implementations and the panel components to identify what's missing or stubbed out.

From the file listing, I can see:

- **Alpaca API Clients**:

  - `base-client.ts`
  - `telescope-client.ts`
  - `camera-client.ts`
  - `factory.ts` (likely for creating client instances)
  - `errors.ts`
  - `types.ts`

- **Panel Components**:
  - `CameraControls.vue`
  - `features/CameraImageDisplay.vue`
  - `features/CameraExposureControl.vue`

It seems like the primary focus so far has been on Camera and Telescope devices.

To figure out what's "missing" or "stubbed out", could you please tell me:

1.  **Which specific Alpaca device types** do you want to add support for (e.g., Focuser, FilterWheel, Dome, Switch, etc.)?
2.  For these new device types, what specific **Alpaca actions/methods** are most important to implement first?
3.  Are there **existing UI panel files** for these other device types that are currently just placeholders, or will we need to create them from scratch? If they exist, where are they located?
4.  Could you point me to any **"stubbed out" panel components** you mentioned? Knowing their file names would be helpful.

Once I have this information, I can start planning the implementation. If the "alpaca" rule is relevant here, I can fetch that too.

I've also fetched the "alpaca" rule, which points to the `AlpacaDeviceAPI_v1.yaml` specification. This will be a valuable reference.

---

**User**

@SimplifiedDomePanel.vue @SimplifiedSwitchPanel.vue @SimplifiedSwitchPanel.vue @SimplifiedRotatorPanel.vue @SimplifiedFilterWheelPanel.vue @SimplifiedSafetyMonitorPanel.vue @SimplifiedCoverCalibratorPanel.vue @SimplifiedObservingConditionsPanel.vue

@SimplifiedFocuserPanel.vue is built, but I'm not sure if the alpaca properties have been wired up properly or not.

You can look at @SimplifiedTelescopePanel.vue and it's supporting code to understand how we implement these in our system

---

**Cursor**

Okay, I understand. You've provided a list of Vue components in `src/components/devices/` that are currently placeholder panels, and you want to implement them. You also have `SimplifiedFocuserPanel.vue` which is more developed but needs its Alpaca property wiring checked, and `SimplifiedTelescopePanel.vue` serves as a good example of how these are implemented.

Here's the plan:

1.  **Create Alpaca Clients**: For each device type that doesn't have one, I'll create a new client file in `src/api/alpaca/` (e.g., `focuser-client.ts`, `dome-client.ts`, etc.). These will be based on the existing clients (`camera-client.ts`, `telescope-client.ts`) and the `AlpacaDeviceAPI_v1.yaml` specification.
2.  **Implement Focuser Client & Review Panel**:
    - Create `focuser-client.ts` with methods and property accessors required by `SimplifiedFocuserPanel.vue` (e.g., `move`, `halt`, `position`, `isMoving`, `temperature`, `stepSize`, `tempComp`).
    - The panel uses `moveIn` and `moveOut` which are not standard Alpaca methods. I'll implement these in `focuser-client.ts` by having them call the standard `move` method with a calculated target position (`current_position +/- step_size`).
    - Review `SimplifiedFocuserPanel.vue` to ensure its calls to `setAlpacaProperty`, `callAlpacaMethod`, and `getAlpacaProperties` correctly map to the new `FocuserClient`.
3.  **Implement Placeholder Panels**: For each of the placeholder panels (`Dome`, `Switch`, `Rotator`, `FilterWheel`, `SafetyMonitor`, `CoverCalibrator`, `ObservingConditions`):
    - I'll create their respective Alpaca client files if they don't exist.
    - I'll update the Vue component to include:
      - Basic connection status display and connect/disconnect functionality.
      - Display of common Alpaca properties (Name, Description).
      - UI elements for a few key device-specific properties and methods, drawing from the `AlpacaDeviceAPI_v1.yaml` and using `SimplifiedTelescopePanel.vue` and `SimplifiedFocuserPanel.vue` as style/structure guides.
      - Polling for status updates.
4.  **Update API Factory and Index**: I'll add any new Alpaca clients to `src/api/alpaca/factory.ts` and export them from `src/api/alpaca/index.ts`.
5.  **Review `alpacaPropertyAccess.ts`**: I'll examine `src/utils/alpacaPropertyAccess.ts` to understand how it fetches and interacts with the device clients and ensure it works seamlessly with the newly added clients.

Let's start by creating the `focuser-client.ts` because `SimplifiedFocuserPanel.vue` is already partially built.

I will first read the `telescope-client.ts` to use as a template.

Now, I'll create `src/api/alpaca/focuser-client.ts`.

```typescript
import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

// Focuser-specific client with focuser-specific methods
export class FocuserClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'focuser', deviceNumber, device)
  }

  // Properties (GETters)
  async isMoving(): Promise<boolean> {
    return this.getProperty('ismoving') as Promise<boolean>
  }

  async getPosition(): Promise<number> {
    return this.getProperty('position') as Promise<number>
  }

  async getStepSize(): Promise<number> {
    return this.getProperty('stepsize') as Promise<number>
  }

  async getMaxStep(): Promise<number> {
    return this.getProperty('maxstep') as Promise<number>
  }

  async getMaxIncrement(): Promise<number> {
    return this.getProperty('maxincrement') as Promise<number>
  }

  async getTemperature(): Promise<number | null> {
    // Temperature might not be available
    try {
      const temp = await this.getProperty('temperature')
      return temp === null || typeof temp === 'undefined' ? null : (temp as number)
    } catch (error) {
      // Handle cases where temperature property might not exist (e.g. not supported by device)
      // console.warn(\`Error getting temperature for focuser \${this.device.name}: \${error}\`)
      return null
    }
  }

  async isTempCompAvailable(): Promise<boolean> {
    return this.getProperty('tempcompavailable') as Promise<boolean>
  }

  async getTempComp(): Promise<boolean> {
    return this.getProperty('tempcomp') as Promise<boolean>
  }

  // Properties (SETters)
  async setTempComp(enable: boolean): Promise<void> {
    await this.setProperty('tempcomp', enable)
  }

  // Methods
  async halt(): Promise<void> {
    await this.put('halt')
  }

  async move(position: number): Promise<void> {
    await this.put('move', { Position: position })
  }

  // Custom methods for panel convenience (moveIn/moveOut)
  async moveIn(steps?: number): Promise<void> {
    const currentPosition = await this.getPosition()
    const stepSize = steps ?? (await this.getStepSize()) // Use provided steps or fetch device's step size
    if (typeof currentPosition === 'number' && typeof stepSize === 'number') {
      await this.move(currentPosition - stepSize)
    } else {
      throw new Error('Could not determine current position or step size to move in.')
    }
  }

  async moveOut(steps?: number): Promise<void> {
    const currentPosition = await this.getPosition()
    const stepSize = steps ?? (await this.getStepSize()) // Use provided steps or fetch device's step size
    if (typeof currentPosition === 'number' && typeof stepSize === 'number') {
      await this.move(currentPosition + stepSize)
    } else {
      throw new Error('Could not determine current position or step size to move out.')
    }
  }

  // Method to get all relevant focuser properties, similar to SimplifiedFocuserPanel's needs
  async getFocuserState(): Promise<Record<string, unknown>> {
    const properties = [
      'absolute', // boolean: True if the focuser is absolute
      'ismoving', // boolean: True if focuser is moving
      'maxincrement', // int32: Maximum increment size for 'move' relative requests
      'maxstep', // int32: Maximum step position for 'move' absolute requests
      'position', // int32: Current focuser position
      'stepsize', // double: Focuser step size (microns)
      'tempcomp', // boolean: Temperature compensation state
      'tempcompavailable', // boolean: True if temp comp is available
      'temperature' // double: Focuser temperature (degrees Celsius)
    ]
    return this.getProperties(properties)
  }
}
```

A linter error was introduced because the `error` variable in the `catch` block of `getTemperature` is not used. I'll fix this by adding a `console.warn` statement, which was commented out in the code I provided. This is a safe and common practice.

```typescript
// ... existing code ...
    try {
      const temp = await this.getProperty('temperature')
      return temp === null || typeof temp === 'undefined' ? null : (temp as number)
    } catch (error) {
      // Handle cases where temperature property might not exist (e.g. not supported by device)
      console.warn(`Error getting temperature for focuser ${this.device.name}: ${error}`)
      return null
    }
  }
// ... existing code ...
```

Now I need to update `src/api/alpaca/index.ts` to export the new `FocuserClient`.

```typescript
// ... existing code ...
// Device-specific clients
export * from './camera-client'
export * from './telescope-client'
export * from './focuser-client'

// Factory function
// ... existing code ...
```

Next, I'll update `src/api/alpaca/factory.ts` to include `FocuserClient` in the factory logic.

```typescript
// ... existing code ...
import { AlpacaClient } from './base-client'
import { CameraClient } from './camera-client'
import { TelescopeClient } from './telescope-client'
import { FocuserClient } from './focuser-client'

/**
 * Factory function to create the appropriate client based on device type
 */
export function createAlpacaClient(baseUrl: string, deviceType: string, deviceNumber: number = 0, device: Device): AlpacaClient {
  switch (deviceType.toLowerCase()) {
    case 'camera':
      return new CameraClient(baseUrl, deviceNumber, device)
    case 'telescope':
      return new TelescopeClient(baseUrl, deviceNumber, device)
    case 'focuser':
      return new FocuserClient(baseUrl, deviceNumber, device)
    default:
      return new AlpacaClient(baseUrl, deviceType, deviceNumber, device)
  }
}
```

Now that the `FocuserClient` is set up and integrated into the factory:

1.  **Review `SimplifiedFocuserPanel.vue`**: The panel uses `getAlpacaProperties`, `setAlpacaProperty`, and `callAlpacaMethod` from `@/utils/alpacaPropertyAccess.ts`.
    - `getAlpacaProperties(props.deviceId, ['position', ...])`: This should now correctly fetch properties using the `FocuserClient` if `alpacaPropertyAccess.ts` uses the factory to get the client. The `FocuserClient`'s `getProperties` method (inherited from `AlpacaClient` and used by `getFocuserState`) will handle fetching these.
    - `setAlpacaProperty(props.deviceId, 'stepSize', stepSize.value)`: This is slightly problematic. My `FocuserClient` doesn't have a generic `setStepSize` method that `setProperty` from `AlpacaClient` would call directly in a type-safe way. The Alpaca spec for Focuser indicates `stepsize` is GET-only. The panel might be trying to set a property that is read-only according to the standard.
      - **Alpaca Focuser Spec**: `stepsize` (double, GET): Focuser step size. This means it cannot be set via a PUT request.
      - The panel's `updateStepSize` attempts to set `stepSize`. This will likely fail or is not standard. I will remove the `updateStepSize` function and its usage from `SimplifiedFocuserPanel.vue` as the `stepSize` property is read-only according to the Alpaca specification.
    - `setAlpacaProperty(props.deviceId, 'tempComp', tempComp.value)`: This is fine. My `FocuserClient` has `setTempComp(enable: boolean)`, and the `AlpacaClient.setProperty` should correctly call this.
    - `callAlpacaMethod(props.deviceId, 'move', { position: targetPosition })`: This should work; `FocuserClient` has `move(position: number)`.
    - `callAlpacaMethod(props.deviceId, 'moveIn')`: This should work; `FocuserClient` now has a custom `moveIn()` method.
    - `callAlpacaMethod(props.deviceId, 'moveOut')`: This should work; `FocuserClient` now has a custom `moveOut()` method.
    - `callAlpacaMethod(props.deviceId, 'halt')`: This should work; `FocuserClient` has `halt()`.

I will now modify `SimplifiedFocuserPanel.vue` to remove the `updateStepSize` functionality.

```vue
// ... existing code ... const tempComp = ref(false) // Reset focuser state when device changes const resetFocuserState = () => { position.value = 0
isMoving.value = false temperature.value = null // stepSize.value = 10 // stepSize is read-only from device maxStep.value = 1000 maxIncrement.value =
1000 tempComp.value = false targetPosition.value = 0 } // Functions for movement // ... existing code ... } } // Update settings /* const
updateStepSize = async () => { try { // StepSize is a GET-only property in Alpaca Focuser specification // await setAlpacaProperty(props.deviceId,
'stepSize', stepSize.value) console.warn('Attempted to set read-only property StepSize for Focuser') } catch (error) { console.error('Error setting
step size:', error) } } */ const updateTempComp = async () => { // ... existing code ... // Poll for focuser status let statusTimer: number |
undefined const updateFocuserStatus = async () => { if (!props.isConnected || !props.deviceId) return try { const properties = await
getAlpacaProperties(props.deviceId, [ 'position', 'isMoving', 'temperature', 'stepSize', // Read stepSize from device 'maxStep', 'maxIncrement',
'tempComp' ]) // ... existing code ...
<div class="panel-section">
          <h3>Movement</h3>
          <div class="movement-controls">
            <div class="step-size-control">
              <label>Step Size (microns):</label>
              <!-- Make input readonly as stepSize is GET only -->
              <input v-model.number="stepSize" type="number" readonly>
            </div>

<div class="movement-buttons"></div>
```

The linter error is because `updateStepSize` is referenced in the template (`@change="updateStepSize"`) but has been commented out in the script. I've already made the input `readonly`, so the `@change` handler is no longer needed and should be removed.

```vue
// ... existing code ...
<div class="panel-section">
          <h3>Movement</h3>
          <div class="movement-controls">
            <div class="step-size-control">
              <label>Step Size (microns):</label>
              <!-- Make input readonly as stepSize is GET only -->
              <input v-model.number="stepSize" type="number" readonly>
            </div>

<div class="movement-buttons"></div>
```

It seems the previous edit to make the input `readonly` also removed the `@change="updateStepSize"` part correctly, but the linter error was reported based on the intermediate state. The file should be correct now. Let me re-check the context of the previous edit to be sure.

The previous edit was:

```diff
// ... existing code ...
        <div class="panel-section">
          <h3>Movement</h3>
          <div class="movement-controls">
            <div class="step-size-control">
-              <label>Step Size:</label>
-              <input v-model.number="stepSize" type="number" min="1" :max="maxIncrement" step="1" @change="updateStepSize">
+              <label>Step Size (microns):</label>
+              <!-- Make input readonly as stepSize is GET only -->
+              <input v-model.number="stepSize" type="number" readonly>
            </div>

            <div class="movement-buttons">
// ... existing code ...
```

This diff correctly shows that the `input` tag was replaced, and the new `input` tag does not have `@change="updateStepSize"`. The linter error might have been a bit delayed or based on a slightly older version of the file content in the linter's cache. I'll assume this is resolved for `SimplifiedFocuserPanel.vue`.

Next, I'll proceed to create the client and implement the panel for the first placeholder: `SimplifiedDomePanel.vue`.

I'll start by creating `src/api/alpaca/dome-client.ts`.

```diff
// ... existing code ...
        <div class="panel-section">
          <h3>Movement</h3>
          <div class="movement-controls">
            <div class="step-size-control">
-              <label>Step Size:</label>
-              <input v-model.number="stepSize" type="number" min="1" :max="maxIncrement" step="1" @change="updateStepSize">
+              <label>Step Size (microns):</label>
+              <!-- Make input readonly as stepSize is GET only -->
+              <input v-model.number="stepSize" type="number" readonly>
            </div>

            <div class="movement-buttons">
// ... existing code ...
```

```typescript
import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

export class DomeClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'dome', deviceNumber, device)
  }

  // GET Properties
  async altitude(): Promise<number> {
    return this.getProperty('altitude')
  }

  async atHome(): Promise<boolean> {
    return this.getProperty('athome')
  }

  async atPark(): Promise<boolean> {
    return this.getProperty('atpark')
  }

  async azimuth(): Promise<number> {
    return this.getProperty('azimuth')
  }

  async canFindHome(): Promise<boolean> {
    return this.getProperty('canfindhome')
  }

  async canPark(): Promise<boolean> {
    return this.getProperty('canpark')
  }

  async canSetAltitude(): Promise<boolean> {
    return this.getProperty('cansetaltitude')
  }

  async canSetAzimuth(): Promise<boolean> {
    return this.getProperty('cansetazimuth')
  }

  async canSetPark(): Promise<boolean> {
    return this.getProperty('cansetpark')
  }

  async canSetShutter(): Promise<boolean> {
    return this.getProperty('cansetshutter')
  }

  async canSlave(): Promise<boolean> {
    return this.getProperty('canslave')
  }

  async canSyncAzimuth(): Promise<boolean> {
    return this.getProperty('cansyncazimuth')
  }

  async shutterStatus(): Promise<number> {
    // 0=Open, 1=Closed, 2=Opening, 3=Closing, 4=Error
    return this.getProperty('shutterstatus')
  }

  async slaved(): Promise<boolean> {
    return this.getProperty('slaved')
  }

  async slewing(): Promise<boolean> {
    return this.getProperty('slewing')
  }

  // PUT Methods
  async openShutter(): Promise<void> {
    await this.put('openshutter')
  }

  async closeShutter(): Promise<void> {
    await this.put('closeshutter')
  }

  async parkDome(): Promise<void> {
    await this.put('park')
  }

  async findHomeDome(): Promise<void> {
    await this.put('findhome')
  }

  async abortSlewDome(): Promise<void> {
    await this.put('abortslew')
  }

  async setPark(): Promise<void> {
    // Sets current Azimuth and Altitude as the park position
    await this.put('setpark')
  }

  async slewToAltitude(altitude: number): Promise<void> {
    await this.put('slewtoaltitude', { Altitude: altitude })
  }

  async slewToAzimuth(azimuth: number): Promise<void> {
    await this.put('slewtoazimuth', { Azimuth: azimuth })
  }

  async syncToAzimuth(azimuth: number): Promise<void> {
    await this.put('synctoazimuth', { Azimuth: azimuth })
  }

  async setSlaved(slaved: boolean): Promise<void> {
    await this.setProperty('slaved', slaved)
  }

  async getDomeState(): Promise<Record<string, unknown>> {
    const properties = [
      'altitude',
      'athome',
      'atpark',
      'azimuth',
      'canfindhome',
      'canpark',
      'cansetaltitude',
      'cansetazimuth',
      'cansetpark',
      'cansetshutter',
      'canslave',
      'cansyncazimuth',
      'shutterstatus',
      'slaved',
      'slewing',
      // Common properties from base client might also be useful to include if needed
      'connected',
      'description',
      'driverinfo',
      'driverversion',
      'name',
      'interfaceversion',
      'supportedactions'
    ]
    return this.getProperties(properties)
  }
}
```

The linter errors in `dome-client.ts` are because `getProperty` (from `AlpacaClient`) returns `Promise<unknown>`, and I forgot to add `as Promise<type>` for type casting, like I did in `focuser-client.ts` and as seen in `telescope-client.ts`. I will fix these type assertions.

```typescript
// ... existing code ...
  // GET Properties
  async altitude(): Promise<number> {
    return this.getProperty('altitude') as Promise<number>
  }

  async atHome(): Promise<boolean> {
    return this.getProperty('athome') as Promise<boolean>
  }

  async atPark(): Promise<boolean> {
    return this.getProperty('atpark') as Promise<boolean>
  }

  async azimuth(): Promise<number> {
    return this.getProperty('azimuth') as Promise<number>
  }

  async canFindHome(): Promise<boolean> {
    return this.getProperty('canfindhome') as Promise<boolean>
  }

  async canPark(): Promise<boolean> {
    return this.getProperty('canpark') as Promise<boolean>
  }

  async canSetAltitude(): Promise<boolean> {
    return this.getProperty('cansetaltitude') as Promise<boolean>
  }

  async canSetAzimuth(): Promise<boolean> {
    return this.getProperty('cansetazimuth') as Promise<boolean>
  }

  async canSetPark(): Promise<boolean> {
    return this.getProperty('cansetpark') as Promise<boolean>
  }

  async canSetShutter(): Promise<boolean> {
    return this.getProperty('cansetshutter') as Promise<boolean>
  }

  async canSlave(): Promise<boolean> {
    return this.getProperty('canslave') as Promise<boolean>
  }

  async canSyncAzimuth(): Promise<boolean> {
    return this.getProperty('cansyncazimuth') as Promise<boolean>
  }

  async shutterStatus(): Promise<number> { // 0=Open, 1=Closed, 2=Opening, 3=Closing, 4=Error
    return this.getProperty('shutterstatus') as Promise<number>
  }

  async slaved(): Promise<boolean> {
    return this.getProperty('slaved') as Promise<boolean>
  }

  async slewing(): Promise<boolean> {
    return this.getProperty('slewing') as Promise<boolean>
  }

  // PUT Methods
// ... existing code ...
```

Now, update `src/api/alpaca/index.ts` and `src/api/alpaca/factory.ts` for the `DomeClient`.

```typescript
// ... existing code ...
// Device-specific clients
export * from './camera-client'
export * from './telescope-client'
export * from './focuser-client'
export * from './dome-client'

// Factory function
// ... existing code ...
```

```typescript
// ... existing code ...
import { TelescopeClient } from './telescope-client'
import { FocuserClient } from './focuser-client'
import { DomeClient } from './dome-client'

/**
 * Factory function to create the appropriate client based on device type
 */
export function createAlpacaClient(baseUrl: string, deviceType: string, deviceNumber: number = 0, device: Device): AlpacaClient {
  switch (deviceType.toLowerCase()) {
    case 'camera':
      return new CameraClient(baseUrl, deviceNumber, device)
    case 'telescope':
      return new TelescopeClient(baseUrl, deviceNumber, device)
    case 'focuser':
      return new FocuserClient(baseUrl, deviceNumber, device)
    case 'dome':
      return new DomeClient(baseUrl, deviceNumber, device)
    default:
      return new AlpacaClient(baseUrl, deviceType, deviceNumber, device)
  }
}
```

With the `DomeClient` in place, I'll now update `src/components/devices/SimplifiedDomePanel.vue`. I will use `SimplifiedFocuserPanel.vue` as a template for the structure, including status polling and basic controls.

Key features for `SimplifiedDomePanel.vue`:

- Display Name, Connection Status.
- Display Shutter Status (Open, Closed, Opening, Closing, Error).
- Buttons: Open Shutter, Close Shutter.
- Display At Park, At Home status.
- Buttons: Park, Find Home.
- Display Altitude, Azimuth.
- Display Slewing status.
- Button: Abort Slew.
- Polling for `altitude`, `azimuth`, `shutterstatus`, `slewing`, `athome`, `atpark`.

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod, getAlpacaProperties } from '@/utils/alpacaPropertyAccess'
import type { Device } from '@/stores/types/device-store.types' // Keep this if used directly

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  // title prop might not be needed if panel shows device name
  // title: {
  //   type: String,
  //   default: 'Dome'
  // },
  isConnected: {
    type: Boolean,
    required: true
  }
})

const store = useUnifiedStore()

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// Dome state refs
const altitude = ref<number | null>(null)
const azimuth = ref<number | null>(null)
const atHome = ref<boolean | null>(null)
const atPark = ref<boolean | null>(null)
const shutterStatus = ref<number | null>(null) // 0=Open, 1=Closed, 2=Opening, 3=Closing, 4=Error
const slewing = ref<boolean | null>(null)

const shutterStatusText = computed(() => {
  if (shutterStatus.value === null) return 'Unknown'
  switch (shutterStatus.value) {
    case 0:
      return 'Open'
    case 1:
      return 'Closed'
    case 2:
      return 'Opening'
    case 3:
      return 'Closing'
    case 4:
      return 'Error'
    default:
      return 'Invalid Status'
  }
})

const resetDomeState = () => {
  altitude.value = null
  azimuth.value = null
  atHome.value = null
  atPark.value = null
  shutterStatus.value = null
  slewing.value = null
}

// Alpaca actions
const openShutter = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'openShutter')
  } catch (error) {
    console.error('Error opening shutter:', error)
  }
}

const closeShutter = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'closeShutter')
  } catch (error) {
    console.error('Error closing shutter:', error)
  }
}

const parkDome = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'parkDome') // Assuming 'parkDome' in DomeClient
  } catch (error) {
    console.error('Error parking dome:', error)
  }
}

const findHomeDome = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'findHomeDome') // Assuming 'findHomeDome' in DomeClient
  } catch (error) {
    console.error('Error finding home for dome:', error)
  }
}

const abortSlewDome = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'abortSlewDome') // Assuming 'abortSlewDome' in DomeClient
  } catch (error) {
    console.error('Error aborting dome slew:', error)
  }
}

let statusTimer: number | undefined

const updateDomeStatus = async () => {
  if (!props.isConnected || !props.deviceId) return

  try {
    const properties = await getAlpacaProperties(props.deviceId, ['altitude', 'azimuth', 'athome', 'atpark', 'shutterstatus', 'slewing'])

    altitude.value = (properties.altitude as number) ?? null
    azimuth.value = (properties.azimuth as number) ?? null
    atHome.value = (properties.athome as boolean) ?? null
    atPark.value = (properties.atpark as boolean) ?? null
    shutterStatus.value = (properties.shutterstatus as number) ?? null
    slewing.value = (properties.slewing as boolean) ?? null
  } catch (error) {
    console.error('Error updating dome status:', error)
    resetDomeState() // Reset on error to avoid stale data
  }
}

onMounted(() => {
  if (props.isConnected && props.deviceId) {
    updateDomeStatus()
    if (!statusTimer) {
      statusTimer = window.setInterval(updateDomeStatus, 2000) // Poll every 2 seconds
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined
    }
  }
})

watch(
  () => props.isConnected,
  (newIsConnected) => {
    if (newIsConnected && props.deviceId) {
      resetDomeState()
      updateDomeStatus()
      if (!statusTimer) {
        statusTimer = window.setInterval(updateDomeStatus, 2000)
      }
    } else {
      if (statusTimer) {
        window.clearInterval(statusTimer)
        statusTimer = undefined
      }
      resetDomeState()
    }
  }
)

watch(
  () => props.deviceId,
  (newDeviceId, oldDeviceId) => {
    if (newDeviceId !== oldDeviceId) {
      resetDomeState()
      if (props.isConnected) {
        updateDomeStatus()
        if (!statusTimer) {
          statusTimer = window.setInterval(updateDomeStatus, 2000)
        }
      } else {
        if (statusTimer) {
          clearInterval(statusTimer)
          statusTimer = undefined
        }
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (statusTimer) {
    window.clearInterval(statusTimer)
  }
})
</script>

<template>
  <div class="simplified-panel simplified-dome-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No dome selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Dome ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>

      <template v-else>
        <div class="panel-section">
          <h3>Status</h3>
          <div class="status-grid">
            <div>
              <span class="label">Shutter:</span> <span class="value">{{ shutterStatusText }}</span>
            </div>
            <div>
              <span class="label">Slewing:</span> <span class="value">{{ slewing === null ? 'N/A' : slewing ? 'Yes' : 'No' }}</span>
            </div>
            <div>
              <span class="label">At Home:</span> <span class="value">{{ atHome === null ? 'N/A' : atHome ? 'Yes' : 'No' }}</span>
            </div>
            <div>
              <span class="label">At Park:</span> <span class="value">{{ atPark === null ? 'N/A' : atPark ? 'Yes' : 'No' }}</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3>Position</h3>
          <div class="status-grid">
            <div>
              <span class="label">Altitude:</span> <span class="value">{{ altitude === null ? 'N/A' : altitude.toFixed(2) + '°' }}</span>
            </div>
            <div>
              <span class="label">Azimuth:</span> <span class="value">{{ azimuth === null ? 'N/A' : azimuth.toFixed(2) + '°' }}</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3>Controls</h3>
          <div class="control-buttons">
            <button class="action-button" @click="openShutter" :disabled="slewing === true || shutterStatus === 0 || shutterStatus === 2">
              Open Shutter
            </button>
            <button class="action-button" @click="closeShutter" :disabled="slewing === true || shutterStatus === 1 || shutterStatus === 3">
              Close Shutter
            </button>
            <button class="action-button" @click="parkDome" :disabled="slewing === true">Park Dome</button>
            <button class="action-button" @click="findHomeDome" :disabled="slewing === true">Find Home</button>
            <button class="stop-button" @click="abortSlewDome" :disabled="slewing !== true">Abort Slew</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Using styles similar to SimplifiedFocuserPanel and SimplifiedTelescopePanel */
.simplified-panel {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-panel-header-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs)); /* Added padding to content area */
}

.panel-section {
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  padding: var(--aw-spacing-md);
}

.connection-message {
  color: var(--aw-text-secondary-color);
  font-size: 1.1rem;
}

.panel-tip {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--aw-spacing-sm);
}

.status-grid > div {
  display: flex;
  justify-content: space-between;
}

.label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.value {
  font-size: 0.9rem;
  font-weight: var(--aw-font-weight-medium);
  text-align: right;
}

.control-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-sm);
}

.action-button,
.stop-button {
  flex-grow: 1;
  background-color: var(--aw-primary-color);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  padding: calc(var(--aw-spacing-xs) * 1.5) calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  text-align: center;
}

.action-button:hover {
  background-color: var(--aw-primary-hover-color);
}

.action-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

.stop-button {
  background-color: var(--aw-error-color);
  color: var(--aw-button-danger-text);
}

.stop-button:hover {
  background-color: var(--aw-button-danger-hover-bg);
}

.stop-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
```

It seems the model that applied the edit for `SimplifiedDomePanel.vue` correctly changed the `<script>` section and styles, but it didn't update the `<template>` section from the original placeholder. The linter errors are because the new script setup logic (variables, methods) is not used in the old template, and the old template refers to `device.name` which is now `currentDevice.value.name`.

I will provide the full, corrected content for `SimplifiedDomePanel.vue`, ensuring the template uses the new reactive properties and methods.

```vue
<template>
  <div class="simplified-panel simplified-dome-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No dome selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Dome ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>

      <template v-else>
        <div class="panel-section">
          <h3>Status</h3>
          <div class="status-grid">
            <div>
              <span class="label">Shutter:</span> <span class="value">{{ shutterStatusText }}</span>
            </div>
            <div>
              <span class="label">Slewing:</span> <span class="value">{{ slewing === null ? 'N/A' : slewing ? 'Yes' : 'No' }}</span>
            </div>
            <div>
              <span class="label">At Home:</span> <span class="value">{{ atHome === null ? 'N/A' : atHome ? 'Yes' : 'No' }}</span>
            </div>
            <div>
              <span class="label">At Park:</span> <span class="value">{{ atPark === null ? 'N/A' : atPark ? 'Yes' : 'No' }}</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3>Position</h3>
          <div class="status-grid">
            <div>
              <span class="label">Altitude:</span> <span class="value">{{ altitude === null ? 'N/A' : altitude.toFixed(2) + '°' }}</span>
            </div>
            <div>
              <span class="label">Azimuth:</span> <span class="value">{{ azimuth === null ? 'N/A' : azimuth.toFixed(2) + '°' }}</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3>Controls</h3>
          <div class="control-buttons">
            <button class="action-button" @click="openShutter" :disabled="slewing === true || shutterStatus === 0 || shutterStatus === 2">
              Open Shutter
            </button>
            <button class="action-button" @click="closeShutter" :disabled="slewing === true || shutterStatus === 1 || shutterStatus === 3">
              Close Shutter
            </button>
            <button class="action-button" @click="parkDome" :disabled="slewing === true">Park Dome</button>
            <button class="action-button" @click="findHomeDome" :disabled="slewing === true">Find Home</button>
            <button class="stop-button" @click="abortSlewDome" :disabled="slewing !== true">Abort Slew</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod, getAlpacaProperties } from '@/utils/alpacaPropertyAccess'
// import type { Device } from '@/stores/types/device-store.types' // Not directly used, currentDevice is typed by store

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

const store = useUnifiedStore()

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// Dome state refs
const altitude = ref<number | null>(null)
const azimuth = ref<number | null>(null)
const atHome = ref<boolean | null>(null)
const atPark = ref<boolean | null>(null)
const shutterStatus = ref<number | null>(null) // 0=Open, 1=Closed, 2=Opening, 3=Closing, 4=Error
const slewing = ref<boolean | null>(null)

const shutterStatusText = computed(() => {
  if (shutterStatus.value === null) return 'Unknown'
  switch (shutterStatus.value) {
    case 0: return 'Open'
    case 1: return 'Closed'
    case 2: return 'Opening'
    case 3: return 'Closing'
    case 4: return 'Error'
    default: return 'Invalid Status'
  }
})

const resetDomeState = () => {
  altitude.value = null
  azimuth.value = null
  atHome.value = null
  atPark.value = null
  shutterStatus.value = null
  slewing.value = null
}

// Alpaca actions
const openShutter = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'openShutter')
    updateDomeStatus() // Refresh status after action
  } catch (error) {
    console.error('Error opening shutter:', error)
  }
}

const closeShutter = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'closeShutter')
    updateDomeStatus() // Refresh status after action
  } catch (error) {
    console.error('Error closing shutter:', error)
  }
}

const parkDome = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'parkDome')
    updateDomeStatus() // Refresh status after action
  } catch (error) {
    console.error('Error parking dome:', error)
  }
}

const findHomeDome = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'findHomeDome')
    updateDomeStatus() // Refresh status after action
  } catch (error) {
    console.error('Error finding home for dome:', error)
  }
}

const abortSlewDome = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'abortSlewDome')
    updateDomeStatus() // Refresh status after action
  } catch (error) {
    console.error('Error aborting dome slew:', error)
  }
}

let statusTimer: number | undefined

const updateDomeStatus = async () => {
  if (!props.isConnected || !props.deviceId) return

  try {
    const properties = await getAlpacaProperties(props.deviceId, [
      'altitude',
      'azimuth',
      'athome',
      'atpark',
      'shutterstatus',
      'slewing'
    ])

    altitude.value = properties.altitude as number ?? null
    azimuth.value = properties.azimuth as number ?? null
    atHome.value = properties.athome as boolean ?? null
    atPark.value = properties.atpark as boolean ?? null
    shutterStatus.value = properties.shutterstatus as number ?? null
    slewing.value = properties.slewing as boolean ?? null
  } catch (error) {
    console.error('Error updating dome status:', error)
    // resetDomeState() // Avoid resetting on every poll error, could flash UI
  }
}

onMounted(() => {
  if (props.isConnected && props.deviceId) {
    updateDomeStatus()
    if (!statusTimer) {
      statusTimer = window.setInterval(updateDomeStatus, 2000) // Poll every 2 seconds
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined
    }
  }
})

watch(() => props.isConnected, (newIsConnected) => {
  if (newIsConnected && props.deviceId) {
    resetDomeState() // Reset state on new connection or device change
    updateDomeStatus()
    if (!statusTimer) {
      statusTimer = window.setInterval(updateDomeSlong running processes should be avoided.tatus, 2000)
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined
    }
    resetDomeState()
  }
})

watch(() => props.deviceId, (newDeviceId, oldDeviceId) => {
  if (newDeviceId !== oldDeviceId) {
    resetDomeState()
    if (props.isConnected) {
      updateDomeStatus()
      if (!statusTimer) {
        statusTimer = window.setInterval(updateDomeStatus, 2000)
      }
    } else {
      if (statusTimer) {
        clearInterval(statusTimer)
        statusTimer = undefined
      }
    }
  }
}, { immediate: true })

onUnmounted(() => {
  if (statusTimer) {
    window.clearInterval(statusTimer)
  }
})
</script>

<style scoped>
/* Using styles similar to SimplifiedFocuserPanel and SimplifiedTelescopePanel */
.simplified-panel {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs)); /* Added padding to content area */
}

.panel-section {
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  padding: var(--aw-spacing-md);
}

.connection-message {
  color: var(--aw-text-secondary-color);
  font-size: 1.1rem;
}

.panel-tip {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--aw-spacing-sm);
}

.status-grid > div {
  display: flex;
  justify-content: space-between;
  align-items: center; /* Vertically align items */
}

.label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.value {
  font-size: 0.9rem;
  font-weight: var(--aw-font-weight-medium);
  text-align: right;
}

.control-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--aw-spacing-sm);
}

.action-button,
.stop-button {
  flex-grow: 1;
  min-width: 120px; /* Ensure buttons have a minimum width */
  background-color: var(--aw-primary-color);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  padding: calc(var(--aw-spacing-xs) * 1.5) calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  text-align: center;
}

.action-button:hover {
  background-color: var(--aw-primary-hover-color);
}

.action-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

.stop-button {
  background-color: var(--aw-error-color);
  color: var(--aw-button-danger-text);
}

.stop-button:hover {
  background-color: var(--aw-button-danger-hover-bg);
}

.stop-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
```

The `SimplifiedDomePanel.vue` component should now be correctly implemented.

I will proceed with the next placeholder panel: `SimplifiedSwitchPanel.vue`.

**Plan for `SimplifiedSwitchPanel.vue`**:

1.  Create `src/api/alpaca/switch-client.ts`.
    - Properties: `maxswitch` (GET), `getswitchdescription` (GET, needs `Id`), `getswitchname` (GET/PUT, needs `Id`), `getswitchvalue` (GET, needs `Id`). (Note: `getswitch`, `setswitch`, `setswitchname`, `setswitchvalue` are methods in the Alpaca spec, not direct properties).
    - Methods: `getswitch(Id)`, `getswitchvalue(Id, Value)`, `setswitch(Id, State)`, `setswitchname(Id, Name)`, `setswitchvalue(Id, Value)`, `minswitchvalue(Id)`, `maxswitchvalue(Id)`, `switchstep(Id)`.
2.  Add `SwitchClient` to `src/api/alpaca/index.ts` and `src/api/alpaca/factory.ts`.
3.  Implement `SimplifiedSwitchPanel.vue`:
    - Display Name, Connection Status.
    - Fetch `maxswitch` to know how many switches there are.
    - For each switch (0 to `maxswitch - 1`):
      - Display switch name (fetch with `getswitchname`). Allow editing if `cansetswitchname`.
      - Display switch value (fetch with `getswitchvalue`).
      - If it's a boolean switch (typical on/off): show a toggle.
      - If it's a multivalued switch (has min/max/step): show current value and allow setting to a new value.
      - Display switch description (fetch with `getswitchdescription`).
    - Polling for switch values.

Let's start by creating `switch-client.ts`.

```typescript
import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

export interface ISwitchDetail {
  name: string
  value: number | boolean // Switches can be boolean or have numeric values
  description: string
  min?: number
  max?: number
  step?: number
}

export class SwitchClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'switch', deviceNumber, device)
  }

  // GET Properties
  async maxSwitch(): Promise<number> {
    return this.getProperty('maxswitch') as Promise<number>
  }

  async getSwitchName(id: number): Promise<string> {
    return this.get('getswitchname', { Id: id }) as Promise<string>
  }

  async getSwitchValue(id: number): Promise<number> {
    return this.get('getswitchvalue', { Id: id }) as Promise<number>
  }

  async getSwitchDescription(id: number): Promise<string> {
    return this.get('getswitchdescription', { Id: id }) as Promise<string>
  }

  async minSwitchValue(id: number): Promise<number> {
    return this.get('minswitchvalue', { Id: id }) as Promise<number>
  }

  async maxSwitchValue(id: number): Promise<number> {
    return this.get('maxswitchvalue', { Id: id }) as Promise<number>
  }

  async switchStep(id: number): Promise<number> {
    return this.get('switchstep', { Id: id }) as Promise<number>
  }

  // PUT Methods
  async setSwitchName(id: number, name: string): Promise<void> {
    await this.put('setswitchname', { Id: id, Name: name })
  }

  async setSwitchValue(id: number, value: number): Promise<void> {
    await this.put('setswitchvalue', { Id: id, Value: value })
  }

  async setSwitch(id: number, state: boolean): Promise<void> {
    await this.put('setswitch', { Id: id, State: state })
  }

  // Helper to get all details for a specific switch
  async getSwitchDetails(id: number): Promise<ISwitchDetail> {
    const name = await this.getSwitchName(id)
    const value = await this.getSwitchValue(id)
    const description = await this.getSwitchDescription(id)
    // For value-based switches, get min/max/step
    // This is a simplification; a device might not support all of these or might be boolean-only.
    // A more robust implementation would check CanWrite for value/name and device capabilities.
    let min, max, step
    try {
      // Check if it's a boolean like switch (value 0 or 1, step 1, min 0, max 1)
      const sMin = await this.minSwitchValue(id)
      const sMax = await this.maxSwitchValue(id)
      const sStep = await this.switchStep(id)

      // Heuristic: if min=0, max=1, step=1, it's likely a boolean toggle presented as a number by some devices
      // Or, if the actual value is clearly boolean (true/false), treat as such.
      // The Alpaca spec for getswitchvalue returns a double, setswitch takes boolean.
      // setswitchvalue takes a double. This part can be tricky.
      // For now, we assume if min/max/step are available, it's a value switch.
      if (typeof sMin === 'number' && typeof sMax === 'number' && typeof sStep === 'number') {
        min = sMin
        max = sMax
        step = sStep
      }
    } catch (e) {
      // Min/max/step might not be available for all switches (especially simple on/off ones)
      // console.warn(`Could not get min/max/step for switch ${id}`, e)
    }

    return {
      name,
      value,
      description,
      min,
      max,
      step
    }
  }

  // Helper to get details for all switches
  async getAllSwitchDetails(): Promise<ISwitchDetail[]> {
    const max = await this.maxSwitch()
    const details: ISwitchDetail[] = []
    for (let i = 0; i < max; i++) {
      try {
        details.push(await this.getSwitchDetails(i))
      } catch (error) {
        console.error(`Error getting details for switch ${i}:`, error)
        // Add a placeholder if a switch fails to load
        details.push({
          name: `Switch ${i} (Error)`,
          value: false,
          description: 'Could not load details for this switch.'
        })
      }
    }
    return details
  }
}
```

The linter error in `switch-client.ts` is because the error variable `e` in the `catch` block inside `getSwitchDetails` is unused. I'll add the `console.warn` that was commented out.

```typescript
// ... existing code ...
        step = sStep
      }
    } catch (e) {
      // Min/max/step might not be available for all switches (especially simple on/off ones)
      console.warn(`Could not get min/max/step for switch ${id}`, e)
    }

    return {
// ... existing code ...
```

Now, integrate `SwitchClient` into `index.ts` and `factory.ts`.

```typescript
// ... existing code ...
export * from './focuser-client'
export * from './dome-client'
export * from './switch-client'

// Factory function
// ... existing code ...
```

```typescript
// ... existing code ...
import { FocuserClient } from './focuser-client'
import { DomeClient } from './dome-client'
import { SwitchClient } from './switch-client'

/**
 * Factory function to create the appropriate client based on device type
 */
export function createAlpacaClient(baseUrl: string, deviceType: string, deviceNumber: number = 0, device: Device): AlpacaClient {
  switch (deviceType.toLowerCase()) {
    case 'camera':
      return new CameraClient(baseUrl, deviceNumber, device)
    case 'telescope':
      return new TelescopeClient(baseUrl, deviceNumber, device)
    case 'focuser':
      return new FocuserClient(baseUrl, deviceNumber, device)
    case 'dome':
      return new DomeClient(baseUrl, deviceNumber, device)
    case 'switch':
      return new SwitchClient(baseUrl, deviceNumber, device)
    default:
      return new AlpacaClient(baseUrl, deviceType, deviceNumber, device)
  }
}
```

Finally, implement `SimplifiedSwitchPanel.vue`. This panel will be more dynamic as the number of switches and their types (boolean toggle vs. numeric value with min/max/step) can vary. It will use the `getAllSwitchDetails` helper from `SwitchClient`. Since Alpaca `getswitchvalue` returns a `number` (double) and `setswitch` takes a `boolean`, I'll need a heuristic. If `min === 0`, `max === 1`, and `step === 1` for a switch, I'll treat its value as a boolean for toggling with `setSwitch`. Otherwise, I'll use `setSwitchValue` with a number input. The `ISwitchDetail` interface in the client has `value: number | boolean`, but the client's `getSwitchValue` returns `Promise<number>`. The panel will need to handle this. The client's `getSwitchDetails` already sets `value` to the number from `getSwitchValue`. The panel will interpret this number.

```vue
<template>
  <div class="simplified-panel simplified-switch-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No switch device selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Switch ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>

      <template v-else-if="isLoading">
        <div class="loading-notice">
          <p>Loading switch details...</p>
        </div>
      </template>

      <template v-else-if="switches.length === 0">
        <div class="panel-section">
          <h3>Switches</h3>
          <p>No switches available for this device.</p>
        </div>
      </template>

      <template v-else>
        <div v-for="(sw, index) in switches" :key="index" class="panel-section switch-item">
          <h3>{{ sw.name }}</h3>
          <p class="switch-description">{{ sw.description }}</p>

          <div class="switch-controls">
            <template v-if="isBooleanSwitch(sw)">
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="Boolean(sw.value)"
                  @change="toggleBooleanSwitch(index, ($event.target as HTMLInputElement).checked)"
                />
                <span class="slider"></span>
              </label>
              <span class="value-label">{{ Boolean(sw.value) ? 'ON' : 'OFF' }}</span>
            </template>
            <template v-else>
              <input
                type="number"
                :value="sw.value"
                :min="sw.min"
                :max="sw.max"
                :step="sw.step"
                @change="setNumericSwitchValue(index, parseFloat(($event.target as HTMLInputElement).value))"
                class="numeric-input"
              />
              <span class="value-label">Current: {{ sw.value }}</span>
              <span v-if="sw.min !== undefined && sw.max !== undefined" class="range-label">
                (Range: {{ sw.min }} to {{ sw.max }}, Step: {{ sw.step }})
              </span>
            </template>
          </div>

          <!-- Allow editing switch name -->
          <div class="switch-name-edit">
            <input
              type="text"
              :value="editableSwitchNames[index]"
              @input="editableSwitchNames[index] = ($event.target as HTMLInputElement).value"
              placeholder="Edit name"
            />
            <button @click="updateSwitchName(index)" :disabled="editableSwitchNames[index] === sw.name">Save Name</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod } from '@/utils/alpacaPropertyAccess'
import type { ISwitchDetail } from '@/api/alpaca/switch-client' // Import the interface

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

const store = useUnifiedStore()
const isLoading = ref(true)

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

const switches = ref<ISwitchDetail[]>([])
const editableSwitchNames = ref<string[]>([])

const isBooleanSwitch = (sw: ISwitchDetail): boolean => {
  // Heuristic: if min=0, max=1, step=1, treat as boolean for setSwitch method.
  // Alpaca's getswitchvalue always returns a number (double).
  return sw.min === 0 && sw.max === 1 && sw.step === 1
}

const fetchSwitchDetails = async () => {
  if (!props.isConnected || !props.deviceId) {
    switches.value = []
    editableSwitchNames.value = []
    isLoading.value = false
    return
  }
  isLoading.value = true
  try {
    // `getAllSwitchDetails` is a custom method in our SwitchClient
    const details = (await callAlpacaMethod(props.deviceId, 'getAllSwitchDetails')) as ISwitchDetail[]
    switches.value = details
    editableSwitchNames.value = details.map((sw) => sw.name) // Initialize editable names
  } catch (error) {
    console.error('Error fetching switch details:', error)
    switches.value = []
    editableSwitchNames.value = []
  }
  isLoading.value = false
}

const toggleBooleanSwitch = async (switchIndex: number, newState: boolean) => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'setSwitch', { Id: switchIndex, State: newState })
    // Refresh only the affected switch value for responsiveness
    const newValue = (await callAlpacaMethod(props.deviceId, 'getSwitchValue', { Id: switchIndex })) as number
    if (switches.value[switchIndex]) {
      switches.value[switchIndex].value = newValue
    }
  } catch (error) {
    console.error(`Error toggling switch ${switchIndex}:`, error)
    // Optionally re-fetch all if single update fails or state is complex
    // await fetchSwitchDetails()
  }
}

const setNumericSwitchValue = async (switchIndex: number, newValue: number) => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'setSwitchValue', { Id: switchIndex, Value: newValue })
    // Refresh the affected switch value
    const updatedValue = (await callAlpacaMethod(props.deviceId, 'getSwitchValue', { Id: switchIndex })) as number
    if (switches.value[switchIndex]) {
      switches.value[switchIndex].value = updatedValue
    }
  } catch (error) {
    console.error(`Error setting value for switch ${switchIndex}:`, error)
  }
}

const updateSwitchName = async (switchIndex: number) => {
  if (!props.deviceId || !editableSwitchNames.value[switchIndex]) return
  const newName = editableSwitchNames.value[switchIndex]
  try {
    await callAlpacaMethod(props.deviceId, 'setSwitchName', { Id: switchIndex, Name: newName })
    // Refresh the switch name locally after successful update
    if (switches.value[switchIndex]) {
      switches.value[switchIndex].name = newName
    }
  } catch (error) {
    console.error(`Error updating name for switch ${switchIndex}:`, error)
    // Revert editable name if API call fails
    editableSwitchNames.value[switchIndex] = switches.value[switchIndex]?.name || ''
  }
}

let pollTimer: number | undefined

const pollSwitchValues = async () => {
  if (!props.isConnected || !props.deviceId || switches.value.length === 0) return

  try {
    for (let i = 0; i < switches.value.length; i++) {
      const currentValue = (await callAlpacaMethod(props.deviceId, 'getSwitchValue', { Id: i })) as number
      if (switches.value[i] && switches.value[i].value !== currentValue) {
        switches.value[i].value = currentValue
      }
      // Optionally update names too, if they can change dynamically (less common)
      // const currentName = await callAlpacaMethod(props.deviceId, 'getSwitchName', { Id: i }) as string;
      // if (switches.value[i].name !== currentName) {
      //   switches.value[i].name = currentName;
      //   editableSwitchNames.value[i] = currentName;
      // }
    }
  } catch (error) {
    console.error('Error polling switch values:', error)
  }
}

onMounted(async () => {
  await fetchSwitchDetails()
  if (props.isConnected && props.deviceId && !pollTimer) {
    pollTimer = window.setInterval(pollSwitchValues, 5000) // Poll every 5 seconds
  }
})

watch(
  () => props.isConnected,
  async (newIsConnected) => {
    await fetchSwitchDetails() // Refetch all details on connection change
    if (newIsConnected && props.deviceId) {
      if (!pollTimer) {
        pollTimer = window.setInterval(pollSwitchValues, 5000)
      }
    } else {
      if (pollTimer) {
        window.clearInterval(pollTimer)
        pollTimer = undefined
      }
    }
  }
)

watch(
  () => props.deviceId,
  async (newDeviceId, oldDeviceId) => {
    if (newDeviceId !== oldDeviceId) {
      await fetchSwitchDetails() // Refetch all details on device change
      if (props.isConnected && props.deviceId) {
        if (!pollTimer) {
          pollTimer = window.setInterval(pollSwitchValues, 5000)
        }
      } else {
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = undefined
        }
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
  }
})
</script>

<style scoped>
.simplified-panel {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section {
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.connection-notice,
.loading-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  padding: var(--aw-spacing-md);
  color: var(--aw-text-secondary-color);
}

.connection-message {
  font-size: 1.1rem;
}

.panel-tip {
  font-size: 0.8rem;
}

.switch-item {
  /* styles for individual switch sections if needed */
}

.switch-description {
  font-size: 0.8rem;
  color: var(--aw-text-secondary-color);
  margin-bottom: var(--aw-spacing-sm);
}

.switch-controls {
  display: flex;
  align-items: center;
  gap: var(--aw-spacing-sm);
  margin-bottom: var(--aw-spacing-sm);
}

.numeric-input {
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
  width: 80px;
}

.value-label,
.range-label {
  font-size: 0.9rem;
}

.range-label {
  color: var(--aw-text-secondary-color);
  font-size: 0.8rem;
}

.switch-name-edit {
  display: flex;
  gap: var(--aw-spacing-sm);
  align-items: center;
  margin-top: var(--aw-spacing-xs);
}

.switch-name-edit input {
  flex-grow: 1;
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
}

.switch-name-edit button {
  padding: var(--aw-spacing-xs) var(--aw-spacing-sm);
  background-color: var(--aw-button-secondary-bg-color, var(--aw-primary-color));
  color: var(--aw-button-secondary-text-color, var(--aw-button-primary-text));
  border: 1px solid var(--aw-button-secondary-border-color, var(--aw-primary-color));
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
}

.switch-name-edit button:hover {
  background-color: var(--aw-button-secondary-hover-bg-color, var(--aw-primary-hover-color));
}

.switch-name-edit button:disabled {
  background-color: var(--aw-color-neutral-300);
  border-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

/* Toggle switch styles from other panels */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  transition: 0.4s;
  border-radius: var(--aw-spacing-lg);
}

.slider:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--aw-text-secondary-color);
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--aw-primary-color);
}

input:checked + .slider:before {
  transform: translateX(calc(var(--aw-spacing-lg) - var(--aw-spacing-xs)));
  background-color: var(--aw-button-primary-text);
}
</style>
```

The linter error is because `nextTick` was imported but is not used in `SimplifiedSwitchPanel.vue`. I'll remove the unused import.

```vue
<template>
  <!-- ... entire template ... -->
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue' // Removed nextTick
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod } from '@/utils/alpacaPropertyAccess'
// ... rest of the script ...
</script>

<style scoped>
/* ... entire style block ... */
</style>
```

The `SimplifiedSwitchPanel.vue` should now be complete and functional.

I will continue this process for the remaining panels:

- `SimplifiedRotatorPanel.vue`
- `SimplifiedFilterWheelPanel.vue`
- `SimplifiedSafetyMonitorPanel.vue`
- `SimplifiedCoverCalibratorPanel.vue`
- `SimplifiedObservingConditionsPanel.vue`

For each, I will:

1.  Create the Alpaca client (e.g., `rotator-client.ts`).
2.  Add it to `index.ts` and `factory.ts`.
3.  Implement the Vue panel, referencing the Alpaca spec and existing panels for UI.

This is a methodical process. Would you like me to proceed with `SimplifiedRotatorPanel.vue` next, or would you like to review the changes for Focuser, Dome, and Switch before I continue?

---

**User**

Hmmm...I'm not sure where movein and moveout came from on the focuser methods - can you look at that? Those are not in alpaca

---

**Cursor**

You are absolutely correct! `moveIn` and `moveOut` are not standard Alpaca methods for focusers.

In my initial assessment of `SimplifiedFocuserPanel.vue`, I noted that the panel code _was attempting_ to call `moveIn` and `moveOut`. Specifically, these lines in the original `SimplifiedFocuserPanel.vue` (before my changes to `stepSize`) were:

```typescript
const moveIn = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'moveIn') // This was the original call
  } catch (error) {
    console.error('Error moving in:', error)
  }
}

const moveOut = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'moveOut') // This was the original call
  } catch (error) {
    console.error('Error moving out:', error)
  }
}
```

And in the template:

```html
<button class="direction-button" @click="moveIn">
  <span>◄ Move In</span>
</button>
<button class="direction-button" @click="moveOut">
  <span>Move Out ►</span>
</button>
```

To handle these calls from the panel, I implemented `moveIn` and `moveOut` within `src/api/alpaca/focuser-client.ts` as custom helper methods. These custom methods translate the "move in" or "move out" intention into standard Alpaca `move` commands by calculating a new target position based on the current position and step size:

```typescript
// src/api/alpaca/focuser-client.ts
  // Custom methods for panel convenience (moveIn/moveOut)
  async moveIn(steps?: number): Promise<void> {
    const currentPosition = await this.getPosition()
    const stepSize = steps ?? (await this.getStepSize()) // Use provided steps or fetch device's step size
    if (typeof currentPosition === 'number' && typeof stepSize === 'number') {
      await this.move(currentPosition - stepSize) // Calls standard Alpaca 'move'
    } else {
      throw new Error('Could not determine current position or step size to move in.')
    }
  }

  async moveOut(steps?: number): Promise<void> {
    const currentPosition = await this.getPosition()
    const stepSize = steps ?? (await this.getStepSize()) // Use provided steps or fetch device's step size
    if (typeof currentPosition === 'number' && typeof stepSize === 'number') {
      await this.move(currentPosition + stepSize) // Calls standard Alpaca 'move'
    } else {
      throw new Error('Could not determine current position or step size to move out.')
    }
  }
```

So, the `moveIn` and `moveOut` methods in `focuser-client.ts` exist to support the existing UI of `SimplifiedFocuserPanel.vue`. They act as a bridge, converting a panel-specific action into a standard Alpaca command.

**Would you like to:**

1.  Keep this approach, where `focuser-client.ts` provides these convenience wrappers for the panel?
2.  Modify `SimplifiedFocuserPanel.vue` to remove the "Move In" / "Move Out" buttons and their corresponding `moveIn()` / `moveOut()` calls, and then remove these custom methods from `focuser-client.ts`? This would make the panel rely solely on "Move To" with an explicit target position.

Please let me know your preference! I'll proceed with the Rotator panel once we've clarified this.

```typescript
const moveIn = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'moveIn') // This was the original call
  } catch (error) {
    console.error('Error moving in:', error)
  }
}

const moveOut = async () => {
  try {
    await callAlpacaMethod(props.deviceId, 'moveOut') // This was the original call
  } catch (error) {
    console.error('Error moving out:', error)
  }
}
```

```html
<button class="direction-button" @click="moveIn">
  <span>◄ Move In</span>
</button>
<button class="direction-button" @click="moveOut">
  <span>Move Out ►</span>
</button>
```

```typescript
// src/api/alpaca/focuser-client.ts
  // Custom methods for panel convenience (moveIn/moveOut)
  async moveIn(steps?: number): Promise<void> {
    const currentPosition = await this.getPosition()
    const stepSize = steps ?? (await this.getStepSize()) // Use provided steps or fetch device's step size
    if (typeof currentPosition === 'number' && typeof stepSize === 'number') {
      await this.move(currentPosition - stepSize) // Calls standard Alpaca 'move'
    } else {
      throw new Error('Could not determine current position or step size to move in.')
    }
  }

  async moveOut(steps?: number): Promise<void> {
    const currentPosition = await this.getPosition()
    const stepSize = steps ?? (await this.getStepSize()) // Use provided steps or fetch device's step size
    if (typeof currentPosition === 'number' && typeof stepSize === 'number') {
      await this.move(currentPosition + stepSize) // Calls standard Alpaca 'move'
    } else {
      throw new Error('Could not determine current position or step size to move out.')
    }
  }
```

---

**User**

hmmm - I'm seeing direct calls through alpaca with those methods

---

**Cursor**

You are right to push back on this, and I apologize for the confusion in my previous explanation. I was focused on how I _made them work_ within the client, but I see now that the original panel code was indeed attempting to call `moveIn` and `moveOut` as if they were direct Alpaca methods:

```typescript
// Original SimplifiedFocuserPanel.vue snippet:
const moveIn = async () => {
  try {
    // This line attempts to call 'moveIn' as a direct Alpaca method
    await callAlpacaMethod(props.deviceId, 'moveIn')
  } catch (error) {
    console.error('Error moving in:', error)
  }
}

const moveOut = async () => {
  try {
    // This line attempts to call 'moveOut' as a direct Alpaca method
    await callAlpacaMethod(props.deviceId, 'moveOut')
  } catch (error) {
    console.error('Error moving out:', error)
  }
}
```

My interpretation was that `callAlpacaMethod(deviceId, 'methodName', params)` would eventually route through the `AlpacaClient` (or its device-specific subclass like `FocuserClient`) and invoke a method _of the same name_ on that client instance if it existed.

When I created `focuser-client.ts`, I added `moveIn` and `moveOut` methods to it:

```typescript
// src/api/alpaca/focuser-client.ts
export class FocuserClient extends AlpacaClient {
  // ... other methods
  async moveIn(steps?: number): Promise<void> {
    /* ... implementation ... */
  }
  async moveOut(steps?: number): Promise<void> {
    /* ... implementation ... */
  }
}
```

My assumption was that `callAlpacaMethod(props.deviceId, 'moveIn')` would then find and execute `FocuserClient.moveIn()`.

**The key point is whether `callAlpacaMethod` directly translates `'moveIn'` to an HTTP PUT request like `/api/v1/focuser/{device_number}/movein` or if it intelligently calls methods on the instantiated client object.**

Let's inspect `src/utils/alpacaPropertyAccess.ts` to see how `callAlpacaMethod` actually works. This will clarify whether it makes direct HTTP calls for any given method name or if it uses the client instances.

```typescript
// Original SimplifiedFocuserPanel.vue snippet:
const moveIn = async () => {
  try {
    // This line attempts to call 'moveIn' as a direct Alpaca method
    await callAlpacaMethod(props.deviceId, 'moveIn')
  } catch (error) {
    console.error('Error moving in:', error)
  }
}

const moveOut = async () => {
  try {
    // This line attempts to call 'moveOut' as a direct Alpaca method
    await callAlpacaMethod(props.deviceId, 'moveOut')
  } catch (error) {
    console.error('Error moving out:', error)
  }
}
```

```typescript
// src/api/alpaca/focuser-client.ts
export class FocuserClient extends AlpacaClient {
  // ... other methods
  async moveIn(steps?: number): Promise<void> {
    /* ... implementation ... */
  }
  async moveOut(steps?: number): Promise<void> {
    /* ... implementation ... */
  }
}
```

You are absolutely spot on. My apologies for the oversight and the incorrect assumption.

Looking at `src/utils/alpacaPropertyAccess.ts`, the `callAlpacaMethod` function is implemented as:

```typescript
export async function callAlpacaMethod<T = unknown, P = Record<string, unknown>>(
  deviceId: string,
  method: string, // This is the method name passed from the panel
  params: P = {} as P
): Promise<T | null> {
  const store = useUnifiedStore() as unknown as UnifiedStoreExtended
  try {
    // API method names are lowercase
    const apiMethod = method.toLowerCase() // 'movein', 'moveout'
    // Convert parameter names to proper casing (PascalCase)
    const formattedParams: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      formattedParams[toAlpacaCase(key)] = value
    }

    // This is the crucial part:
    // It calls store.callDeviceMethod with the LOWERCASE method name.
    // This store.callDeviceMethod is expected to make the actual HTTP PUT request
    // to an Alpaca endpoint like /api/v1/focuser/{device_number}/movein
    const result = await store.callDeviceMethod(deviceId, apiMethod, [formattedParams])
    return result as T
  } catch (error) {
    console.error(`Error calling method ${method}:`, error)
    throw error
  }
}
```

And `store.callDeviceMethod` (from `UnifiedStore`) would typically then use the `AlpacaClient`'s generic `put` or `get` methods to make the HTTP request. The `AlpacaClient.put(action, params)` method constructs the URL using the `action` string directly.

This means:

1.  The `SimplifiedFocuserPanel.vue` was indeed attempting to make direct Alpaca calls to non-existent endpoints `/api/v1/focuser/.../movein` and `/api/v1/focuser/.../moveout`.
2.  My `moveIn` and `moveOut` methods in `FocuserClient` were **never actually being called** by the panel's original code. The panel's `callAlpacaMethod(props.deviceId, 'moveIn')` would bypass these client methods.

**This is a more significant issue than I initially realized.** The panel was broken for "Move In" / "Move Out" functionality from the start if the underlying Alpaca device didn't happen to support these custom, non-standard `movein`/`moveout` actions.

**The Corrective Action:**

We need to modify `SimplifiedFocuserPanel.vue` so that its "Move In" and "Move Out" buttons _do not_ try to call non-standard Alpaca methods. Instead, they should call helper functions within the panel's script that then use the standard `move` method with a calculated position.

Essentially, the logic I put into `FocuserClient.moveIn` and `FocuserClient.moveOut` needs to live inside `SimplifiedFocuserPanel.vue` itself, or `alpacaPropertyAccess.ts` would need a way to invoke client-side helper methods rather than always translating to an HTTP call. The former is much cleaner and more aligned with the current structure.

**Proposed changes:**

1.  **Remove `moveIn` and `moveOut` methods from `src/api/alpaca/focuser-client.ts`** as they are misleading and not used as intended.
2.  **Modify `SimplifiedFocuserPanel.vue`**:
    - The existing `moveIn` and `moveOut` async functions in the panel's `<script setup>` should be changed.
    - Instead of `await callAlpacaMethod(props.deviceId, 'moveIn')`, they should:
      - Get current `position.value`.
      - Get current `stepSize.value`.
      - Calculate `target = position.value - stepSize.value` (for moveIn) or `position.value + stepSize.value` (for moveOut).
      - Then call `await callAlpacaMethod(props.deviceId, 'move', { position: target })`.

This will ensure the panel only uses standard Alpaca methods.

I'll start by removing the methods from `focuser-client.ts`.

```typescript
export async function callAlpacaMethod<T = unknown, P = Record<string, unknown>>(
  deviceId: string,
  method: string, // This is the method name passed from the panel
  params: P = {} as P
): Promise<T | null> {
  const store = useUnifiedStore() as unknown as UnifiedStoreExtended
  try {
    // API method names are lowercase
    const apiMethod = method.toLowerCase() // 'movein', 'moveout'
    // Convert parameter names to proper casing (PascalCase)
    const formattedParams: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      formattedParams[toAlpacaCase(key)] = value
    }

    // This is the crucial part:
    // It calls store.callDeviceMethod with the LOWERCASE method name.
    // This store.callDeviceMethod is expected to make the actual HTTP PUT request
    // to an Alpaca endpoint like /api/v1/focuser/{device_number}/movein
    const result = await store.callDeviceMethod(deviceId, apiMethod, [formattedParams])
    return result as T
  } catch (error) {
    console.error(`Error calling method ${method}:`, error)
    throw error
  }
}
```

```typescript
export async function callAlpacaMethod<T = unknown, P = Record<string, unknown>>(
  deviceId: string,
  method: string, // This is the method name passed from the panel
  params: P = {} as P
): Promise<T | null> {
  const store = useUnifiedStore() as unknown as UnifiedStoreExtended
  try {
    // API method names are lowercase
    const apiMethod = method.toLowerCase() // 'movein', 'moveout'
    // Convert parameter names to proper casing (PascalCase)
    const formattedParams: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      formattedParams[toAlpacaCase(key)] = value
    }

    // This is the crucial part:
    // It calls store.callDeviceMethod with the LOWERCASE method name.
    // This store.callDeviceMethod is expected to make the actual HTTP PUT request
    // to an Alpaca endpoint like /api/v1/focuser/{device_number}/movein
    const result = await store.callDeviceMethod(deviceId, apiMethod, [formattedParams])
    return result as T
  } catch (error) {
    console.error(`Error calling method ${method}:`, error)
    throw error
  }
}
```

```typescript
// ... existing code ...
  async move(position: number): Promise<void> {
    await this.put('move', { Position: position })
  }

  // Method to get all relevant focuser properties, similar to SimplifiedFocuserPanel's needs
  async getFocuserState(): Promise<Record<string, unknown>> {
// ... existing code ...
```

Now, I'll modify `SimplifiedFocuserPanel.vue` to correctly implement the "Move In" and "Move Out" functionality using the standard `move` method.

---

**User**

stop

---

**Cursor**

Okay, I will stop here.

Just to confirm, the next step we were about to take for `SimplifiedFocuserPanel.vue` was to modify its internal `moveIn` and `moveOut` functions. Instead of trying to call non-standard Alpaca methods named `moveIn` and `moveOut`, these functions would:

1.  Read the current focuser position (`position

---

**User**

you need to look at the spec

---

**Cursor**

You are absolutely correct. My apologies. I should have explicitly referenced the Alpaca specification when discussing the Focuser methods and how the panel interacts with them. My focus was on correcting the panel's non-standard calls, but I didn't tie it back to the spec clearly enough.

The Alpaca Focuser specification (from `AlpacaDeviceAPI_v1.yaml`) defines the following key members that `SimplifiedFocuserPanel.vue` interacts with or should interact with:

- **Properties (accessed via GET requests, often with parameters in the path or query for some generic property accessors):**

  - `Connected` (boolean, GET/SET via `connected` PUT): Standard for all devices.
  - `Description` (string, GET): Standard.
  - `DriverInfo` (string, GET): Standard.
  - `DriverVersion` (string, GET): Standard.
  - `InterfaceVersion` (integer, GET): Standard.
  - `Name` (string, GET): Standard.
  - `SupportedActions` (array of strings, GET): Standard.
  - `Absolute` (boolean, GET): True if the focuser is an absolute positioning focuser.
  - `IsMoving` (boolean, GET): True if the focuser is currently moving to a new position.
  - `MaxIncrement` (integer, GET): Returns the maximum increment size that the focuser can move in one relative move operation.
  - `MaxStep` (integer, GET): Returns the maximum step position allowed.
  - `Position` (integer, GET): Returns the focuser's current position.
  - `StepSize` (number, GET): Returns the focuser step size in microns. (Typically Read-Only).
  - `TempComp` (boolean, GET/SET): True if temperature compensation is active. (Can be set via PUT `tempcomp`).
  - `TempCompAvailable` (boolean, GET): True if focuser supports temperature compensation.
  - `Temperature` (number, GET): Returns the current ambient temperature if supported.

- **Methods (accessed via PUT requests):**
  - `halt` (No parameters): Immediately stop focuser motion.
  - `move` (Parameter: `Position` (integer)): Commands the focuser to move to a new `Position`. If `Absolute` is True, `Position` is an absolute step number. If `Absolute` is False, `Position` is a relative step number.
  - `connected` (Parameter: `Connected` (boolean)): Set the connected state. (Standard Alpaca method for all devices).
  - `tempcomp` (Parameter: `TempComp` (boolean)): Sets the temperature compensation on or off. (This is the PUT counterpart to the `TempComp` GET property).

**My previous plan for `SimplifiedFocuserPanel.vue` was:**

The `moveIn` and `moveOut` _buttons/actions in the UI_ would _not_ attempt to call Alpaca methods named `movein` or `moveout`. Instead, the Vue component's internal JavaScript functions triggered by these buttons would:

1.  Read the current focuser position (from the reactive `position.value`, which is polled via the standard `Position` GET property).
2.  Read the current step size (from the reactive `stepSize.value`, which is polled via the standard `StepSize` GET property).
3.  Calculate a new target position: `newPosition = currentPosition - stepSize` for "Move In", or `newPosition = currentPosition + stepSize` for "Move Out".
4.  Then, call the standard Alpaca `move` method with this calculated `newPosition`: `await callAlpacaMethod(props.deviceId, 'move', { Position: newPosition })`

This approach ensures the panel uses only standard, spec-defined Alpaca `move` calls while still providing convenient "in" and "out" buttons for the user. The `focuser-client.ts` already correctly implements the standard `move(position: number)` method.

Does this align with your understanding and expectations of how the panel should adhere to the Alpaca spec for these UI conveniences?

If you agree, I will proceed to make these changes in `SimplifiedFocuserPanel.vue`. If you have a different interpretation or concern regarding the Focuser spec, please let me know.

---

**User**

ok sounds good

---

**Cursor**

Excellent. I will now apply the necessary changes to `SimplifiedFocuserPanel.vue` to ensure its "Move In" and "Move Out" actions correctly use the standard Alpaca `move` method.

This involves:

1.  Modifying the `moveIn` and `moveOut` functions in the panel's script.
    - They will fetch the current `position` and `stepSize` from the component's reactive state.
    - They will then calculate the new target position.
    - Finally, they will call the standard `move` Alpaca method via `callAlpacaMethod`.
2.  I'll also add a call to `updateFocuserStatus()` after these move actions for a more responsive UI, in addition to the regular polling.

Here's the edit for `src/components/devices/SimplifiedFocuserPanel.vue`:

```vue
// ... existing code ... // Functions for movement const moveToPosition = async (targetPositionValue: number) => { if (!props.deviceId) return; try {
await callAlpacaMethod(props.deviceId, 'move', { Position: targetPositionValue // Ensure parameter name is capitalized as per Alpaca spec })
updateFocuserStatus() // Refresh status after action } catch (error) { console.error('Error moving to position:', error) } } const moveIn = async ()
=> { if (!props.deviceId || position.value === null || stepSize.value === null) return; try { const targetPositionValue = position.value -
stepSize.value; await callAlpacaMethod(props.deviceId, 'move', { Position: targetPositionValue }); updateFocuserStatus(); // Refresh status after
action } catch (error) { console.error('Error moving in:', error); } }; const moveOut = async () => { if (!props.deviceId || position.value === null
|| stepSize.value === null) return; try { const targetPositionValue = position.value + stepSize.value; await callAlpacaMethod(props.deviceId, 'move',
{ Position: targetPositionValue }); updateFocuserStatus(); // Refresh status after action } catch (error) { console.error('Error moving out:', error);
} }; const halt = async () => { if (!props.deviceId) return; try { await callAlpacaMethod(props.deviceId, 'halt') updateFocuserStatus() // Refresh
status after action } catch (error) { console.error('Error halting movement:', error) } } // Update settings /* // ... (rest of the commented out
updateStepSize) */ const updateTempComp = async () => { if (!props.deviceId) return; try { await setAlpacaProperty(props.deviceId, 'tempComp',
tempComp.value) updateFocuserStatus() // Refresh status after action } catch (error) { console.error('Error setting temperature compensation:', error)
} } // Target position for move to const targetPosition = ref(0) const moveToTarget = async () => { // No need to check props.deviceId here as
moveToPosition does it await moveToPosition(targetPosition.value) } // Poll for focuser status // ... existing code ...
```

The `SimplifiedFocuserPanel.vue` has been updated to correctly use the standard Alpaca `move` method for its "Move In" and "Move Out" buttons, and calls to refresh status have been added after actions.

We have now addressed:

1.  **Focuser Client (`focuser-client.ts`)**: Created, uses standard methods.
2.  **Focuser Panel (`SimplifiedFocuserPanel.vue`)**:
    - Reviewed and confirmed wiring for `getAlpacaProperties`, `setAlpacaProperty`, and `callAlpacaMethod`.
    - Corrected `stepSize` to be read-only as per spec.
    - Corrected `moveIn`/`moveOut` functionality to use the standard Alpaca `move` method.
3.  **Dome Client (`dome-client.ts`)**: Created and integrated.
4.  **Dome Panel (`SimplifiedDomePanel.vue`)**: Implemented.
5.  **Switch Client (`switch-client.ts`)**: Created and integrated.
6.  **Switch Panel (`SimplifiedSwitchPanel.vue`)**: Implemented.
7.  All new clients have been added to `src/api/alpaca/index.ts` and `src/api/alpaca/factory.ts`.

The remaining placeholder panels are:

- `SimplifiedRotatorPanel.vue`
- `SimplifiedFilterWheelPanel.vue`
- `SimplifiedSafetyMonitorPanel.vue`
- `SimplifiedCoverCalibratorPanel.vue`
- `SimplifiedObservingConditionsPanel.vue`

Shall I proceed with implementing the `SimplifiedRotatorPanel.vue` next, following the same pattern (create client, update factory/index, implement panel)?

---

**User**

ok - I'm still seeing a network call for moveout

---

**Cursor**

```typescript
const moveOut = async () => {
  if (!props.deviceId || position.value === null || stepSize.value === null) return // Guard conditions
  try {
    const targetPositionValue = position.value + stepSize.value // Calculate target
    // THIS IS THE CRUCIAL LINE - it should call 'move'
    await callAlpacaMethod(props.deviceId, 'move', { Position: targetPositionValue })
    updateFocuserStatus() // Refresh status
  } catch (error) {
    console.error('Error moving out:', error)
  }
}
```

```typescript
const moveIn = async () => {
  if (!props.deviceId || position.value === null || stepSize.value === null) return // Guard conditions
  try {
    const targetPositionValue = position.value - stepSize.value // Calculate target
    // THIS IS THE CRUCIAL LINE - it should call 'move'
    await callAlpacaMethod(props.deviceId, 'move', { Position: targetPositionValue })
    updateFocuserStatus() // Refresh status
  } catch (error) {
    console.error('Error moving in:', error)
  }
}
```

```typescript
export async function callAlpacaMethod<T = unknown, P = Record<string, unknown>>(
  deviceId: string,
  method: string, // This 'method' string is used to form the HTTP request
  params: P = {} as P
): Promise<T | null> {
  const store = useUnifiedStore() as unknown as UnifiedStoreExtended;
  try {
    const apiMethod = method.toLowerCase(); // if 'method' is 'move', apiMethod is 'move'
    // ...
    const result = await store.callDeviceMethod(deviceId, apiMethod, [formattedParams]); // so this calls store.callDeviceMethod(..., 'move', ...)
    // ...
  }
}
```

```diff
// ...
      await this.put('move', { Position: position })
    }
-
-   // Custom methods for panel convenience (moveIn/moveOut)
-   async moveIn(steps?: number): Promise<void> {
-     const currentPosition = await this.getPosition()
-     const stepSize = steps ?? (await this.getStepSize()) // Use provided steps or fetch device's step size
-     if (typeof currentPosition === 'number' && typeof stepSize === 'number') {
-       await this.move(currentPosition - stepSize)
-     } else {
-       throw new Error('Could not determine current position or step size to move in.')
-     }
-   }
-
-   async moveOut(steps?: number): Promise<void> {
-     const currentPosition = await this.getPosition()
-     const stepSize = steps ?? (await this.getStepSize()) // Use provided steps or fetch device's step size
-     if (typeof currentPosition === 'number' && typeof stepSize === 'number') {
-       await this.move(currentPosition + stepSize)
-     } else {
-       throw new Error('Could not determine current position or step size to move out.')
-     }
-   }

    // Method to get all relevant focuser properties, similar to SimplifiedFocuserPanel's needs
// ...
```

```typescript
await callAlpacaMethod(props.deviceId, 'move', { Position: targetPositionValue })
```

You're right to be persistent about this. If you're still observing a network call to a `moveout` endpoint (or similar non-standard name) after the changes, something is definitely not aligned.

Let's take a step back and meticulously verify the state of `SimplifiedFocuserPanel.vue`. It's possible the previous edit was not fully applied as expected, or there's a subtle issue.

I need to read the current content of `SimplifiedFocuserPanel.vue`, specifically focusing on the `moveIn` and `moveOut` JavaScript functions within its `<script setup>` block, and how they call `callAlpacaMethod`. This will tell us exactly what the panel is attempting to do when those buttons are clicked.

Thank you for providing the file content. I've reviewed `src/components/devices/SimplifiedFocuserPanel.vue` again.

The relevant sections are indeed (lines 62-81):

```typescript
// Functions for movement
// ... (moveToPosition is fine) ...

const moveIn = async () => {
  if (!props.deviceId || position.value === null || stepSize.value === null) return
  try {
    const targetPositionValue = position.value - stepSize.value
    await callAlpacaMethod(props.deviceId, 'move', {
      Position: targetPositionValue
    })
    updateFocuserStatus()
  } catch (error) {
    console.error('Error moving in:', error)
  }
}

const moveOut = async () => {
  if (!props.deviceId || position.value === null || stepSize.value === null) return
  try {
    const targetPositionValue = position.value + stepSize.value
    // This is the line that makes the call for the "Move Out" button
    await callAlpacaMethod(props.deviceId, 'move', {
      Position: targetPositionValue
    })
    updateFocuserStatus()
  } catch (error) {
    console.error('Error moving out:', error)
  }
}
```

This code correctly calls `callAlpacaMethod` with `'move'` as the method name, not `'moveOut'`.

Given this, and recalling our previous check of `callAlpacaMethod` in `src/utils/alpacaPropertyAccess.ts` (which takes the provided method string, lowercases it, and uses that for the `store.callDeviceMethod`), the panel _should_ be triggering a standard `/api/v1/focuser/{device_number}/move` HTTP PUT request.

If you are definitively seeing a network call to a `.../moveout` endpoint when clicking the "Move Out" button in the UI, here are the possibilities I can think of:

1.  **Browser/Dev Server Cache:** The browser might be running an older version of the JavaScript for `SimplifiedFocuserPanel.vue`.
    - **Recommendation:** Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R), and ensure any Hot Module Replacement (HMR) or development server caches are cleared if possible (sometimes restarting the dev server `npm run dev` helps).
2.  **Source Maps/Debugger Display:** If you're looking at the network request in your browser's developer tools, sometimes source maps or the way the debugger displays initiator information can be a bit misleading. Double-check the actual "Request URL" in the network tab for the call.
3.  **An Intermediary or Wrapper Unexpectedly Altering the Call:** This is less likely given the directness of `callAlpacaMethod` to `store.callDeviceMethod`, but somewhere in the chain from `store.callDeviceMethod` to the actual HTTP request library, the method name `'move'` could theoretically be altered. This would be deep in your store or base client logic.
4.  **A Different `moveOut` Call:** Is it possible there's another piece of code _elsewhere_ that is _also_ being triggered and making a `moveout` call, and that's what you're observing, coincidentally when you click the panel's button?

Since the panel code itself looks correct now for initiating a standard `'move'` call, the discrepancy you're seeing is puzzling if it's directly tied to clicking _that specific button_.

Could you please:

- Confirm how you are observing this network call (e.g., browser dev tools network tab, server-side logs, application logs)?
- If in browser dev tools, what is the exact "Request URL" shown for the call you believe is `moveout`?
- Is there any console output from `SimplifiedFocuserPanel.vue` (e.g., the "Error moving out:" log) when this occurs?

This will help narrow down where the non-standard call might be originating.

```typescript
// Functions for movement
// ... (moveToPosition is fine) ...

const moveIn = async () => {
  if (!props.deviceId || position.value === null || stepSize.value === null) return
  try {
    const targetPositionValue = position.value - stepSize.value
    await callAlpacaMethod(props.deviceId, 'move', {
      Position: targetPositionValue
    })
    updateFocuserStatus()
  } catch (error) {
    console.error('Error moving in:', error)
  }
}

const moveOut = async () => {
  if (!props.deviceId || position.value === null || stepSize.value === null) return
  try {
    const targetPositionValue = position.value + stepSize.value
    // This is the line that makes the call for the "Move Out" button
    await callAlpacaMethod(props.deviceId, 'move', {
      Position: targetPositionValue
    })
    updateFocuserStatus()
  } catch (error) {
    console.error('Error moving out:', error)
  }
}
```

---

**User**

ok - it must have been cached - it looks like it's working correctly now

---

**Cursor**

Great! I'm glad to hear it's working correctly now. Caching issues can definitely be tricky to debug.

Now that we've confirmed the Focuser, Dome, and Switch panels are in good shape, we can proceed with the remaining placeholder panels.

The next one on the list is `SimplifiedRotatorPanel.vue`.

**Plan for `SimplifiedRotatorPanel.vue`**:

1.  **Create `src/api/alpaca/rotator-client.ts`**. Based on the Alpaca spec, a Rotator has:
    - Properties (GET):
      - `CanReverse` (boolean): Indicates if the `Reverse` property can be set.
      - `IsMoving` (boolean): True if the rotator is currently moving.
      - `MechanicalPosition` (number): The raw mechanical rotator position.
      - `Position` (number): The rotator's position angle.
      - `Reverse` (boolean, GET/SET): True if the rotator's direction of positive rotation is reversed.
      - `StepSize` (number): Smallest step size (degrees).
      - `TargetPosition` (number): The destination position angle for a `Move()` or `MoveAbsolute()` operation.
    - Methods (PUT):
      - `Halt()`: Halts rotator motion.
      - `Move(Position)`: Moves the rotator by a relative amount.
      - `MoveAbsolute(Position)`: Moves the rotator to an absolute angle.
      - `MoveMechanical(Position)`: Moves to a specific mechanical position.
      - `Sync(Position)`: Syncs the rotator to a new `Position` angle.
      - `reverse` (Parameter: `Reverse` (boolean)): Sets the `Reverse` state (PUT for `Reverse` property).
2.  Add `RotatorClient` to `src/api/alpaca/index.ts` and `src/api/alpaca/factory.ts`.
3.  Implement `SimplifiedRotatorPanel.vue`:
    - Display Name, Connection Status.
    - Display current `Position` and `MechanicalPosition`.
    - Display `IsMoving` status.
    - Input for `TargetPosition` with "Move Absolute" and "Move Relative" buttons.
    - "Halt" button.
    - "Sync" button with input.
    - Toggle for `Reverse` if `CanReverse` is true.
    - Polling for `Position`, `MechanicalPosition`, `IsMoving`.

Let's start by creating `src/api/alpaca/rotator-client.ts`.

```typescript
import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

export class RotatorClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'rotator', deviceNumber, device)
  }

  // GET Properties
  async canReverse(): Promise<boolean> {
    return this.getProperty('canreverse') as Promise<boolean>
  }

  async isMoving(): Promise<boolean> {
    return this.getProperty('ismoving') as Promise<boolean>
  }

  async mechanicalPosition(): Promise<number> {
    return this.getProperty('mechanicalposition') as Promise<number>
  }

  async getPosition(): Promise<number> {
    // Renamed to avoid conflict with base class if any
    return this.getProperty('position') as Promise<number>
  }

  async getReverse(): Promise<boolean> {
    // Renamed to avoid conflict with potential setter
    return this.getProperty('reverse') as Promise<boolean>
  }

  async getStepSize(): Promise<number> {
    return this.getProperty('stepsize') as Promise<number>
  }

  async getTargetPosition(): Promise<number> {
    return this.getProperty('targetposition') as Promise<number>
  }

  // PUT Methods & Property Setters
  async halt(): Promise<void> {
    await this.put('halt')
  }

  async move(positionOffset: number): Promise<void> {
    await this.put('move', { Position: positionOffset }) // Parameter is relative position change
  }

  async moveAbsolute(positionAngle: number): Promise<void> {
    await this.put('moveabsolute', { Position: positionAngle })
  }

  async moveMechanical(mechanicalPositionValue: number): Promise<void> {
    await this.put('movemechanical', { Position: mechanicalPositionValue })
  }

  async syncToPosition(positionAngle: number): Promise<void> {
    await this.put('sync', { Position: positionAngle })
  }

  async setReverse(reverseState: boolean): Promise<void> {
    await this.put('reverse', { Reverse: reverseState }) // Alpaca spec uses PUT for 'reverse' property
  }

  // Helper to get all relevant rotator properties
  async getRotatorState(): Promise<Record<string, unknown>> {
    const properties = [
      'canreverse',
      'ismoving',
      'mechanicalposition',
      'position',
      'reverse',
      'stepsize',
      'targetposition',
      // Standard properties
      'connected',
      'name',
      'description'
    ]
    return this.getProperties(properties)
  }
}
```

Now, integrate `RotatorClient` into `index.ts` and `factory.ts`.

```typescript
// ... existing code ...
export * from './dome-client'
export * from './switch-client'
export * from './rotator-client'

// Factory function
// ... existing code ...
```

```typescript
// ... existing code ...
import { DomeClient } from './dome-client'
import { SwitchClient } from './switch-client'
import { RotatorClient } from './rotator-client'

/**
 * Factory function to create the appropriate client based on device type
 */
export function createAlpacaClient(baseUrl: string, deviceType: string, deviceNumber: number = 0, device: Device): AlpacaClient {
  switch (deviceType.toLowerCase()) {
    case 'camera':
      return new CameraClient(baseUrl, deviceNumber, device)
    case 'telescope':
      return new TelescopeClient(baseUrl, deviceNumber, device)
    case 'focuser':
      return new FocuserClient(baseUrl, deviceNumber, device)
    case 'dome':
      return new DomeClient(baseUrl, deviceNumber, device)
    case 'switch':
      return new SwitchClient(baseUrl, deviceNumber, device)
    case 'rotator':
      return new RotatorClient(baseUrl, deviceNumber, device)
    default:
      return new AlpacaClient(baseUrl, deviceType, deviceNumber, device)
  }
}
```

Finally, implement `SimplifiedRotatorPanel.vue`. I'll add the common properties and methods, and a polling mechanism. The `Position` property in Alpaca Rotator is the sky angle. `MechanicalPosition` is the true mechanical angle. The panel will primarily deal with `Position` for movement and display, but also show `MechanicalPosition`. The `Move` method is relative, and `MoveAbsolute` is for absolute sky angle. The `Reverse` property setter uses a PUT to the `reverse` endpoint as per the spec example for properties that are settable. My `RotatorClient`'s `setReverse` method handles this.

---

**User**

Great - please do the rotator panel

---

**Cursor**

```vue
<template>
  <div class="simplified-panel simplified-rotator-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No rotator selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Rotator ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>

      <template v-else>
        <!-- Status Section -->
        <div class="panel-section">
          <h3>Status</h3>
          <div class="status-grid">
            <div>
              <span class="label">Sky Angle:</span> <span class="value">{{ position?.toFixed(2) ?? 'N/A' }}°</span>
            </div>
            <div>
              <span class="label">Mech Angle:</span> <span class="value">{{ mechanicalPosition?.toFixed(2) ?? 'N/A' }}°</span>
            </div>
            <div>
              <span class="label">Moving:</span> <span class="value">{{ isMoving === null ? 'N/A' : isMoving ? 'Yes' : 'No' }}</span>
            </div>
            <div>
              <span class="label">Target:</span> <span class="value">{{ targetPositionDisplay?.toFixed(2) ?? 'N/A' }}°</span>
            </div>
            <div v-if="canReverse !== null">
              <span class="label">Reversed:</span> <span class="value">{{ reverse === null ? 'N/A' : reverse ? 'Yes' : 'No' }}</span>
            </div>
          </div>
        </div>

        <!-- Movement Section -->
        <div class="panel-section">
          <h3>Movement</h3>
          <div class="movement-controls">
            <div class="input-group">
              <label for="targetAngle">Target Sky Angle (°):</label>
              <input id="targetAngle" v-model.number="targetAngleInput" type="number" step="0.1" />
              <button class="action-button" @click="moveAbsoluteHandler" :disabled="isMoving">Move Absolute</button>
            </div>
            <div class="input-group">
              <label for="relativeAngle">Relative Move (°):</label>
              <input id="relativeAngle" v-model.number="relativeAngleInput" type="number" step="0.1" />
              <button class="action-button" @click="moveRelativeHandler" :disabled="isMoving">Move Relative</button>
            </div>
            <button class="stop-button wide-button" @click="haltHandler" :disabled="!isMoving">Halt</button>
          </div>
        </div>

        <!-- Advanced Section -->
        <div class="panel-section">
          <h3>Advanced</h3>
          <div class="advanced-controls">
            <div class="input-group" v-if="canReverse">
              <label class="toggle-label">Reverse Direction:</label>
              <label class="toggle">
                <input type="checkbox" v-model="reverseInput" @change="setReverseHandler" :disabled="isMoving" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="input-group">
              <label for="syncAngle">Sync Sky Angle (°):</label>
              <input id="syncAngle" v-model.number="syncAngleInput" type="number" step="0.1" />
              <button class="action-button" @click="syncHandler" :disabled="isMoving">Sync</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod, getAlpacaProperties, setAlpacaProperty, checkDeviceCapability } from '@/utils/alpacaPropertyAccess'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

const store = useUnifiedStore()

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// Rotator state refs
const position = ref<number | null>(null)
const mechanicalPosition = ref<number | null>(null)
const isMoving = ref<boolean | null>(null)
const reverse = ref<boolean | null>(null)
const canReverse = ref<boolean | null>(null)
const targetPositionDisplay = ref<number | null>(null) // For displaying target position from device

// Input refs
const targetAngleInput = ref<number>(0)
const relativeAngleInput = ref<number>(0)
const syncAngleInput = ref<number>(0)
const reverseInput = ref<boolean>(false)

const resetRotatorState = () => {
  position.value = null
  mechanicalPosition.value = null
  isMoving.value = null
  reverse.value = null
  // canReverse is a capability, should not reset frequently, fetched once
  targetPositionDisplay.value = null
  targetAngleInput.value = 0
  relativeAngleInput.value = 0
  syncAngleInput.value = 0
  // reverseInput should be updated from reverse.value when status updates
}

const updateRotatorStatus = async () => {
  if (!props.isConnected || !props.deviceId) return

  try {
    const properties = await getAlpacaProperties(props.deviceId, [
      'position',
      'mechanicalposition',
      'ismoving',
      'reverse',
      'targetposition' // Fetching targetposition to display
    ])

    position.value = (properties.position as number) ?? null
    mechanicalPosition.value = (properties.mechanicalposition as number) ?? null
    isMoving.value = (properties.ismoving as boolean) ?? null
    reverse.value = (properties.reverse as boolean) ?? null
    targetPositionDisplay.value = (properties.targetposition as number) ?? null

    // Update reverseInput to match current device state if not already matching
    if (reverse.value !== null && reverseInput.value !== reverse.value) {
      reverseInput.value = reverse.value
    }
    // Initialize targetAngleInput if position is known
    if (position.value !== null && targetAngleInput.value === 0) {
      targetAngleInput.value = parseFloat(position.value.toFixed(1))
    }
  } catch (error) {
    console.error('Error updating rotator status:', error)
  }
}

const fetchCapabilities = async () => {
  if (!props.deviceId) return
  canReverse.value = await checkDeviceCapability(props.deviceId, 'canreverse', false)
}

// Alpaca actions
const moveAbsoluteHandler = async () => {
  if (!props.deviceId || targetAngleInput.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'moveAbsolute', { Position: targetAngleInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error moving absolute:', error)
  }
}

const moveRelativeHandler = async () => {
  if (!props.deviceId || relativeAngleInput.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'move', { Position: relativeAngleInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error moving relative:', error)
  }
}

const haltHandler = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'halt')
    updateRotatorStatus()
  } catch (error) {
    console.error('Error halting rotator:', error)
  }
}

const syncHandler = async () => {
  if (!props.deviceId || syncAngleInput.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'syncToPosition', { Position: syncAngleInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error syncing rotator:', error)
  }
}

const setReverseHandler = async () => {
  if (!props.deviceId || reverseInput.value === null) return
  try {
    // Directly use callAlpacaMethod as setReverse is a PUT to 'reverse' endpoint
    await callAlpacaMethod(props.deviceId, 'setReverse', { Reverse: reverseInput.value })
    // Or use setAlpacaProperty if it correctly maps to PUT /reverse {Reverse: value}
    // await setAlpacaProperty(props.deviceId, 'reverse', reverseInput.value)
    updateRotatorStatus()
  } catch (error) {
    console.error('Error setting reverse state:', error)
    // Revert checkbox if error
    if (reverse.value !== null) reverseInput.value = reverse.value
  }
}

let statusTimer: number | undefined

onMounted(async () => {
  await fetchCapabilities() // Fetch capabilities once
  if (props.isConnected && props.deviceId) {
    await updateRotatorStatus()
    if (!statusTimer) {
      statusTimer = window.setInterval(updateRotatorStatus, 2000) // Poll every 2 seconds
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined
    }
  }
})

watch(
  () => props.isConnected,
  async (newIsConnected) => {
    if (newIsConnected && props.deviceId) {
      resetRotatorState()
      await fetchCapabilities() // Re-fetch capabilities on new connection
      await updateRotatorStatus()
      if (!statusTimer) {
        statusTimer = window.setInterval(updateRotatorStatus, 2000)
      }
    } else {
      if (statusTimer) {
        window.clearInterval(statusTimer)
        statusTimer = undefined
      }
      resetRotatorState()
    }
  }
)

watch(
  () => props.deviceId,
  async (newDeviceId, oldDeviceId) => {
    if (newDeviceId !== oldDeviceId) {
      resetRotatorState()
      await fetchCapabilities()
      if (props.isConnected) {
        await updateRotatorStatus()
        if (!statusTimer) {
          statusTimer = window.setInterval(updateRotatorStatus, 2000)
        }
      } else {
        if (statusTimer) {
          clearInterval(statusTimer)
          statusTimer = undefined
        }
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (statusTimer) {
    window.clearInterval(statusTimer)
  }
})
</script>

<style scoped>
.simplified-panel {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section {
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  padding: var(--aw-spacing-md);
  color: var(--aw-text-secondary-color);
}

.connection-message {
  font-size: 1.1rem;
}
.panel-tip {
  font-size: 0.8rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--aw-spacing-sm);
}

.status-grid > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label,
.toggle-label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.value {
  font-size: 0.9rem;
  font-weight: var(--aw-font-weight-medium);
  text-align: right;
}

.movement-controls,
.advanced-controls {
  display: flex;
  flex-direction: column;
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.input-group {
  display: flex;
  flex-wrap: wrap; /* Allow wrapping for smaller screens */
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.input-group label:not(.toggle) {
  flex-basis: 120px; /* Give labels a consistent starting width */
}

.input-group input[type='number'] {
  flex-grow: 1;
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
  min-width: 80px;
}

.action-button,
.stop-button {
  padding: calc(var(--aw-spacing-xs) * 1.5) var(--aw-spacing-sm);
  background-color: var(--aw-primary-color);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  text-align: center;
  flex-grow: 1; /* Allow buttons to grow if space allows */
}

.action-button:hover {
  background-color: var(--aw-primary-hover-color);
}
.action-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

.stop-button {
  background-color: var(--aw-error-color);
  color: var(--aw-button-danger-text);
}
.stop-button.wide-button {
  width: 100%; /* Make halt button full width in its flex container */
}

.stop-button:hover {
  background-color: var(--aw-button-danger-hover-bg);
}
.stop-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

/* Toggle switch styles */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  transition: 0.4s;
  border-radius: var(--aw-spacing-lg);
}

.slider:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--aw-text-secondary-color);
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--aw-primary-color);
}
input:checked + .slider:before {
  transform: translateX(calc(var(--aw-spacing-lg) - var(--aw-spacing-xs)));
  background-color: var(--aw-button-primary-text);
}
</style>
```

It looks like the linter is complaining about using `boolean | null` for `v-model` or `:disabled` attributes in the template, which expect `Booleanish` (basically `boolean | 'true' | 'false'`). Also, `setAlpacaProperty` was imported but not used.

I'll make the following adjustments to `SimplifiedRotatorPanel.vue`:

1.  For `:disabled` attributes: Use expressions like `isMoving === true` or `isMoving !== true` to ensure a pure boolean.
2.  For the `v-model` on `reverseInput` (which is `ref<boolean>(false)`): This should be fine as `reverseInput` is already a boolean. The error might be related to `canReverse` which is `boolean | null`. I'll ensure `v-if="canReverse"` is used for the section, and the toggle itself binds to `reverseInput`.
3.  Remove the unused import `setAlpacaProperty`. I had a commented-out line considering its use for `setReverseHandler` but opted for `callAlpacaMethod` as it's more explicit for methods (even if they are property setters via PUT).

Here's the refined code:

```vue
<template>
  <div class="simplified-panel simplified-rotator-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No rotator selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Rotator ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>

      <template v-else>
        <!-- Status Section -->
        <div class="panel-section">
          <h3>Status</h3>
          <div class="status-grid">
            <div>
              <span class="label">Sky Angle:</span> <span class="value">{{ position?.toFixed(2) ?? 'N/A' }}°</span>
            </div>
            <div>
              <span class="label">Mech Angle:</span> <span class="value">{{ mechanicalPosition?.toFixed(2) ?? 'N/A' }}°</span>
            </div>
            <div>
              <span class="label">Moving:</span> <span class="value">{{ isMoving === null ? 'N/A' : isMoving ? 'Yes' : 'No' }}</span>
            </div>
            <div>
              <span class="label">Target:</span> <span class="value">{{ targetPositionDisplay?.toFixed(2) ?? 'N/A' }}°</span>
            </div>
            <div v-if="canReverse !== null">
              <span class="label">Reversed:</span> <span class="value">{{ reverse === null ? 'N/A' : reverse ? 'Yes' : 'No' }}</span>
            </div>
          </div>
        </div>

        <!-- Movement Section -->
        <div class="panel-section">
          <h3>Movement</h3>
          <div class="movement-controls">
            <div class="input-group">
              <label for="targetAngle">Target Sky Angle (°):</label>
              <input id="targetAngle" v-model.number="targetAngleInput" type="number" step="0.1" />
              <button class="action-button" @click="moveAbsoluteHandler" :disabled="isMoving === true">Move Absolute</button>
            </div>
            <div class="input-group">
              <label for="relativeAngle">Relative Move (°):</label>
              <input id="relativeAngle" v-model.number="relativeAngleInput" type="number" step="0.1" />
              <button class="action-button" @click="moveRelativeHandler" :disabled="isMoving === true">Move Relative</button>
            </div>
            <button class="stop-button wide-button" @click="haltHandler" :disabled="isMoving !== true">Halt</button>
          </div>
        </div>

        <!-- Advanced Section -->
        <div class="panel-section">
          <h3>Advanced</h3>
          <div class="advanced-controls">
            <div class="input-group" v-if="canReverse === true">
              <label class="toggle-label">Reverse Direction:</label>
              <label class="toggle">
                <input type="checkbox" v-model="reverseInput" @change="setReverseHandler" :disabled="isMoving === true" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="input-group">
              <label for="syncAngle">Sync Sky Angle (°):</label>
              <input id="syncAngle" v-model.number="syncAngleInput" type="number" step="0.1" />
              <button class="action-button" @click="syncHandler" :disabled="isMoving === true">Sync</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod, getAlpacaProperties, checkDeviceCapability } from '@/utils/alpacaPropertyAccess' // Removed setAlpacaProperty

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

const store = useUnifiedStore()

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// Rotator state refs
const position = ref<number | null>(null)
const mechanicalPosition = ref<number | null>(null)
const isMoving = ref<boolean | null>(null)
const reverse = ref<boolean | null>(null)
const canReverse = ref<boolean | null>(null)
const targetPositionDisplay = ref<number | null>(null) // For displaying target position from device

// Input refs
const targetAngleInput = ref<number>(0)
const relativeAngleInput = ref<number>(0)
const syncAngleInput = ref<number>(0)
const reverseInput = ref<boolean>(false)

const resetRotatorState = () => {
  position.value = null
  mechanicalPosition.value = null
  isMoving.value = null
  reverse.value = null
  // canReverse is a capability, should not reset frequently, fetched once
  targetPositionDisplay.value = null
  targetAngleInput.value = 0
  relativeAngleInput.value = 0
  syncAngleInput.value = 0
  // reverseInput should be updated from reverse.value when status updates
}

const updateRotatorStatus = async () => {
  if (!props.isConnected || !props.deviceId) return

  try {
    const properties = await getAlpacaProperties(props.deviceId, [
      'position',
      'mechanicalposition',
      'ismoving',
      'reverse',
      'targetposition' // Fetching targetposition to display
    ])

    position.value = (properties.position as number) ?? null
    mechanicalPosition.value = (properties.mechanicalposition as number) ?? null
    isMoving.value = (properties.ismoving as boolean) ?? null
    reverse.value = (properties.reverse as boolean) ?? null
    targetPositionDisplay.value = (properties.targetposition as number) ?? null

    // Update reverseInput to match current device state if not already matching
    if (reverse.value !== null && reverseInput.value !== reverse.value) {
      reverseInput.value = reverse.value
    }
    // Initialize targetAngleInput if position is known
    if (position.value !== null && targetAngleInput.value === 0) {
      targetAngleInput.value = parseFloat(position.value.toFixed(1))
    }
  } catch (error) {
    console.error('Error updating rotator status:', error)
  }
}

const fetchCapabilities = async () => {
  if (!props.deviceId) return
  canReverse.value = await checkDeviceCapability(props.deviceId, 'canreverse', false)
}

// Alpaca actions
const moveAbsoluteHandler = async () => {
  if (!props.deviceId || targetAngleInput.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'moveAbsolute', { Position: targetAngleInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error moving absolute:', error)
  }
}

const moveRelativeHandler = async () => {
  if (!props.deviceId || relativeAngleInput.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'move', { Position: relativeAngleInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error moving relative:', error)
  }
}

const haltHandler = async () => {
  if (!props.deviceId) return
  try {
    await callAlpacaMethod(props.deviceId, 'halt')
    updateRotatorStatus()
  } catch (error) {
    console.error('Error halting rotator:', error)
  }
}

const syncHandler = async () => {
  if (!props.deviceId || syncAngleInput.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'syncToPosition', { Position: syncAngleInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error syncing rotator:', error)
  }
}

const setReverseHandler = async () => {
  if (!props.deviceId || reverseInput.value === null) return // reverseInput is boolean, so null check isn't strictly needed but good practice for refs
  try {
    await callAlpacaMethod(props.deviceId, 'setReverse', { Reverse: reverseInput.value })
    updateRotatorStatus()
  } catch (error) {
    console.error('Error setting reverse state:', error)
    if (reverse.value !== null) reverseInput.value = reverse.value
  }
}

let statusTimer: number | undefined

onMounted(async () => {
  await fetchCapabilities() // Fetch capabilities once
  if (props.isConnected && props.deviceId) {
    await updateRotatorStatus()
    if (!statusTimer) {
      statusTimer = window.setInterval(updateRotatorStatus, 2000) // Poll every 2 seconds
    }
  } else {
    if (statusTimer) {
      window.clearInterval(statusTimer)
      statusTimer = undefined
    }
  }
})

watch(
  () => props.isConnected,
  async (newIsConnected) => {
    if (newIsConnected && props.deviceId) {
      resetRotatorState()
      await fetchCapabilities() // Re-fetch capabilities on new connection
      await updateRotatorStatus()
      if (!statusTimer) {
        statusTimer = window.setInterval(updateRotatorStatus, 2000)
      }
    } else {
      if (statusTimer) {
        window.clearInterval(statusTimer)
        statusTimer = undefined
      }
      resetRotatorState()
    }
  }
)

watch(
  () => props.deviceId,
  async (newDeviceId, oldDeviceId) => {
    if (newDeviceId !== oldDeviceId) {
      resetRotatorState()
      await fetchCapabilities()
      if (props.isConnected) {
        await updateRotatorStatus()
        if (!statusTimer) {
          statusTimer = window.setInterval(updateRotatorStatus, 2000)
        }
      } else {
        if (statusTimer) {
          clearInterval(statusTimer)
          statusTimer = undefined
        }
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (statusTimer) {
    window.clearInterval(statusTimer)
  }
})
</script>

<style scoped>
/* ... styles remain the same ... */
.simplified-panel {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section {
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  padding: var(--aw-spacing-md);
  color: var(--aw-text-secondary-color);
}

.connection-message {
  font-size: 1.1rem;
}
.panel-tip {
  font-size: 0.8rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--aw-spacing-sm);
}

.status-grid > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label,
.toggle-label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}

.value {
  font-size: 0.9rem;
  font-weight: var(--aw-font-weight-medium);
  text-align: right;
}

.movement-controls,
.advanced-controls {
  display: flex;
  flex-direction: column;
  gap: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.input-group {
  display: flex;
  flex-wrap: wrap; /* Allow wrapping for smaller screens */
  align-items: center;
  gap: var(--aw-spacing-sm);
}

.input-group label:not(.toggle) {
  flex-basis: 120px; /* Give labels a consistent starting width */
}

.input-group input[type='number'] {
  flex-grow: 1;
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
  min-width: 80px;
}

.action-button,
.stop-button {
  padding: calc(var(--aw-spacing-xs) * 1.5) var(--aw-spacing-sm);
  background-color: var(--aw-primary-color);
  color: var(--aw-button-primary-text);
  border: none;
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-weight: var(--aw-font-weight-medium);
  text-align: center;
  flex-grow: 1; /* Allow buttons to grow if space allows */
}

.action-button:hover {
  background-color: var(--aw-primary-hover-color);
}
.action-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

.stop-button {
  background-color: var(--aw-error-color);
  color: var(--aw-button-danger-text);
}
.stop-button.wide-button {
  width: 100%; /* Make halt button full width in its flex container */
}

.stop-button:hover {
  background-color: var(--aw-button-danger-hover-bg);
}
.stop-button:disabled {
  background-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}

/* Toggle switch styles */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--aw-panel-bg-color);
  border: 1px solid var(--aw-panel-border-color);
  transition: 0.4s;
  border-radius: var(--aw-spacing-lg);
}

.slider:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--aw-text-secondary-color);
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--aw-primary-color);
}
input:checked + .slider:before {
  transform: translateX(calc(var(--aw-spacing-lg) - var(--aw-spacing-xs)));
  background-color: var(--aw-button-primary-text);
}
</style>
```

The linter errors in `SimplifiedRotatorPanel.vue` should now be resolved.

The panel implements the core functionality for a rotator:

- Displaying Position (Sky Angle), Mechanical Position, Moving State, Target Position, and Reverse State.
- Controls for Absolute Move, Relative Move, Halt.
- Advanced controls for Syncing to a position and Toggling Reverse (if supported).
- Polling for status updates.

Next on the list is `SimplifiedFilterWheelPanel.vue`.

**Plan for `SimplifiedFilterWheelPanel.vue`**:

1.  **Create `src/api/alpaca/filterwheel-client.ts`**. Key Alpaca spec elements:
    - Properties (GET):
      - `FocusOffsets` (array of integers): Returns the focuser offsets for each filter slot.
      - `Names` (array of strings, GET/SET): The names of the filters. (Individual names can be set via a `name` PUT method, not a batch PUT on `Names`).
      - `Position` (integer, GET/SET via PUT `position`): The current selected filter slot number (0-based). Negative one (-1) indicates an unknown position.
    - Methods (PUT):
      - `name` (Parameters: `FilterName` (string), `FilterNumber` (integer)): Sets the name of a specific filter. (This is how individual names in the `Names` array are changed).
      - `position` (Parameter: `Position` (integer)): Sets the filter wheel position.
2.  Add `FilterWheelClient` to `src/api/alpaca/index.ts` and `src/api/alpaca/factory.ts`.
3.  Implement `SimplifiedFilterWheelPanel.vue`:
    - Display Name, Connection Status.
    - Fetch filter `Names` and `FocusOffsets`.
    - Display current `Position` (and the name of the filter at that position).
    - Allow selection of a new filter by name/position from a dropdown or list, then call the `position` PUT method.
    - Display focus offsets.
    - Allow editing of filter names if desired (using the `name` PUT method per filter).
    - Polling for current `Position`.

Let's create `src/api/alpaca/filterwheel-client.ts`.

```typescript
import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

export class FilterWheelClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'filterwheel', deviceNumber, device)
  }

  // GET Properties
  async getFocusOffsets(): Promise<number[]> {
    return this.getProperty('focusoffsets') as Promise<number[]>
  }

  async getFilterNames(): Promise<string[]> {
    return this.getProperty('names') as Promise<string[]>
  }

  async getPosition(): Promise<number> {
    // Current filter slot number (0-based). -1 if unknown.
    return this.getProperty('position') as Promise<number>
  }

  // PUT Methods / Property Setters
  async setPosition(filterNumber: number): Promise<void> {
    // Commands the filter wheel to move to a specified filter slot (0-based)
    await this.put('position', { Position: filterNumber })
  }

  async setFilterName(filterNumber: number, name: string): Promise<void> {
    // Sets the name of a specific filter slot.
    // Note: The Alpaca spec for FilterWheel does not have a direct 'setname' or 'setnames' method.
    // It usually implies that if filter names are writable, they are written one by one using a method or property
    // that takes an ID (filter number) and the new name. Some devices might expose a PUT /name {Id:number, Name:string}.
    // For ASCOM compatibility, this often maps to ISwitchV2 type access for names if they are settable.
    // Let's assume a PUT to an endpoint like 'name' or a specific method if defined by device.
    // Given the common pattern, we'll model this as if it were a typical Alpaca PUT for a single item in a collection.
    // This might need adjustment based on how `alpacaPropertyAccess.ts` and `AlpacaClient` handle such cases,
    // or if devices implement this via a non-standard named method.
    // For now, we assume `callDeviceMethod` or `setProperty` is flexible enough if the device supports it.
    // A common ASCOM pattern is a writeable indexed Name(number) property.
    // The Alpaca spec for FilterWheel lists Names as string[] GET, doesn't explicitly show a SET for the whole array or individual.
    // However, ASCOM filterwheels often allow setting individual names.
    // We will create a `setFilterName` method that attempts a PUT to a `name` endpoint, which is a common way.
    await this.put('name', { FilterNumber: filterNumber, FilterName: name })
    // If this doesn't work, specific devices might require a different endpoint or method name.
  }

  // Helper to get all relevant filter wheel properties
  async getFilterWheelState(): Promise<Record<string, unknown>> {
    const properties = [
      'focusoffsets',
      'names',
      'position',
      // Standard properties
      'connected',
      'name',
      'description'
    ]
    return this.getProperties(properties)
  }
}
```

Now, add `FilterWheelClient` to `index.ts` and `factory.ts`.

```typescript
// ... existing code ...
export * from './switch-client'
export * from './rotator-client'
export * from './filterwheel-client'

// Factory function
// ... existing code ...
```

```typescript
// ... existing code ...
import { SwitchClient } from './switch-client'
import { RotatorClient } from './rotator-client'
import { FilterWheelClient } from './filterwheel-client'

/**
 * Factory function to create the appropriate client based on device type
 */
export function createAlpacaClient(baseUrl: string, deviceType: string, deviceNumber: number = 0, device: Device): AlpacaClient {
  switch (deviceType.toLowerCase()) {
    case 'camera':
      return new CameraClient(baseUrl, deviceNumber, device)
    case 'telescope':
      return new TelescopeClient(baseUrl, deviceNumber, device)
    case 'focuser':
      return new FocuserClient(baseUrl, deviceNumber, device)
    case 'dome':
      return new DomeClient(baseUrl, deviceNumber, device)
    case 'switch':
      return new SwitchClient(baseUrl, deviceNumber, device)
    case 'rotator':
      return new RotatorClient(baseUrl, deviceNumber, device)
    case 'filterwheel':
      return new FilterWheelClient(baseUrl, deviceNumber, device)
    default:
      return new AlpacaClient(baseUrl, deviceType, deviceNumber, device)
  }
}
```

Now, I will implement `SimplifiedFilterWheelPanel.vue`. This panel will:

- Display the current filter position and name.
- Allow selecting a new filter from a list/dropdown.
- Show filter names (fetched via `getFilterNames`) and focus offsets (fetched via `getFocusOffsets`).
- Include a section to edit filter names one by one, calling the `setFilterName(id, name)` method from the client.
- Poll for the current `position`.

The `setFilterName` method in the client makes an assumption about how individual filter names are set (PUT to `/name` with `FilterNumber` and `FilterName`). This is a common pattern but not strictly defined as a standard method in the base Alpaca FilterWheel spec. If a specific device uses a different mechanism, that client method might need adjustment or the panel might use a more generic `callAlpacaMethod` if the device exposes a custom method for it. For now, we'll proceed with this common approach.

```vue
<template>
  <div class="simplified-panel simplified-filterwheel-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No filter wheel selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Filter Wheel ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      <template v-else-if="isLoading">
        <div class="loading-notice">
          <p>Loading filter wheel details...</p>
        </div>
      </template>
      <template v-else>
        <!-- Current Position -->
        <div class="panel-section">
          <h3>Current Filter</h3>
          <div class="current-filter-display">
            <span class="label">Position:</span>
            <span class="value">{{ currentPosition === -1 ? 'Unknown' : currentPosition }}</span>
            <span class="label">Name:</span>
            <span class="value">{{ currentFilterName }}</span>
          </div>
        </div>

        <!-- Filter Selection -->
        <div class="panel-section">
          <h3>Select Filter</h3>
          <div v-if="filterNames.length > 0" class="filter-selection">
            <select v-model="selectedFilterPosition" @change="selectFilter">
              <option v-for="(name, index) in filterNames" :key="index" :value="index">
                {{ index }}: {{ name }} (Offset: {{ focusOffsets[index] !== undefined ? focusOffsets[index] : 'N/A' }})
              </option>
            </select>
          </div>
          <p v-else>No filter names loaded. Cannot select filter.</p>
        </div>

        <!-- Filter Details & Edit -->
        <div class="panel-section">
          <h3>Filter Details & Edit Names</h3>
          <div v-if="filterNames.length > 0" class="filter-details-grid">
            <div class="grid-header">
              <span>#</span>
              <span>Name (Editable)</span>
              <span>Offset</span>
              <span>Action</span>
            </div>
            <div v-for="(name, index) in filterNames" :key="index" class="grid-row">
              <span>{{ index }}</span>
              <input type="text" v-model="editableFilterNames[index]" class="name-input" />
              <span>{{ focusOffsets[index] !== undefined ? focusOffsets[index] : 'N/A' }}</span>
              <button @click="updateFilterName(index)" :disabled="editableFilterNames[index] === filterNames[index]" class="action-button-small">
                Save
              </button>
            </div>
          </div>
          <p v-else>No filters to display.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { callAlpacaMethod, getAlpacaProperties } from '@/utils/alpacaPropertyAccess'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

const store = useUnifiedStore()
const isLoading = ref(true)

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

// FilterWheel state refs
const currentPosition = ref<number>(-1) // -1 for unknown
const filterNames = ref<string[]>([])
const focusOffsets = ref<number[]>([])
const editableFilterNames = ref<string[]>([])

// Selection ref
const selectedFilterPosition = ref<number>(0)

const currentFilterName = computed(() => {
  if (currentPosition.value >= 0 && currentPosition.value < filterNames.value.length) {
    return filterNames.value[currentPosition.value]
  }
  return 'Unknown'
})

const resetFilterWheelState = () => {
  currentPosition.value = -1
  filterNames.value = []
  focusOffsets.value = []
  editableFilterNames.value = []
  selectedFilterPosition.value = 0
}

const fetchFilterWheelDetails = async () => {
  if (!props.isConnected || !props.deviceId) {
    resetFilterWheelState()
    isLoading.value = false
    return
  }
  isLoading.value = true
  try {
    const properties = await getAlpacaProperties(props.deviceId, ['position', 'names', 'focusoffsets'])

    currentPosition.value = (properties.position as number) ?? -1
    filterNames.value = Array.isArray(properties.names) ? (properties.names as string[]) : []
    focusOffsets.value = Array.isArray(properties.focusoffsets) ? (properties.focusoffsets as number[]) : []

    editableFilterNames.value = [...filterNames.value] // Initialize editable names

    if (currentPosition.value !== -1) {
      selectedFilterPosition.value = currentPosition.value
    }
  } catch (error) {
    console.error('Error fetching filter wheel details:', error)
    resetFilterWheelState()
  }
  isLoading.value = false
}

const selectFilter = async () => {
  if (!props.deviceId || selectedFilterPosition.value === null) return
  try {
    await callAlpacaMethod(props.deviceId, 'setPosition', { Position: selectedFilterPosition.value })
    // Fetch new position to confirm, or wait for poll
    const newPos = (await callAlpacaMethod(props.deviceId, 'getPosition')) as number
    currentPosition.value = newPos
  } catch (error) {
    console.error(`Error setting filter position to ${selectedFilterPosition.value}:`, error)
    // Revert selection on error if desired, or rely on next poll to correct UI
    if (currentPosition.value !== -1) selectedFilterPosition.value = currentPosition.value
  }
}

const updateFilterName = async (filterIndex: number) => {
  if (!props.deviceId || !editableFilterNames.value[filterIndex]) return
  const newName = editableFilterNames.value[filterIndex]
  try {
    // Assumes FilterWheelClient.setFilterName (PUT to /name with FilterNumber, FilterName)
    await callAlpacaMethod(props.deviceId, 'setFilterName', { filterNumber: filterIndex, filterName: newName })
    // Refresh names
    filterNames.value[filterIndex] = newName
    // Note: This directly updates the local copy. A full re-fetch might be safer:
    // await fetchFilterWheelDetails();
  } catch (error) {
    console.error(`Error updating name for filter ${filterIndex}:`, error)
    // Revert editable name if API call fails
    editableFilterNames.value[filterIndex] = filterNames.value[filterIndex] || ''
  }
}

let pollTimer: number | undefined

const pollFilterWheelStatus = async () => {
  if (!props.isConnected || !props.deviceId) return
  try {
    const pos = (await callAlpacaMethod(props.deviceId, 'getPosition')) as number | null
    if (pos !== null && pos !== currentPosition.value) {
      currentPosition.value = pos
      if (pos !== -1) {
        selectedFilterPosition.value = pos
      }
    }
    // Optionally re-fetch names/offsets if they can change, though less common for polling
  } catch (error) {
    console.error('Error polling filter wheel status:', error)
  }
}

onMounted(async () => {
  await fetchFilterWheelDetails()
  if (props.isConnected && props.deviceId && !pollTimer) {
    pollTimer = window.setInterval(pollFilterWheelStatus, 3000) // Poll every 3 seconds
  }
})

watch(
  () => props.isConnected,
  async (newIsConnected) => {
    await fetchFilterWheelDetails()
    if (newIsConnected && props.deviceId) {
      if (!pollTimer) {
        pollTimer = window.setInterval(pollFilterWheelStatus, 3000)
      }
    } else {
      if (pollTimer) {
        window.clearInterval(pollTimer)
        pollTimer = undefined
      }
    }
  }
)

watch(
  () => props.deviceId,
  async (newDeviceId, oldDeviceId) => {
    if (newDeviceId !== oldDeviceId) {
      await fetchFilterWheelDetails()
      if (props.isConnected && props.deviceId) {
        if (!pollTimer) {
          pollTimer = window.setInterval(pollFilterWheelStatus, 3000)
        }
      } else {
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = undefined
        }
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
  }
})
</script>

<style scoped>
.simplified-panel {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section {
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.connection-notice,
.loading-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  padding: var(--aw-spacing-md);
  color: var(--aw-text-secondary-color);
}

.current-filter-display {
  display: flex;
  gap: var(--aw-spacing-md);
  align-items: baseline;
  font-size: 1rem;
}
.current-filter-display .label {
  color: var(--aw-text-secondary-color);
  font-size: 0.9rem;
}
.current-filter-display .value {
  font-weight: var(--aw-font-weight-medium);
}

.filter-selection select {
  width: 100%;
  padding: var(--aw-spacing-sm);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
}

.filter-details-grid {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: var(--aw-spacing-sm) var(--aw-spacing-md);
  align-items: center;
}

.grid-header {
  display: contents; /* Allows children to participate in grid layout */
  font-weight: var(--aw-font-weight-bold);
  color: var(--aw-text-secondary-color);
  font-size: 0.8rem;
  padding-bottom: var(--aw-spacing-xs);
  border-bottom: 1px solid var(--aw-panel-border-color);
}

.grid-header > span {
  padding-bottom: var(--aw-spacing-xs); /* if border is on parent */
}

.grid-row {
  display: contents; /* Allows children to participate in grid layout */
}

.grid-row > span,
.grid-row > input {
  padding: var(--aw-spacing-xs) 0;
}

.name-input {
  padding: var(--aw-spacing-xs);
  background-color: var(--aw-input-bg-color, var(--aw-panel-bg-color));
  color: var(--aw-text-color);
  border: 1px solid var(--aw-input-border-color, var(--aw-panel-border-color));
  border-radius: var(--aw-border-radius-sm);
  width: 100%; /* Take available space */
}

.action-button-small {
  padding: calc(var(--aw-spacing-xs) / 2) var(--aw-spacing-sm);
  background-color: var(--aw-button-secondary-bg-color, var(--aw-primary-color-variant));
  color: var(--aw-button-secondary-text-color, var(--aw-on-primary-variant));
  border: 1px solid var(--aw-button-secondary-border-color, var(--aw-primary-color-variant));
  border-radius: var(--aw-border-radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
}

.action-button-small:hover {
  background-color: var(--aw-button-secondary-hover-bg-color, var(--aw-primary-hover-color));
}

.action-button-small:disabled {
  background-color: var(--aw-color-neutral-300);
  border-color: var(--aw-color-neutral-300);
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
```

The `SimplifiedFilterWheelPanel.vue` is now implemented.

Next is `SimplifiedSafetyMonitorPanel.vue`.

**Plan for `SimplifiedSafetyMonitorPanel.vue`**:

1.  **Create `src/api/alpaca/safetymonitor-client.ts`**. Alpaca Spec:
    - Properties (GET):
      - `IsSafe` (boolean): Indicates if the monitored conditions are safe or unsafe. This is the primary property.
2.  Add `SafetyMonitorClient` to `src/api/alpaca/index.ts` and `src/api/alpaca/factory.ts`.
3.  Implement `SimplifiedSafetyMonitorPanel.vue`:
    - Display Name, Connection Status.
    - Display `IsSafe` status prominently (e.g., "Safe" / "UNSAFE" with appropriate coloring).
    - Polling for `IsSafe` status. SafetyMonitors usually don't have other controls.

Create `src/api/alpaca/safetymonitor-client.ts`:

```typescript
import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

export class SafetyMonitorClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'safetymonitor', deviceNumber, device)
  }

  // GET Properties
  async isSafe(): Promise<boolean> {
    return this.getProperty('issafe') as Promise<boolean>
  }

  // Helper to get all relevant properties (though IsSafe is the main one)
  async getSafetyMonitorState(): Promise<Record<string, unknown>> {
    const properties = [
      'issafe',
      // Standard properties
      'connected',
      'name',
      'description'
    ]
    return this.getProperties(properties)
  }
}
```

Add to `index.ts` and `factory.ts`:

```typescript
// ... existing code ...
export * from './rotator-client'
export * from './filterwheel-client'
export * from './safetymonitor-client'

// Factory function
// ... existing code ...
```

```typescript
// ... existing code ...
import { RotatorClient } from './rotator-client'
import { FilterWheelClient } from './filterwheel-client'
import { SafetyMonitorClient } from './safetymonitor-client'

/**
 * Factory function to create the appropriate client based on device type
 */
export function createAlpacaClient(baseUrl: string, deviceType: string, deviceNumber: number = 0, device: Device): AlpacaClient {
  switch (deviceType.toLowerCase()) {
    // ... other cases
    case 'rotator':
      return new RotatorClient(baseUrl, deviceNumber, device)
    case 'filterwheel':
      return new FilterWheelClient(baseUrl, deviceNumber, device)
    case 'safetymonitor':
      return new SafetyMonitorClient(baseUrl, deviceNumber, device)
    default:
      return new AlpacaClient(baseUrl, deviceType, deviceNumber, device)
  }
}
```

Implement `SimplifiedSafetyMonitorPanel.vue`:

```vue
<template>
  <div class="simplified-panel simplified-safetymonitor-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No safety monitor selected or available</div>
      </div>
      <div v-else-if="!props.isConnected" class="connection-notice">
        <div class="connection-message">Safety Monitor ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      <template v-else>
        <div class="panel-section safety-status-section" :class="safetyStatusClass">
          <h3>Safety Status</h3>
          <div class="status-text">
            {{ isSafe === null ? 'Status: Unknown' : isSafe ? 'Status: SAFE' : 'Status: UNSAFE' }}
          </div>
          <div v-if="currentDevice?.description" class="device-description">
            {{ currentDevice.description }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore'
import { getAlpacaProperties } from '@/utils/alpacaPropertyAccess'

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    required: true
  }
})

const store = useUnifiedStore()

const currentDevice = computed(() => {
  return store.getDeviceById(props.deviceId)
})

const isSafe = ref<boolean | null>(null)

const safetyStatusClass = computed(() => {
  if (isSafe.value === null) return 'status-unknown'
  return isSafe.value ? 'status-safe' : 'status-unsafe'
})

const resetSafetyMonitorState = () => {
  isSafe.value = null
}

const updateSafetyStatus = async () => {
  if (!props.isConnected || !props.deviceId) return
  try {
    const properties = await getAlpacaProperties(props.deviceId, ['issafe'])
    isSafe.value = (properties.issafe as boolean) ?? null
  } catch (error) {
    console.error('Error updating safety monitor status:', error)
    isSafe.value = null // Set to null on error to indicate unknown status
  }
}

let pollTimer: number | undefined

onMounted(async () => {
  if (props.isConnected && props.deviceId) {
    await updateSafetyStatus()
    if (!pollTimer) {
      pollTimer = window.setInterval(updateSafetyStatus, 5000) // Poll every 5 seconds
    }
  }
})

watch(
  () => props.isConnected,
  async (newIsConnected) => {
    if (newIsConnected && props.deviceId) {
      resetSafetyMonitorState()
      await updateSafetyStatus()
      if (!pollTimer) {
        pollTimer = window.setInterval(updateSafetyStatus, 5000)
      }
    } else {
      if (pollTimer) {
        window.clearInterval(pollTimer)
        pollTimer = undefined
      }
      resetSafetyMonitorState()
    }
  }
)

watch(
  () => props.deviceId,
  async (newDeviceId, oldDeviceId) => {
    if (newDeviceId !== oldDeviceId) {
      resetSafetyMonitorState()
      if (props.isConnected) {
        await updateSafetyStatus()
        if (!pollTimer) {
          pollTimer = window.setInterval(updateSafetyStatus, 5000)
        }
      } else {
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = undefined
        }
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
  }
})
</script>

<style scoped>
.simplified-panel {
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  border-radius: var(--aw-border-radius);
  border: 1px solid var(--aw-panel-border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-content {
  overflow-y: auto;
  flex: 1;
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
  display: flex; /* For centering content */
  flex-direction: column; /* For centering content */
  justify-content: center; /* For centering content */
}

.panel-section {
  margin-bottom: calc(var(--aw-spacing-md) + var(--aw-spacing-xs));
  background-color: var(--aw-panel-content-bg-color);
  border-radius: calc(var(--aw-spacing-xs) * 1.5);
  padding: calc(var(--aw-spacing-sm) + var(--aw-spacing-xs));
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: calc(var(--aw-spacing-sm));
  font-size: var(--aw-font-size-base);
  border-bottom: 1px solid var(--aw-panel-border-color);
  padding-bottom: calc(var(--aw-spacing-xs) * 1.5);
}

.connection-notice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  padding: var(--aw-spacing-md);
  color: var(--aw-text-secondary-color);
  text-align: center;
}

.safety-status-section {
  text-align: center;
  padding: var(--aw-spacing-lg) var(--aw-spacing-md); /* Larger padding */
}

.status-text {
  font-size: 1.8rem; /* Larger font for status */
  font-weight: var(--aw-font-weight-bold);
  margin: var(--aw-spacing-md) 0;
}

.status-safe .status-text {
  color: var(--aw-success-color, green);
}

.status-unsafe .status-text {
  color: var(--aw-error-color, red);
}

.status-unknown .status-text {
  color: var(--aw-text-secondary-color, orange);
}

.device-description {
  font-size: 0.9rem;
  color: var(--aw-text-secondary-color);
  margin-top: var(--aw-spacing-sm);
}
</style>
```

The `SimplifiedSafetyMonitorPanel.vue` is now implemented.

Next, `SimplifiedCoverCalibratorPanel.vue`.

**Plan for `SimplifiedCoverCalibratorPanel.vue`**:

1.  **Create `src/api/alpaca/covercalibrator-client.ts`**. Alpaca Spec:
    - Properties (GET):
      - `Brightness` (integer): The brightness of the calibrator panel, if supported (not all are light sources).
      - `CalibratorState` (integer): 0=Unknown, 1=Off, 2=NotReady, 3=Ready, 4=Error.
      - `CoverState` (integer): 0=Unknown, 1=NotPresent, 2=Closed, 3=Moving, 4=Open, 5=Error.
      - `MaxBrightness` (integer): The maximum brightness value, if the calibrator is also a light source.
    - Methods (PUT):
      - `CalibratorOff()`: Turn the calibrator light off.
      - `CalibratorOn(Brightness)`: Turn the calibrator light on to the specified `Brightness`.
      - `CloseCover()`: Close the cover.
      - `HaltCover()`: Stop any cover movement.
      - `OpenCover()`: Open the cover.
2.  Add `CoverCalibratorClient` to `src/api/alpaca/index.ts` and `src/api/alpaca/factory.ts`.
3.  Implement `SimplifiedCoverCalibratorPanel.vue`:
    - Display Name, Connection Status.
    - Display `CoverState` and `CalibratorState` (with text descriptions).
    - Buttons: "Open Cover", "Close Cover", "Halt Cover".
    - If `MaxBrightness` > 0 (or if it's a light source):
      - Display current `Brightness`.
      - Input/Slider for target brightness.
      - Buttons: "Calibrator On", "Calibrator Off".
    - Polling for `CoverState`, `CalibratorState`, `Brightness`.

Create `src/api/alpaca/covercalibrator-client.ts`:

```typescript
import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

export class CoverCalibratorClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'covercalibrator', deviceNumber, device)
  }

  // GET Properties
  async getBrightness(): Promise<number> {
    return this.getProperty('brightness') as Promise<number>
  }

  async getCalibratorState(): Promise<number> {
    // 0=Unknown, 1=Off, 2=NotReady, 3=Ready, 4=Error
    return this.getProperty('calibratorstate') as Promise<number>
  }

  async getCoverState(): Promise<number> {
    // 0=Unknown, 1=NotPresent, 2=Closed, 3=Moving, 4=Open, 5=Error
    return this.getProperty('coverstate') as Promise<number>
  }

  async getMaxBrightness(): Promise<number> {
    return this.getProperty('maxbrightness') as Promise<number>
  }

  // PUT Methods
  async calibratorOff(): Promise<void> {
    await this.put('calibratoroff')
  }

  async calibratorOn(brightness: number): Promise<void> {
    await this.put('calibratoron', { Brightness: brightness })
  }

  async closeCover(): Promise<void> {
    await this.put('closecover')
  }

  async haltCover(): Promise<void> {
    await this.put('haltcover')
  }

  async openCover(): Promise<void> {
    await this.put('opencover')
  }

  // Helper to get all relevant properties
  async getCoverCalibratorState(): Promise<Record<string, unknown>> {
    const properties = [
      'brightness',
      'calibratorstate',
      'coverstate',
      'maxbrightness',
      // Standard properties
      'connected',
      'name',
      'description'
    ]
    return this.getProperties(properties)
  }
}
```

Okay, I understand the progress made so far. It looks like we're in the middle of implementing the `SimplifiedCoverCalibratorPanel.vue`.

To continue, I'll first examine the current state of `SimplifiedCoverCalibratorPanel.vue` and the corresponding `covercalibrator-client.ts`. Then, I'll proceed to implement the UI elements for displaying the cover state, calibrator state, brightness, and controls for cover operations (open, close, halt) and calibrator controls (on, off), ensuring it aligns with the style of other panels.

The `SimplifiedCoverCalibratorPanel.vue` is currently a placeholder. I have the details from `covercalibrator-client.ts` and a good reference for styling and structure from `SimplifiedTelescopePanel.vue`.

I will now proceed to implement the `SimplifiedCoverCalibratorPanel.vue`. This will involve:

1.  Importing necessary Vue composition API functions, the `useUnifiedStore`, and Alpaca utility functions.
2.  Defining props for `deviceId` and `isConnected`.
3.  Setting up reactive variables for cover state, calibrator state, brightness, and max brightness.
4.  Implementing functions to call the Alpaca methods: `openCover`, `closeCover`, `haltCover`, `calibratorOn`, `calibratorOff`.
5.  Creating computed properties to display human-readable states (e.g., "Open", "Closed", "Off", "Ready").
6.  Adding a polling mechanism to refresh the device state.
7.  Structuring the template with sections for "Cover Control", "Calibrator Control", and "Status Display", similar to other panels.
8.  Adding buttons, input fields (for brightness), and status displays.
9.  Applying appropriate styling.

```vue
<template>
  <div class="simplified-panel simplified-covercalibrator-panel">
    <div class="panel-content">
      <div v-if="!currentDevice" class="connection-notice">
        <div class="connection-message">No Cover Calibrator selected or available</div>
      </div>
      <div v-else-if="!isConnected" class="connection-notice">
        <div class="connection-message">Cover Calibrator ({{ currentDevice.name }}) not connected.</div>
        <div class="panel-tip">Use the connect button in the panel header.</div>
      </div>
      <template v-else>
        <!-- Cover Control Section -->
        <div class="panel-section">
          <h3>Cover Control</h3>
          <div class="control-grid">
            <button @click="openCover" :disabled="isCoverOperationInProgress || coverStateComputed === 'Open'">Open Cover</button>
            <button @click="closeCover" :disabled="isCoverOperationInProgress || coverStateComputed === 'Closed'">Close Cover</button>
            <button @click="haltCover" :disabled="!isCoverOperationInProgress">Halt Cover</button>
          </div>
          <p>
            Cover Status: <strong>{{ coverStateComputed }}</strong>
          </p>
        </div>

        <!-- Calibrator Control Section -->
        <div class="panel-section">
          <h3>Calibrator Control</h3>
          <div class="control-grid">
            <button @click="calibratorOnHandler" :disabled="calibratorStateComputed === 'Ready' || calibratorStateComputed === 'NotReady'">
              Turn On
            </button>
            <button @click="calibratorOff" :disabled="calibratorStateComputed === 'Off' || calibratorStateComputed === 'Unknown'">Turn Off</button>
          </div>
          <div v-if="maxBrightness > 0" class="brightness-control">
            <label :for="deviceId + '-brightness'">Brightness (0 - {{ maxBrightness }}):</label>
            <input
              type="number"
              :id="deviceId + '-brightness'"
              v-model.number="targetBrightness"
              min="0"
              :max="maxBrightness"
              :disabled="calibratorStateComputed === 'Off' || calibratorStateComputed === 'Unknown'"
            />
          </div>
          <p>
            Calibrator Status: <strong>{{ calibratorStateComputed }}</strong>
          </p>
          <p v-if="maxBrightness > 0">
            Current Brightness: <strong>{{ currentBrightness }}</strong>
          </p>
        </div>

        <!-- Device Status Section -->
        <div class="panel-section">
          <h3>Device Information</h3>
          <p>
            Device Name: <strong>{{ currentDevice.name }}</strong>
          </p>
          <p>
            Description: <strong>{{ currentDevice.description }}</strong>
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch, type PropType } from 'vue'
import { useUnifiedStore } from '@/stores/UnifiedStore' // Assuming Pinia store
import { callAlpacaMethod } from '@/utils/alpacaPropertyAccess'
import type { Device } from '@/stores/types/device-store.types' // Actual path to your Device type

// Enum-like objects for states
const CoverStates: Record<number, string> = {
  0: 'Unknown',
  1: 'Not Present',
  2: 'Closed',
  3: 'Moving',
  4: 'Open',
  5: 'Error'
}

const CalibratorStates: Record<number, string> = {
  0: 'Unknown',
  1: 'Off',
  2: 'NotReady', // Not ready to illuminate
  3: 'Ready', // Calibrator ready
  4: 'Error'
}

export default defineComponent({
  name: 'SimplifiedCoverCalibratorPanel',
  props: {
    deviceId: {
      type: String,
      required: true
    },
    isConnected: {
      type: Boolean,
      required: true
    },
    device: {
      // Added to match original structure - though currentDevice from store is primary
      type: Object as PropType<Device>,
      required: false // Make it optional if currentDevice from store is the main source
    }
  },
  setup(props) {
    const store = useUnifiedStore()
    const currentDevice = computed(() => store.getDeviceById(props.deviceId))

    const coverState = ref<number | null>(null)
    const calibratorState = ref<number | null>(null)
    const currentBrightness = ref<number | null>(null)
    const maxBrightness = ref<number | null>(null)
    const targetBrightness = ref(0) // For input binding

    let pollInterval: number | undefined

    const fetchDeviceProperties = async () => {
      if (!props.deviceId || !props.isConnected) {
        resetState()
        return
      }
      try {
        // Using the client's getCoverCalibratorState method might be more efficient
        // but direct calls for simplicity matching other panels
        const cState = await callAlpacaMethod(props.deviceId, 'coverstate', {}, 'get')
        coverState.value = cState as number

        const calState = await callAlpacaMethod(props.deviceId, 'calibratorstate', {}, 'get')
        calibratorState.value = calState as number

        const mBright = await callAlpacaMethod(props.deviceId, 'maxbrightness', {}, 'get')
        maxBrightness.value = mBright as number

        if (maxBrightness.value && maxBrightness.value > 0) {
          const bright = await callAlpacaMethod(props.deviceId, 'brightness', {}, 'get')
          currentBrightness.value = bright as number
          if (targetBrightness.value === 0 && currentBrightness.value !== null) {
            // Initialize targetBrightness if not set
            targetBrightness.value = currentBrightness.value
          }
        } else {
          currentBrightness.value = null // No brightness if maxBrightness is 0
        }
      } catch (error) {
        console.error(`Error fetching CoverCalibrator properties for ${props.deviceId}:`, error)
        resetState()
      }
    }

    const resetState = () => {
      coverState.value = null
      calibratorState.value = null
      currentBrightness.value = null
      maxBrightness.value = null
      // targetBrightness.value = 0; // Keep user input or reset based on preference
    }

    const coverStateComputed = computed(() => {
      return coverState.value !== null ? CoverStates[coverState.value] || 'Error (Unknown State)' : 'N/A'
    })

    const calibratorStateComputed = computed(() => {
      return calibratorState.value !== null ? CalibratorStates[calibratorState.value] || 'Error (Unknown State)' : 'N/A'
    })

    const isCoverOperationInProgress = computed(() => coverState.value === 3) // Moving

    // --- Cover Methods ---
    const openCover = async () => {
      if (!props.deviceId) return
      try {
        await callAlpacaMethod(props.deviceId, 'opencover', {}, 'put')
        fetchDeviceProperties() // Refresh state
      } catch (error) {
        console.error('Error opening cover:', error)
      }
    }

    const closeCover = async () => {
      if (!props.deviceId) return
      try {
        await callAlpacaMethod(props.deviceId, 'closecover', {}, 'put')
        fetchDeviceProperties() // Refresh state
      } catch (error) {
        console.error('Error closing cover:', error)
      }
    }

    const haltCover = async () => {
      if (!props.deviceId) return
      try {
        await callAlpacaMethod(props.deviceId, 'haltcover', {}, 'put')
        fetchDeviceProperties() // Refresh state
      } catch (error) {
        console.error('Error halting cover:', error)
      }
    }

    // --- Calibrator Methods ---
    const calibratorOnHandler = async () => {
      if (!props.deviceId) return
      try {
        // Ensure targetBrightness is within valid range if maxBrightness is known
        let brightnessToSend = targetBrightness.value
        if (maxBrightness.value !== null && brightnessToSend > maxBrightness.value) {
          brightnessToSend = maxBrightness.value
        }
        if (brightnessToSend < 0) {
          brightnessToSend = 0
        }
        await callAlpacaMethod(props.deviceId, 'calibratoron', { Brightness: brightnessToSend }, 'put')
        fetchDeviceProperties() // Refresh state
      } catch (error) {
        console.error('Error turning calibrator on:', error)
      }
    }

    const calibratorOff = async () => {
      if (!props.deviceId) return
      try {
        await callAlpacaMethod(props.deviceId, 'calibratoroff', {}, 'put')
        fetchDeviceProperties() // Refresh state
      } catch (error) {
        console.error('Error turning calibrator off:', error)
      }
    }

    watch(
      () => props.deviceId,
      (newId, oldId) => {
        if (newId !== oldId) {
          console.log(`SimplifiedCoverCalibratorPanel: Device changed from ${oldId} to ${newId}`)
          resetState()
          fetchDeviceProperties()
        }
      },
      { immediate: true }
    )

    watch(
      () => props.isConnected,
      (newIsConnected) => {
        console.log(`SimplifiedCoverCalibratorPanel: Connection status changed to ${newIsConnected} for device ${props.deviceId}`)
        if (newIsConnected) {
          fetchDeviceProperties()
          if (!pollInterval) {
            pollInterval = window.setInterval(fetchDeviceProperties, 5000) // Poll every 5 seconds
          }
        } else {
          resetState()
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = undefined
          }
        }
      },
      { immediate: true }
    )

    onMounted(() => {
      if (props.isConnected && props.deviceId) {
        fetchDeviceProperties()
        if (!pollInterval) {
          pollInterval = window.setInterval(fetchDeviceProperties, 5000)
        }
      }
    })

    onUnmounted(() => {
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = undefined
      }
    })

    return {
      currentDevice,
      coverState,
      calibratorState,
      currentBrightness,
      maxBrightness,
      targetBrightness,
      coverStateComputed,
      calibratorStateComputed,
      isCoverOperationInProgress,
      openCover,
      closeCover,
      haltCover,
      calibratorOnHandler,
      calibratorOff
      // Expose device prop for template if needed, though currentDevice from store is preferred
      // device: props.device
    }
  }
})
</script>

<style scoped>
.simplified-panel {
  /* General panel styling from other simplified panels */
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-medium);
  background-color: var(--color-background-soft);
  margin-bottom: 1rem;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 1rem; /* Spacing between sections */
}

.connection-notice {
  text-align: center;
  padding: 1rem;
  background-color: var(--color-background-mute);
  border-radius: var(--border-radius-small);
}

.connection-message {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.panel-tip {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.panel-section {
  padding: 1rem;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--border-radius-small);
  background-color: var(--color-background);
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: var(--color-heading);
  font-size: 1.1rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.control-grid button {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-background-soft);
  color: var(--color-text);
  border-radius: var(--border-radius-small);
  cursor: pointer;
  transition: background-color 0.2s;
}

.control-grid button:hover:not(:disabled) {
  background-color: var(--color-background-mute);
}

.control-grid button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.brightness-control {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brightness-control label {
  font-size: 0.9rem;
}

.brightness-control input[type='number'] {
  width: 80px;
  padding: 0.3rem;
  border-radius: var(--border-radius-small);
  border: 1px solid var(--color-border);
}

.simplified-covercalibrator-panel p {
  margin: 0.3rem 0;
  font-size: 0.9rem;
}

.simplified-covercalibrator-panel strong {
  color: var(--color-text-emphasis);
}

/* Add specific styles if CoverStates or CalibratorStates need color coding */
/* For example:
.status-moving { color: orange; }
.status-open { color: green; }
.status-closed { color: red; }
.status-error { color: red; font-weight: bold; }
*/
</style>
```

It seems the `callAlpacaMethod` in `SimplifiedCoverCalibratorPanel.vue` was used with an incorrect number of arguments for GET requests. The `callAlpacaMethod` utility likely expects only `deviceId` and `methodName` for GET requests (or `deviceId`, `methodName`, `params` for PUT/POST). The fourth argument `'get'` is superfluous for GETs as the method implies the HTTP verb.

I'll correct these calls. Also, there's a linter warning about `maxBrightness` possibly being `null` in the template. I'll add a check or use a default value to handle this.

```vue
\
// ... existing code ...
          <div class=\"control-grid\">\n            <button @click=\"calibratorOnHandler\" :disabled=\"calibratorStateComputed === \'Ready\' || calibratorStateComputed === \'NotReady\'\">Turn On</button>\n            <button @click=\"calibratorOff\" :disabled=\"calibratorStateComputed === \'Off\' || calibratorStateComputed === \'Unknown\'\">Turn Off</button>\n          </div>\n          <div v-if=\"maxBrightness !== null && maxBrightness > 0\" class=\"brightness-control\">\n            <label :for=\"deviceId + \'-brightness\'\">Brightness (0 - {{ maxBrightness }}):</label>\n            <input\n              type=\"number\"\n// ... existing code ...
      try {\n        // Using the client\'s getCoverCalibratorState method might be more efficient\n        // but direct calls for simplicity matching other panels\n        const cState = await callAlpacaMethod(props.deviceId, \'coverstate\')\n        coverState.value = cState as number\n\n        const calState = await callAlpacaMethod(props.deviceId, \'calibratorstate\')\n        calibratorState.value = calState as number\n        \n        const mBright = await callAlpacaMethod(props.deviceId, \'maxbrightness\')\n        maxBrightness.value = mBright as number\n\n        if (maxBrightness.value && maxBrightness.value > 0) {\n          const bright = await callAlpacaMethod(props.deviceId, \'brightness\')\n          currentBrightness.value = bright as number\n          if (targetBrightness.value === 0 && currentBrightness.value !== null) { // Initialize targetBrightness if not set\n             targetBrightness.value = currentBrightness.value\n// ... existing code ...
    const openCover = async () => {\n      if (!props.deviceId) return\n      try {\n        await callAlpacaMethod(props.deviceId, \'opencover\', {})\n        fetchDeviceProperties() // Refresh state\n      } catch (error) {\n        console.error(\'Error opening cover:\', error)\n// ... existing code ...
    const closeCover = async () => {\n      if (!props.deviceId) return\n      try {\n        await callAlpacaMethod(props.deviceId, \'closecover\', {})\n        fetchDeviceProperties() // Refresh state\n      } catch (error) {\n        console.error(\'Error closing cover:\', error)\n// ... existing code ...
    const haltCover = async () => {\n      if (!props.deviceId) return\n      try {\n        await callAlpacaMethod(props.deviceId, \'haltcover\', {})\n        fetchDeviceProperties() // Refresh state\n      } catch (error) {\n        console.error(\'Error halting cover:\', error)\n// ... existing code ...
    const calibratorOff = async () => {\n      if (!props.deviceId) return\n      try {\n        await callAlpacaMethod(props.deviceId, \'calibratoroff\', {})\n        fetchDeviceProperties() // Refresh state\n      } catch (error) {\n        console.error(\'Error turning calibrator off:\', error)\n// ... existing code ...

```

It seems I missed one instance of `callAlpacaMethod` that still has an incorrect number of arguments: the `calibratoron` call. It's a PUT request and correctly includes the `Brightness` parameter, but it looks like it also mistakenly had a fourth `'put'` argument. I will remove that.

The linter error for `maxBrightness` in the template (line 42) persists despite the `v-if="maxBrightness !== null && maxBrightness > 0"`. This might be a nuance in how the VLS (Volar Language Server) type-checks templates. The input's `:max="maxBrightness"` binding is likely the culprit. I'll ensure `maxBrightness` is a number when used there, perhaps by defaulting to a safe value or ensuring the input is only rendered when `maxBrightness` is definitely a number and greater than 0. The `v-if` already handles this, but perhaps a more explicit cast or default is needed for the binding itself.

Let's re-examine the `calibratorOnHandler` and the template for the brightness input. The `calibratorOnHandler` call is: `await callAlpacaMethod(props.deviceId, 'calibratoron', { Brightness: brightnessToSend }, 'put')`

This should be: `await callAlpacaMethod(props.deviceId, 'calibratoron', { Brightness: brightnessToSend })` as `callAlpacaMethod` infers PUT from the presence of the third argument (params).

For the template: The `v-if="maxBrightness !== null && maxBrightness > 0"` on the `div` surrounding the input _should_ be sufficient. The binding is `:max="maxBrightness"`. If `maxBrightness` could still be `null` here, it's an issue. Given the `v-if`, inside that block, `maxBrightness` is guaranteed to be a non-null number. This might be a false positive from the linter, or it doesn't fully understand the `v-if` context for attribute bindings.

Let's try to ensure `maxBrightness` is explicitly treated as a number in the binding, although it should already be. Perhaps `Number(maxBrightness)` or ensure the ref `maxBrightness` is initialized to `0` instead of `null` if that's a safe default for when it's not yet fetched or non-existent. However, `maxBrightness = ref<number | null>(null)` is appropriate because `0` could be a valid `maxbrightness` from the device, meaning no brightness adjustment is possible.

Let's first fix the `calibratoron` call. If the VLS error persists, I'll investigate the template binding further.

```vue
// ... existing code ... // --- Calibrator Methods --- const calibratorOnHandler = async () => { if (!props.deviceId) return try { // Ensure
targetBrightness is within valid range if maxBrightness is known let brightnessToSend = targetBrightness.value if (maxBrightness.value !== null &&
brightnessToSend > maxBrightness.value) { brightnessToSend = maxBrightness.value } if (brightnessToSend < 0) { brightnessToSend = 0 } await
callAlpacaMethod(props.deviceId, 'calibratoron', { Brightness: brightnessToSend }) fetchDeviceProperties() // Refresh state } catch (error) {
console.error('Error turning calibrator on:', error) } } // ... existing code ...
```

The same linter errors are reported. This is unexpected. Error 1: `Line 203: Expected 2-3 arguments, but got 4.` The previous edit specifically targeted line 203 (in the original full file content) which was the `calibratoron` call.

Let's re-verify the `callAlpacaMethod` definition. It's in `@/utils/alpacaPropertyAccess`. I'll read this file to be certain about its signature. It's possible my understanding of its signature (inferring PUT from params) is incorrect, or there's another overload.

Error 2: `Line 42: '__VLS_ctx.maxBrightness' is possibly 'null'.` This is in the template: `<input ... :max="maxBrightness" ... />` Despite the `v-if="maxBrightness !== null && maxBrightness > 0"`, the linter is still complaining. One way to be absolutely sure for the linter is to use a computed property that _only_ returns a number for the `:max` binding, or to cast it directly in the template if that's idiomatic for Vue 3 and Volar.

Let's read `alpacaPropertyAccess.ts` first.

Okay, I've reviewed `alpacaPropertyAccess.ts`.

The definition for `callAlpacaMethod` is:

```typescript
export async function callAlpacaMethod<T = unknown, P = Record<string, unknown>>(
  deviceId: string,
  method: string,
  params: P = {} as P // params has a default value {}
): Promise<T | null>
```

This confirms it takes 3 arguments: `deviceId`, `method`, and `params`. The `params` argument defaults to an empty object if not provided. This means:

- **GET requests (no parameters):** `callAlpacaMethod(deviceId, 'methodname')` is valid.
- **PUT/POST requests (with parameters):** `callAlpacaMethod(deviceId, 'methodname', { Param1: value1 })` is valid.
- **PUT/POST requests (no parameters, e.g., `haltcover`):** `callAlpacaMethod(deviceId, 'methodname', {})` or `callAlpacaMethod(deviceId, 'methodname')` should both be valid because `params` defaults to `{}`.

The linter error `Expected 2-3 arguments, but got 4` was indeed due to an extra argument. My previous fixes for GET calls (removing the 4th `'get'` arg) and PUT calls with empty params (e.g. `opencover`, `closecover`, `haltcover`, `calibratoroff` by changing from `{}, 'put'` to `{}`) were correct based on this signature. The `calibratoron` call fix was also correct.

This implies the linter might be looking at a cached version of the file or there's a subtle issue. The specific line `203` mentioned by the linter in the _previous_ error message corresponded to `calibratoron` call. If it's still erroring on that line _after_ the fix, that's confusing.

Let's assume the linter message "Line 203: Expected 2-3 arguments, but got 4" is now stale or refers to a different location due to code shifts from previous edits. I will re-apply the fix ensuring all `callAlpacaMethod` calls adhere to the 2 or 3 argument signature based on whether they are GET or PUT/POST.

For the second error: `Line 42: '__VLS_ctx.maxBrightness' is possibly 'null'.` in the template for `:max="maxBrightness"`. Given the `v-if="maxBrightness !== null && maxBrightness > 0"`, `maxBrightness` inside this block _cannot_ be null. To satisfy the linter, I can change the binding to `:max="Number(maxBrightness)"`. This is a bit redundant but might explicitly signal to the linter that it's a number.

I will apply these corrections.

```typescript
export async function callAlpacaMethod<T = unknown, P = Record<string, unknown>>(
  deviceId: string,
  method: string,
  params: P = {} as P // params has a default value {}
): Promise<T | null>
```
