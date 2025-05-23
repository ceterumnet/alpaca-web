// Status: New - Core Type Definition
// This module provides property mapping types that:
// - Maps ASCOM Alpaca properties to TypeScript interfaces
// - Defines property name transformations
// - Supports property validation rules
// - Maintains type safety across the system

/**
 * Defines the mapping between ASCOM property names and TypeScript interface properties
 */
export interface PropertyMapping {
  ascomName: string // The original ASCOM property name (lowercase for URL paths)
  tsName: string // The TypeScript interface property name (camelCase)
  type: PropertyType // The TypeScript type for the property
  validation?: PropertyValidation // Optional validation rules
  defaultValue?: unknown // Default value if property is not available
  description?: string // Property description from ASCOM spec
}

/**
 * Supported property types in the TypeScript interface
 */
export enum PropertyType {
  Boolean = 'boolean',
  Number = 'number',
  String = 'string',
  Array = 'array',
  Object = 'object',
  Enum = 'enum'
}

/**
 * Validation rules for property values
 */
export interface PropertyValidation {
  required?: boolean // Whether the property is required
  min?: number // Minimum value for numeric properties
  max?: number // Maximum value for numeric properties
  pattern?: string // Regex pattern for string validation
  enum?: unknown[] // Valid values for enum properties
  custom?: (value: unknown) => boolean // Custom validation function
}

/**
 * Property name formats in ASCOM Alpaca
 */
export enum PropertyNameFormat {
  URL = 'url', // Lowercase for URL paths (e.g., 'binx')
  PARAM = 'param', // Properly capitalized for request parameters (e.g., 'BinX')
  TS = 'ts' // camelCase for TypeScript interfaces (e.g., 'binX')
}

/**
 * Maps ASCOM property names to their different formats
 * This ensures consistent property naming across the system
 */
