import { Device, DeviceFactory } from './Device'

export class Telescope extends Device {
  readonly deviceType: string = 'telescope'
  connected: boolean = false
  constructor() {
    super()
  }
  declare idx: number
}

DeviceFactory.deviceTypeMap.set('Telescope', Telescope)
