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
      console.warn(`Could not get min/max/step for switch ${id}`, e)
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
