import { Device, DeviceFactory } from './Device'

// COMMON
// connecting
// devicestate
// connected
// description
// driverinfo
// driverversion
// interfaceversion
// name
// supportedactions

export class Telescope extends Device {
  readProperties = [
    'alignmentmode',
    'altitude',
    'aperturearea',
    'aperturediameter',
    'athome',
    'atpark',
    'axisrates',
    'azimuth',
    'canfindhome',
    'canmoveaxis',
    'canpark',
    'canpulseguide',
    'cansetdeclinationrate',
    'cansetguiderate',
    'cansetpark',
    'cansetpierside',
    'cansetrightascensionrate',
    'cansettracking',
    'canslew',
    'canslewaltaz',
    'canslewaltazasync',
    'canslewasync',
    'cansync',
    'cansyncaltaz',
    'canunpark',
    'declination',
    'declinationrate',
    'destinationsideofpier',
    'doesrefraction',
    'equatorialsystem',
    'focallength',
    'guideratedeclination',
    'guideraterightascension',
    'ispulseguiding',
    'rightascension',
    'rigthascensionrate',
    'sideofpier',
    'siderealtime',
    'siteelevation',
    'sitelatitude',
    'sitelongitude',
    'slewing',
    'slewsettletime',
    'targetdeclination',
    'targetrightascension',
    'tracking',
    'trackingrate',
    'trackingrates',
    'utcdate'
  ]

  writeProperties = [
    'abortslew',
    'declinationrate',
    'doesrefraction',
    'findhome',
    'guideratedeclination',
    'guideraterightascension',
    'moveaxis',
    'park',
    'pulseguide',
    'rigthascensionrate',
    'setpark',
    'sideofpier',
    'siteelevation',
    'sitelatitude',
    'sitelongitude',
    'slewsettletime',
    'slewtoaltaz',
    'slewtocoordinates',
    'slewtocoordinatesasync',
    'slewtotarget',
    'slewtotargetasync',
    'synctoaltaz',
    'synctocoordinates',
    'synctotarget',
    'targetdeclination',
    'targetrightascension',
    'tracking',
    'trackingrate',
    'utcdate',
    'unpark',
    'connect',
    'disconnect',
    'action',
    'commandblind',
    'commandbool',
    'commandstring',
    'connected'
  ]
  readonly deviceType: string = 'telescope'
  connected: boolean = false
  constructor() {
    super()
  }
  declare idx: number
}

DeviceFactory.deviceTypeMap.set('telescope', Telescope)