export const propertyNameFormats: Record<string, Record<PropertyNameFormat, string>> = {
  // Common properties
  connected: {
    [PropertyNameFormat.URL]: 'connected',
    [PropertyNameFormat.PARAM]: 'Connected',
    [PropertyNameFormat.TS]: 'isConnected'
  },
  description: {
    [PropertyNameFormat.URL]: 'description',
    [PropertyNameFormat.PARAM]: 'Description',
    [PropertyNameFormat.TS]: 'description'
  },
  driverinfo: {
    [PropertyNameFormat.URL]: 'driverinfo',
    [PropertyNameFormat.PARAM]: 'DriverInfo',
    [PropertyNameFormat.TS]: 'driverInfo'
  },
  driverversion: {
    [PropertyNameFormat.URL]: 'driverversion',
    [PropertyNameFormat.PARAM]: 'DriverVersion',
    [PropertyNameFormat.TS]: 'driverVersion'
  },
  interfaceversion: {
    [PropertyNameFormat.URL]: 'interfaceversion',
    [PropertyNameFormat.PARAM]: 'InterfaceVersion',
    [PropertyNameFormat.TS]: 'interfaceVersion'
  },
  name: {
    [PropertyNameFormat.URL]: 'name',
    [PropertyNameFormat.PARAM]: 'Name',
    [PropertyNameFormat.TS]: 'name'
  },
  supportedactions: {
    [PropertyNameFormat.URL]: 'supportedactions',
    [PropertyNameFormat.PARAM]: 'SupportedActions',
    [PropertyNameFormat.TS]: 'supportedActions'
  },

  // Telescope properties
  alignmentmode: {
    [PropertyNameFormat.URL]: 'alignmentmode',
    [PropertyNameFormat.PARAM]: 'AlignmentMode',
    [PropertyNameFormat.TS]: 'alignmentMode'
  },
  altitude: {
    [PropertyNameFormat.URL]: 'altitude',
    [PropertyNameFormat.PARAM]: 'Altitude',
    [PropertyNameFormat.TS]: 'altitude'
  },
  aperturearea: {
    [PropertyNameFormat.URL]: 'aperturearea',
    [PropertyNameFormat.PARAM]: 'ApertureArea',
    [PropertyNameFormat.TS]: 'apertureArea'
  },
  aperturediameter: {
    [PropertyNameFormat.URL]: 'aperturediameter',
    [PropertyNameFormat.PARAM]: 'ApertureDiameter',
    [PropertyNameFormat.TS]: 'apertureDiameter'
  },
  athome: {
    [PropertyNameFormat.URL]: 'athome',
    [PropertyNameFormat.PARAM]: 'AtHome',
    [PropertyNameFormat.TS]: 'atHome'
  },
  atpark: {
    [PropertyNameFormat.URL]: 'atpark',
    [PropertyNameFormat.PARAM]: 'AtPark',
    [PropertyNameFormat.TS]: 'atPark'
  },
  axisrates: {
    [PropertyNameFormat.URL]: 'axisrates',
    [PropertyNameFormat.PARAM]: 'AxisRates',
    [PropertyNameFormat.TS]: 'axisRates'
  },
  azimuth: {
    [PropertyNameFormat.URL]: 'azimuth',
    [PropertyNameFormat.PARAM]: 'Azimuth',
    [PropertyNameFormat.TS]: 'azimuth'
  },
  canfindhome: {
    [PropertyNameFormat.URL]: 'canfindhome',
    [PropertyNameFormat.PARAM]: 'CanFindHome',
    [PropertyNameFormat.TS]: 'canFindHome'
  },
  canmoveaxis: {
    [PropertyNameFormat.URL]: 'canmoveaxis',
    [PropertyNameFormat.PARAM]: 'CanMoveAxis',
    [PropertyNameFormat.TS]: 'canMoveAxis'
  },
  canpark: {
    [PropertyNameFormat.URL]: 'canpark',
    [PropertyNameFormat.PARAM]: 'CanPark',
    [PropertyNameFormat.TS]: 'canPark'
  },
  canpulseguide: {
    [PropertyNameFormat.URL]: 'canpulseguide',
    [PropertyNameFormat.PARAM]: 'CanPulseGuide',
    [PropertyNameFormat.TS]: 'canPulseGuide'
  },
  cansetdeclinationrate: {
    [PropertyNameFormat.URL]: 'cansetdeclinationrate',
    [PropertyNameFormat.PARAM]: 'CanSetDeclinationRate',
    [PropertyNameFormat.TS]: 'canSetDeclinationRate'
  },
  cansetguiderate: {
    [PropertyNameFormat.URL]: 'cansetguiderate',
    [PropertyNameFormat.PARAM]: 'CanSetGuideRate',
    [PropertyNameFormat.TS]: 'canSetGuideRate'
  },
  cansetguiderates: {
    [PropertyNameFormat.URL]: 'cansetguiderates',
    [PropertyNameFormat.PARAM]: 'CanSetGuideRates',
    [PropertyNameFormat.TS]: 'canSetGuideRates'
  },
  cansetpark: {
    [PropertyNameFormat.URL]: 'cansetpark',
    [PropertyNameFormat.PARAM]: 'CanSetPark',
    [PropertyNameFormat.TS]: 'canSetPark'
  },
  cansetpierside: {
    [PropertyNameFormat.URL]: 'cansetpierside',
    [PropertyNameFormat.PARAM]: 'CanSetPierSide',
    [PropertyNameFormat.TS]: 'canSetPierSide'
  },
  cansetrightascensionrate: {
    [PropertyNameFormat.URL]: 'cansetrightascensionrate',
    [PropertyNameFormat.PARAM]: 'CanSetRightAscensionRate',
    [PropertyNameFormat.TS]: 'canSetRightAscensionRate'
  },
  cansettracking: {
    [PropertyNameFormat.URL]: 'cansettracking',
    [PropertyNameFormat.PARAM]: 'CanSetTracking',
    [PropertyNameFormat.TS]: 'canSetTracking'
  },
  canslew: {
    [PropertyNameFormat.URL]: 'canslew',
    [PropertyNameFormat.PARAM]: 'CanSlew',
    [PropertyNameFormat.TS]: 'canSlew'
  },
  canslewaltaz: {
    [PropertyNameFormat.URL]: 'canslewaltaz',
    [PropertyNameFormat.PARAM]: 'CanSlewAltAz',
    [PropertyNameFormat.TS]: 'canSlewAltAz'
  },
  canslewaltazasync: {
    [PropertyNameFormat.URL]: 'canslewaltazasync',
    [PropertyNameFormat.PARAM]: 'CanSlewAltAzAsync',
    [PropertyNameFormat.TS]: 'canSlewAltAzAsync'
  },
  canslewasync: {
    [PropertyNameFormat.URL]: 'canslewasync',
    [PropertyNameFormat.PARAM]: 'CanSlewAsync',
    [PropertyNameFormat.TS]: 'canSlewAsync'
  },
  cansync: {
    [PropertyNameFormat.URL]: 'cansync',
    [PropertyNameFormat.PARAM]: 'CanSync',
    [PropertyNameFormat.TS]: 'canSync'
  },
  cansyncaltaz: {
    [PropertyNameFormat.URL]: 'cansyncaltaz',
    [PropertyNameFormat.PARAM]: 'CanSyncAltAz',
    [PropertyNameFormat.TS]: 'canSyncAltAz'
  },
  canunpark: {
    [PropertyNameFormat.URL]: 'canunpark',
    [PropertyNameFormat.PARAM]: 'CanUnpark',
    [PropertyNameFormat.TS]: 'canUnpark'
  },
  declination: {
    [PropertyNameFormat.URL]: 'declination',
    [PropertyNameFormat.PARAM]: 'Declination',
    [PropertyNameFormat.TS]: 'declination'
  },
  declinationrate: {
    [PropertyNameFormat.URL]: 'declinationrate',
    [PropertyNameFormat.PARAM]: 'DeclinationRate',
    [PropertyNameFormat.TS]: 'declinationRate'
  },
  declination_rate: {
    [PropertyNameFormat.URL]: 'declinationrate',
    [PropertyNameFormat.PARAM]: 'DeclinationRate',
    [PropertyNameFormat.TS]: 'declinationRate'
  },
  destinationsideofpier: {
    [PropertyNameFormat.URL]: 'destinationsideofpier',
    [PropertyNameFormat.PARAM]: 'DestinationSideOfPier',
    [PropertyNameFormat.TS]: 'destinationSideOfPier'
  },
  doesrefraction: {
    [PropertyNameFormat.URL]: 'doesrefraction',
    [PropertyNameFormat.PARAM]: 'DoesRefraction',
    [PropertyNameFormat.TS]: 'doesRefraction'
  },
  equatorialsystem: {
    [PropertyNameFormat.URL]: 'equatorialsystem',
    [PropertyNameFormat.PARAM]: 'EquatorialSystem',
    [PropertyNameFormat.TS]: 'equatorialSystem'
  },
  focallength: {
    [PropertyNameFormat.URL]: 'focallength',
    [PropertyNameFormat.PARAM]: 'FocalLength',
    [PropertyNameFormat.TS]: 'focalLength'
  },
  guideratedeclination: {
    [PropertyNameFormat.URL]: 'guideratedeclination',
    [PropertyNameFormat.PARAM]: 'GuideRateDeclination',
    [PropertyNameFormat.TS]: 'guideRateDeclination'
  },
  guideraterightascension: {
    [PropertyNameFormat.URL]: 'guideraterightascension',
    [PropertyNameFormat.PARAM]: 'GuideRateRightAscension',
    [PropertyNameFormat.TS]: 'guideRateRightAscension'
  },
  ispulseguiding: {
    [PropertyNameFormat.URL]: 'ispulseguiding',
    [PropertyNameFormat.PARAM]: 'IsPulseGuiding',
    [PropertyNameFormat.TS]: 'isPulseGuiding'
  },
  rightascension: {
    [PropertyNameFormat.URL]: 'rightascension',
    [PropertyNameFormat.PARAM]: 'RightAscension',
    [PropertyNameFormat.TS]: 'rightAscension'
  },
  rightascensionrate: {
    [PropertyNameFormat.URL]: 'rightascensionrate',
    [PropertyNameFormat.PARAM]: 'RightAscensionRate',
    [PropertyNameFormat.TS]: 'rightAscensionRate'
  },
  rightascension_rate: {
    [PropertyNameFormat.URL]: 'rightascensionrate',
    [PropertyNameFormat.PARAM]: 'RightAscensionRate',
    [PropertyNameFormat.TS]: 'rightAscensionRate'
  },
  sideofpier: {
    [PropertyNameFormat.URL]: 'sideofpier',
    [PropertyNameFormat.PARAM]: 'SideOfPier',
    [PropertyNameFormat.TS]: 'sideOfPier'
  },
  siderealtime: {
    [PropertyNameFormat.URL]: 'siderealtime',
    [PropertyNameFormat.PARAM]: 'SiderealTime',
    [PropertyNameFormat.TS]: 'siderealTime'
  },
  siteelevation: {
    [PropertyNameFormat.URL]: 'siteelevation',
    [PropertyNameFormat.PARAM]: 'SiteElevation',
    [PropertyNameFormat.TS]: 'siteElevation'
  },
  sitelatitude: {
    [PropertyNameFormat.URL]: 'sitelatitude',
    [PropertyNameFormat.PARAM]: 'SiteLatitude',
    [PropertyNameFormat.TS]: 'siteLatitude'
  },
  sitelongitude: {
    [PropertyNameFormat.URL]: 'sitelongitude',
    [PropertyNameFormat.PARAM]: 'SiteLongitude',
    [PropertyNameFormat.TS]: 'siteLongitude'
  },
  slewing: {
    [PropertyNameFormat.URL]: 'slewing',
    [PropertyNameFormat.PARAM]: 'Slewing',
    [PropertyNameFormat.TS]: 'slewing'
  },
  slewsettletime: {
    [PropertyNameFormat.URL]: 'slewsettletime',
    [PropertyNameFormat.PARAM]: 'SlewSettleTime',
    [PropertyNameFormat.TS]: 'slewSettleTime'
  },
  targetdeclination: {
    [PropertyNameFormat.URL]: 'targetdeclination',
    [PropertyNameFormat.PARAM]: 'TargetDeclination',
    [PropertyNameFormat.TS]: 'targetDeclination'
  },
  targetrightascension: {
    [PropertyNameFormat.URL]: 'targetrightascension',
    [PropertyNameFormat.PARAM]: 'TargetRightAscension',
    [PropertyNameFormat.TS]: 'targetRightAscension'
  },
  tracking: {
    [PropertyNameFormat.URL]: 'tracking',
    [PropertyNameFormat.PARAM]: 'Tracking',
    [PropertyNameFormat.TS]: 'tracking'
  },
  trackingrate: {
    [PropertyNameFormat.URL]: 'trackingrate',
    [PropertyNameFormat.PARAM]: 'TrackingRate',
    [PropertyNameFormat.TS]: 'trackingRate'
  },
  trackingrates: {
    [PropertyNameFormat.URL]: 'trackingrates',
    [PropertyNameFormat.PARAM]: 'TrackingRates',
    [PropertyNameFormat.TS]: 'trackingRates'
  },
  utcdate: {
    [PropertyNameFormat.URL]: 'utcdate',
    [PropertyNameFormat.PARAM]: 'UTCDate',
    [PropertyNameFormat.TS]: 'utcDate'
  },

  // Camera properties
  binx: {
    [PropertyNameFormat.URL]: 'binx',
    [PropertyNameFormat.PARAM]: 'BinX',
    [PropertyNameFormat.TS]: 'binX'
  },
  biny: {
    [PropertyNameFormat.URL]: 'biny',
    [PropertyNameFormat.PARAM]: 'BinY',
    [PropertyNameFormat.TS]: 'binY'
  },
  camerastate: {
    [PropertyNameFormat.URL]: 'camerastate',
    [PropertyNameFormat.PARAM]: 'CameraState',
    [PropertyNameFormat.TS]: 'cameraState'
  },
  ccdtemperature: {
    [PropertyNameFormat.URL]: 'ccdtemperature',
    [PropertyNameFormat.PARAM]: 'CcdTemperature',
    [PropertyNameFormat.TS]: 'ccdTemperature'
  },
  coolerpower: {
    [PropertyNameFormat.URL]: 'coolerpower',
    [PropertyNameFormat.PARAM]: 'CoolerPower',
    [PropertyNameFormat.TS]: 'coolerPower'
  },
  electronsperadu: {
    [PropertyNameFormat.URL]: 'electronsperadu',
    [PropertyNameFormat.PARAM]: 'ElectronsPerADU',
    [PropertyNameFormat.TS]: 'electronsPerADU'
  },
  exposuremax: {
    [PropertyNameFormat.URL]: 'exposuremax',
    [PropertyNameFormat.PARAM]: 'ExposureMax',
    [PropertyNameFormat.TS]: 'exposureMax'
  },
  exposuremin: {
    [PropertyNameFormat.URL]: 'exposuremin',
    [PropertyNameFormat.PARAM]: 'ExposureMin',
    [PropertyNameFormat.TS]: 'exposureMin'
  },
  exposureresolution: {
    [PropertyNameFormat.URL]: 'exposureresolution',
    [PropertyNameFormat.PARAM]: 'ExposureResolution',
    [PropertyNameFormat.TS]: 'exposureResolution'
  },
  fastreadout: {
    [PropertyNameFormat.URL]: 'fastreadout',
    [PropertyNameFormat.PARAM]: 'FastReadout',
    [PropertyNameFormat.TS]: 'fastReadout'
  },
  fullwellcapacity: {
    [PropertyNameFormat.URL]: 'fullwellcapacity',
    [PropertyNameFormat.PARAM]: 'FullWellCapacity',
    [PropertyNameFormat.TS]: 'fullWellCapacity'
  },
  gain: {
    [PropertyNameFormat.URL]: 'gain',
    [PropertyNameFormat.PARAM]: 'Gain',
    [PropertyNameFormat.TS]: 'gain'
  },
  gainmax: {
    [PropertyNameFormat.URL]: 'gainmax',
    [PropertyNameFormat.PARAM]: 'GainMax',
    [PropertyNameFormat.TS]: 'gainMax'
  },
  gainmin: {
    [PropertyNameFormat.URL]: 'gainmin',
    [PropertyNameFormat.PARAM]: 'GainMin',
    [PropertyNameFormat.TS]: 'gainMin'
  },
  gains: {
    [PropertyNameFormat.URL]: 'gains',
    [PropertyNameFormat.PARAM]: 'Gains',
    [PropertyNameFormat.TS]: 'gains'
  },
  imageready: {
    [PropertyNameFormat.URL]: 'imageready',
    [PropertyNameFormat.PARAM]: 'ImageReady',
    [PropertyNameFormat.TS]: 'imageReady'
  },
  lasttemperature: {
    [PropertyNameFormat.URL]: 'lasttemperature',
    [PropertyNameFormat.PARAM]: 'LastTemperature',
    [PropertyNameFormat.TS]: 'lastTemperature'
  },
  maxadu: {
    [PropertyNameFormat.URL]: 'maxadu',
    [PropertyNameFormat.PARAM]: 'MaxADU',
    [PropertyNameFormat.TS]: 'maxADU'
  },
  maxbinx: {
    [PropertyNameFormat.URL]: 'maxbinx',
    [PropertyNameFormat.PARAM]: 'MaxBinX',
    [PropertyNameFormat.TS]: 'maxBinX'
  },
  maxbiny: {
    [PropertyNameFormat.URL]: 'maxbiny',
    [PropertyNameFormat.PARAM]: 'MaxBinY',
    [PropertyNameFormat.TS]: 'maxBinY'
  },
  maxgain: {
    [PropertyNameFormat.URL]: 'maxgain',
    [PropertyNameFormat.PARAM]: 'MaxGain',
    [PropertyNameFormat.TS]: 'maxGain'
  },
  maxoffset: {
    [PropertyNameFormat.URL]: 'maxoffset',
    [PropertyNameFormat.PARAM]: 'MaxOffset',
    [PropertyNameFormat.TS]: 'maxOffset'
  },
  maxport: {
    [PropertyNameFormat.URL]: 'maxport',
    [PropertyNameFormat.PARAM]: 'MaxPort',
    [PropertyNameFormat.TS]: 'maxPort'
  },
  maxreadoutrate: {
    [PropertyNameFormat.URL]: 'maxreadoutrate',
    [PropertyNameFormat.PARAM]: 'MaxReadoutRate',
    [PropertyNameFormat.TS]: 'maxReadoutRate'
  },
  maxx: {
    [PropertyNameFormat.URL]: 'maxx',
    [PropertyNameFormat.PARAM]: 'MaxX',
    [PropertyNameFormat.TS]: 'maxX'
  },
  maxy: {
    [PropertyNameFormat.URL]: 'maxy',
    [PropertyNameFormat.PARAM]: 'MaxY',
    [PropertyNameFormat.TS]: 'maxY'
  },
  minbinx: {
    [PropertyNameFormat.URL]: 'minbinx',
    [PropertyNameFormat.PARAM]: 'MinBinX',
    [PropertyNameFormat.TS]: 'minBinX'
  },
  minbiny: {
    [PropertyNameFormat.URL]: 'minbiny',
    [PropertyNameFormat.PARAM]: 'MinBinY',
    [PropertyNameFormat.TS]: 'minBinY'
  },
  mingain: {
    [PropertyNameFormat.URL]: 'mingain',
    [PropertyNameFormat.PARAM]: 'MinGain',
    [PropertyNameFormat.TS]: 'minGain'
  },
  minoffset: {
    [PropertyNameFormat.URL]: 'minoffset',
    [PropertyNameFormat.PARAM]: 'MinOffset',
    [PropertyNameFormat.TS]: 'minOffset'
  },
  minport: {
    [PropertyNameFormat.URL]: 'minport',
    [PropertyNameFormat.PARAM]: 'MinPort',
    [PropertyNameFormat.TS]: 'minPort'
  },
  minreadoutrate: {
    [PropertyNameFormat.URL]: 'minreadoutrate',
    [PropertyNameFormat.PARAM]: 'MinReadoutRate',
    [PropertyNameFormat.TS]: 'minReadoutRate'
  },
  minx: {
    [PropertyNameFormat.URL]: 'minx',
    [PropertyNameFormat.PARAM]: 'MinX',
    [PropertyNameFormat.TS]: 'minX'
  },
  miny: {
    [PropertyNameFormat.URL]: 'miny',
    [PropertyNameFormat.PARAM]: 'MinY',
    [PropertyNameFormat.TS]: 'minY'
  },
  numx: {
    [PropertyNameFormat.URL]: 'numx',
    [PropertyNameFormat.PARAM]: 'NumX',
    [PropertyNameFormat.TS]: 'numX'
  },
  numy: {
    [PropertyNameFormat.URL]: 'numy',
    [PropertyNameFormat.PARAM]: 'NumY',
    [PropertyNameFormat.TS]: 'numY'
  },
  numports: {
    [PropertyNameFormat.URL]: 'numports',
    [PropertyNameFormat.PARAM]: 'NumPorts',
    [PropertyNameFormat.TS]: 'numPorts'
  },
  offset: {
    [PropertyNameFormat.URL]: 'offset',
    [PropertyNameFormat.PARAM]: 'Offset',
    [PropertyNameFormat.TS]: 'offset'
  },
  offsetmax: {
    [PropertyNameFormat.URL]: 'offsetmax',
    [PropertyNameFormat.PARAM]: 'OffsetMax',
    [PropertyNameFormat.TS]: 'offsetMax'
  },
  offsetmin: {
    [PropertyNameFormat.URL]: 'offsetmin',
    [PropertyNameFormat.PARAM]: 'OffsetMin',
    [PropertyNameFormat.TS]: 'offsetMin'
  },
  offsetresolution: {
    [PropertyNameFormat.URL]: 'offsetresolution',
    [PropertyNameFormat.PARAM]: 'OffsetResolution',
    [PropertyNameFormat.TS]: 'offsetResolution'
  },
  percentcompleted: {
    [PropertyNameFormat.URL]: 'percentcompleted',
    [PropertyNameFormat.PARAM]: 'PercentCompleted',
    [PropertyNameFormat.TS]: 'percentCompleted'
  },
  pixelsizex: {
    [PropertyNameFormat.URL]: 'pixelsizex',
    [PropertyNameFormat.PARAM]: 'PixelSizeX',
    [PropertyNameFormat.TS]: 'pixelSizeX'
  },
  pixelsizey: {
    [PropertyNameFormat.URL]: 'pixelsizey',
    [PropertyNameFormat.PARAM]: 'PixelSizeY',
    [PropertyNameFormat.TS]: 'pixelSizeY'
  },
  port: {
    [PropertyNameFormat.URL]: 'port',
    [PropertyNameFormat.PARAM]: 'Port',
    [PropertyNameFormat.TS]: 'port'
  },
  readoutmode: {
    [PropertyNameFormat.URL]: 'readoutmode',
    [PropertyNameFormat.PARAM]: 'ReadoutMode',
    [PropertyNameFormat.TS]: 'readoutMode'
  },
  readoutmodes: {
    [PropertyNameFormat.URL]: 'readoutmodes',
    [PropertyNameFormat.PARAM]: 'ReadoutModes',
    [PropertyNameFormat.TS]: 'readoutModes'
  },
  readoutrate: {
    [PropertyNameFormat.URL]: 'readoutrate',
    [PropertyNameFormat.PARAM]: 'ReadoutRate',
    [PropertyNameFormat.TS]: 'readoutRate'
  },
  readoutrates: {
    [PropertyNameFormat.URL]: 'readoutrates',
    [PropertyNameFormat.PARAM]: 'ReadoutRates',
    [PropertyNameFormat.TS]: 'readoutRates'
  },
  sensorname: {
    [PropertyNameFormat.URL]: 'sensorname',
    [PropertyNameFormat.PARAM]: 'SensorName',
    [PropertyNameFormat.TS]: 'sensorName'
  },
  sensortype: {
    [PropertyNameFormat.URL]: 'sensortype',
    [PropertyNameFormat.PARAM]: 'SensorType',
    [PropertyNameFormat.TS]: 'sensorType'
  },
  shutterstatus: {
    [PropertyNameFormat.URL]: 'shutterstatus',
    [PropertyNameFormat.PARAM]: 'ShutterStatus',
    [PropertyNameFormat.TS]: 'shutterStatus'
  },
  startx: {
    [PropertyNameFormat.URL]: 'startx',
    [PropertyNameFormat.PARAM]: 'StartX',
    [PropertyNameFormat.TS]: 'startX'
  },
  starty: {
    [PropertyNameFormat.URL]: 'starty',
    [PropertyNameFormat.PARAM]: 'StartY',
    [PropertyNameFormat.TS]: 'startY'
  },
  subexposureduration: {
    [PropertyNameFormat.URL]: 'subexposureduration',
    [PropertyNameFormat.PARAM]: 'SubExposureDuration',
    [PropertyNameFormat.TS]: 'subExposureDuration'
  },
  temperature: {
    [PropertyNameFormat.URL]: 'temperature',
    [PropertyNameFormat.PARAM]: 'Temperature',
    [PropertyNameFormat.TS]: 'temperature'
  },
  xsize: {
    [PropertyNameFormat.URL]: 'xsize',
    [PropertyNameFormat.PARAM]: 'XSize',
    [PropertyNameFormat.TS]: 'xSize'
  },
  ysize: {
    [PropertyNameFormat.URL]: 'ysize',
    [PropertyNameFormat.PARAM]: 'YSize',
    [PropertyNameFormat.TS]: 'ySize'
  }
}

