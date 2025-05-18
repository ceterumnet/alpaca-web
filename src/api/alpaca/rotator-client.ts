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
    await this.setProperty('reverse', reverseState) // Use setProperty for correct value formatting
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
