import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'
import { toAscomValue } from '@/types/value-transforms'

export interface ISwitchDetail {
  name: string
  value: number | boolean // Switches can be boolean or have numeric values
  description: string
  min?: number
  max?: number
  step?: number
  canAsync?: boolean
  canWrite?: boolean
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

  // Capability checks
  async canAsync(id: number): Promise<boolean> {
    return this.get('canasync', { Id: id }) as Promise<boolean>
  }

  async canWrite(id: number): Promise<boolean> {
    return this.get('canwrite', { Id: id }) as Promise<boolean>
  }

  // PUT Methods
  async setSwitchName(id: number, name: string): Promise<void> {
    await this.put('setswitchname', { Id: id, Name: name })
  }

  async setSwitchValue(id: number, value: number): Promise<void> {
    await this.put('setswitchvalue', { Id: id, Value: value })
  }

  async setSwitch(id: number, state: boolean): Promise<void> {
    await this.put('setswitch', { Id: id, State: toAscomValue(state) as string })
  }

  // Asynchronous PUT Methods
  async setAsyncSwitch(id: number, state: boolean): Promise<void> {
    await this.put('setasync', { Id: id, State: toAscomValue(state) as string })
  }

  async setAsyncSwitchValue(id: number, value: number): Promise<void> {
    await this.put('setasyncvalue', { Id: id, Value: value })
  }

  // Asynchronous GET Method
  async isStateChangeComplete(id: number, transactionID: number): Promise<boolean> {
    return this.get('statechangecomplete', { Id: id, TransactionID: transactionID }) as Promise<boolean>
  }

  // Helper to get all details for a specific switch
  async getSwitchDetails(id: number): Promise<ISwitchDetail> {
    const name = await this.getSwitchName(id)
    const value = await this.getSwitchValue(id)
    const description = await this.getSwitchDescription(id)
    const canAsyncStatus = await this.canAsync(id) // Fetch canAsync
    const canWriteStatus = await this.canWrite(id) // Fetch canWrite

    // For value-based switches, get min/max/step
    // This is a simplification; a device might not support all of these or might be boolean-only.
    // A more robust implementation would check CanWrite for value/name and device capabilities.
    let sMin, sMax, sStep
    let min, max, step

    try {
      sMin = await this.minSwitchValue(id)
    } catch (e) {
      console.warn(`Could not get minSwitchValue for switch ${id}`, e)
    }
    try {
      sMax = await this.maxSwitchValue(id)
    } catch (e) {
      console.warn(`Could not get maxSwitchValue for switch ${id}`, e)
    }
    try {
      sStep = await this.switchStep(id)
    } catch (e) {
      console.warn(`Could not get switchStep for switch ${id}`, e)
    }

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

    return {
      name,
      value,
      description,
      min,
      max,
      step,
      canAsync: canAsyncStatus,
      canWrite: canWriteStatus
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
