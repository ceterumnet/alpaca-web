import type { Device } from '@/stores/types/device-store.types'
import { AlpacaClient } from './base-client'

// Interface for the structure of all properties from an ObservingConditions device
export interface IObservingConditionsData {
  averageperiod?: number
  cloudcover?: number
  dewpoint?: number
  humidity?: number
  pressure?: number
  rainrate?: number
  skybrightness?: number
  skyquality?: number
  skytemperature?: number
  starfwhm?: number
  temperature?: number
  winddirection?: number
  windgust?: number
  windspeed?: number
  // Standard properties
  connected?: boolean
  name?: string
  description?: string
}

export class ObservingConditionsClient extends AlpacaClient {
  constructor(baseUrl: string, deviceNumber: number = 0, device: Device) {
    super(baseUrl, 'observingconditions', deviceNumber, device)
  }

  // Property Getters
  async getAveragePeriod(): Promise<number> {
    return this.getProperty('averageperiod') as Promise<number>
  }

  async getCloudCover(): Promise<number> {
    return this.getProperty('cloudcover') as Promise<number>
  }

  async getDewPoint(): Promise<number> {
    return this.getProperty('dewpoint') as Promise<number>
  }

  async getHumidity(): Promise<number> {
    return this.getProperty('humidity') as Promise<number>
  }

  async getPressure(): Promise<number> {
    return this.getProperty('pressure') as Promise<number>
  }

  async getRainRate(): Promise<number> {
    return this.getProperty('rainrate') as Promise<number>
  }

  async getSkyBrightness(): Promise<number> {
    return this.getProperty('skybrightness') as Promise<number>
  }

  async getSkyQuality(): Promise<number> {
    return this.getProperty('skyquality') as Promise<number>
  }

  async getSkyTemperature(): Promise<number> {
    return this.getProperty('skytemperature') as Promise<number>
  }

  async getStarFWHM(): Promise<number> {
    return this.getProperty('starfwhm') as Promise<number>
  }

  async getTemperature(): Promise<number> {
    return this.getProperty('temperature') as Promise<number>
  }

  async getWindDirection(): Promise<number> {
    return this.getProperty('winddirection') as Promise<number>
  }

  async getWindGust(): Promise<number> {
    return this.getProperty('windgust') as Promise<number>
  }

  async getWindSpeed(): Promise<number> {
    return this.getProperty('windspeed') as Promise<number>
  }

  // Property Setter
  async setAveragePeriod(period: number): Promise<void> {
    await this.put('averageperiod', { AveragePeriod: period })
  }

  // Methods for specific sensor info (less commonly used in simple panels)
  async getSensorDescription(sensorName: string): Promise<string> {
    return this.get('sensordescription', { SensorName: sensorName }) as Promise<string>
  }

  async getTimeSinceLastUpdate(sensorName: string): Promise<number> {
    return this.get('timesincelastupdate', { SensorName: sensorName }) as Promise<number>
  }

  // Helper to get all observing conditions properties
  async getAllConditions(): Promise<IObservingConditionsData> {
    const properties: (keyof IObservingConditionsData)[] = [
      'averageperiod',
      'cloudcover',
      'dewpoint',
      'humidity',
      'pressure',
      'rainrate',
      'skybrightness',
      'skyquality',
      'skytemperature',
      'starfwhm',
      'temperature',
      'winddirection',
      'windgust',
      'windspeed',
      // Standard properties that might be included by getProperties
      'connected',
      'name',
      'description'
    ]
    // The getProperties method in BaseClient fetches all listed properties.
    // It returns a Record<string, unknown>. We cast it to IObservingConditionsData.
    return this.getProperties(properties as string[]) as Promise<IObservingConditionsData>
  }
}
