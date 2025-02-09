import { DeviceFactory, type Device } from './Device'

export class Camera implements Device {
  readonly deviceType: string = 'camera'
  connected: boolean = false
  constructor() {}
  idx!: number
}

DeviceFactory.deviceTypeMap.set('Camera', Camera)