/**
 * Converts a property name to the specified format
 */
export function formatPropertyName(propertyName: string, format: PropertyNameFormat): string {
  const formats = propertyNameFormats[propertyName.toLowerCase()]
  if (!formats) {
    // If no mapping exists, apply standard transformations
    switch (format) {
      case PropertyNameFormat.URL:
        return propertyName.toLowerCase()
      case PropertyNameFormat.PARAM:
        return propertyName.charAt(0).toUpperCase() + propertyName.slice(1)
      case PropertyNameFormat.TS:
        return propertyName.charAt(0).toLowerCase() + propertyName.slice(1)
    }
  }
  return formats[format]
}

/**
 * Converts a property name to URL format (lowercase)
 */
export function toUrlFormat(propertyName: string): string {
  return formatPropertyName(propertyName, PropertyNameFormat.URL)
}

/**
 * Converts a property name to parameter format (properly capitalized)
 */
export function toParamFormat(propertyName: string): string {
  return formatPropertyName(propertyName, PropertyNameFormat.PARAM)
}

/**
 * Converts a property name to TypeScript format (camelCase)
 */
export function toTsFormat(propertyName: string): string {
  const lowercasePropName = propertyName.toLowerCase()
  if (propertyNameFormats[lowercasePropName] && propertyNameFormats[lowercasePropName][PropertyNameFormat.TS]) {
    return propertyNameFormats[lowercasePropName][PropertyNameFormat.TS]
  }

  // Fallback logic
  const result = propertyName.replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase()).replace(/^(.)/, (match) => match.toLowerCase())
  return result
}
