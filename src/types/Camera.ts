// Status: Legacy - To Be Refactored
// This module provides legacy camera class definition that:
// - Will be replaced by CameraDevice interface from DeviceTypes.ts
// - Currently used for backward compatibility
// - Should be migrated to use UnifiedDevice interface
// - Will be consolidated with DeviceTypes.ts
// - Will be removed once migration is complete

import { DeviceFactory, type Device } from './Device'

export class Camera implements Device {
  readonly deviceType: string = 'camera'
  connected: boolean = false
  idx!: number

  // Common properties
  readProperties = [
    'connected',
    'description',
    'driverinfo',
    'driverversion',
    'interfaceversion',
    'name',
    'supportedactions',
    // Camera specific properties
    'binx',
    'biny',
    'camerastate',
    'canabortexposure',
    'canfastreadout',
    'cangetcoolerpower',
    'canpulseguide',
    'cansetccdtemperature',
    'canstopexposure',
    'ccdtemperature',
    'coolerpower',
    'electronsperadu',
    'exposuremax',
    'exposuremin',
    'exposureresolution',
    'fastreadout',
    'fullwellcapacity',
    'gain',
    'gainmax',
    'gainmin',
    'gains',
    'hasadjustablefan',
    'hasadjustablegain',
    'hasadjustableoffset',
    'hasadjustableport',
    'hasadjustableshutter',
    'hasadjustabletemperature',
    'hasasymmetricbins',
    'hasfastreadout',
    'hasport',
    'hasreadoutmodes',
    'hasreversiblecooler',
    'hasreversiblefan',
    'hasreversibleport',
    'hasreversibleshutter',
    'hasshutter',
    'imageready',
    'isprimary',
    'lasttemperature',
    'maxadu',
    'maxbinx',
    'maxbiny',
    'maxgain',
    'maxoffset',
    'maxport',
    'maxreadoutrate',
    'maxx',
    'maxy',
    'minbinx',
    'minbiny',
    'mingain',
    'minoffset',
    'minport',
    'minreadoutrate',
    'minx',
    'miny',
    'numports',
    'offset',
    'offsetmax',
    'offsetmin',
    'offsetresolution',
    'percentcompleted',
    'pixelsizex',
    'pixelsizey',
    'port',
    'ports',
    'readoutmode',
    'readoutmodes',
    'readoutrate',
    'readoutrates',
    'sensorname',
    'sensortype',
    'setccdtemperature',
    'shutterstatus',
    'startx',
    'starty',
    'subexposureduration',
    'temperature',
    'xsize',
    'ysize'
  ]

  writeProperties = [
    'connected',
    'action',
    'commandblind',
    'commandbool',
    'commandstring',
    'abortexposure',
    'binx',
    'biny',
    'fastreadout',
    'gain',
    'offset',
    'port',
    'readoutmode',
    'readoutrate',
    'setccdtemperature',
    'startx',
    'starty',
    'subexposureduration'
  ]

  constructor() {}
}

DeviceFactory.deviceTypeMap.set('camera', Camera)
