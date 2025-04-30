/**
 * Real Device Test Scenarios
 *
 * This file provides test scenarios for manual testing with actual hardware devices.
 * These are not automated tests but rather structured flows to follow when testing
 * with real hardware.
 */

import UnifiedStore from '@/stores/UnifiedStore'
import StoreAdapter from '@/stores/StoreAdapter'
import { useUnifiedStore } from '@/stores/UnifiedStore'

// Types for testing
interface TestMetric {
  value: number | string | boolean
  unit?: string
  timestamp?: Date
}

interface TestLogRecord {
  scenarioName: string
  startTime: Date
  endTime: Date | null
  steps: Array<{ step: string; result: string; timestamp: Date }>
  metrics: Record<string, TestMetric>
  notes: string[]
}

type WindowWithTestEnv = Window & {
  testStore: typeof UnifiedStore
  testAdapter: StoreAdapter
  testScenarios: typeof testScenarios
  createTestLog: typeof createTestLog
}

// Types of real devices to test with
const DEVICE_TYPES = {
  TELESCOPE: 'telescope',
  CAMERA: 'camera',
  FOCUSER: 'focuser',
  FILTER_WHEEL: 'filterWheel'
}

// Test scenarios
export const testScenarios = {
  /**
   * Basic Device Discovery Scenario
   *
   * Steps:
   * 1. Set up a real device on the network (e.g., a telescope simulator or actual device)
   * 2. Start the discovery process
   * 3. Verify the device appears in the discovery list
   * 4. Check that device information is correctly displayed
   */
  basicDiscovery: {
    name: 'Basic Device Discovery',
    deviceTypes: [DEVICE_TYPES.TELESCOPE, DEVICE_TYPES.CAMERA],
    prerequisites: [
      'Device is powered on and connected to the network',
      'Device is running ALPACA-compatible server'
    ],
    steps: [
      'Navigate to the Discovery view',
      'Click "Start Discovery" button',
      'Wait for discovery to complete (30 seconds)',
      'Verify device appears in the discovery list',
      'Check that device name, type, and IP address are correctly displayed',
      'Verify the "Add" button is present for the device'
    ],
    expectedResults: [
      'Device is discovered and displayed correctly',
      'All device information is accurate',
      'UI correctly shows discovery progress and completion'
    ],
    metrics: ['Time to discover device (seconds)', 'Accuracy of device information']
  },

  /**
   * Device Connection Scenario
   *
   * Steps:
   * 1. Start with a discovered device
   * 2. Add the device to managed devices
   * 3. Connect to the device
   * 4. Verify connection status
   */
  deviceConnection: {
    name: 'Device Connection Flow',
    deviceTypes: [DEVICE_TYPES.TELESCOPE, DEVICE_TYPES.CAMERA],
    prerequisites: [
      'Device is discovered and added to managed devices',
      'Device is accessible on the network'
    ],
    steps: [
      'Navigate to the Devices view',
      'Locate the target device in the devices list',
      'Click the "Connect" button for the device',
      'Wait for connection to complete',
      'Verify connection status changes to "Connected"',
      'Check that device capabilities are correctly displayed',
      'Navigate to device details page',
      'Verify all device properties are correctly loaded'
    ],
    expectedResults: [
      'Device connects successfully',
      'Connection status is accurately displayed',
      'Device properties are correctly loaded and displayed',
      'UI provides clear feedback during connection process'
    ],
    metrics: [
      'Time to establish connection (seconds)',
      'Success rate of connection attempts',
      'Accuracy of device property display'
    ]
  },

  /**
   * Telescope Control Scenario
   *
   * Steps:
   * 1. Start with a connected telescope
   * 2. Execute slew command
   * 3. Monitor position updates
   * 4. Park the telescope
   */
  telescopeControl: {
    name: 'Telescope Control Operations',
    deviceTypes: [DEVICE_TYPES.TELESCOPE],
    prerequisites: [
      'Telescope is connected and operational',
      'Telescope supports slew and park operations'
    ],
    steps: [
      'Navigate to telescope control panel',
      'Enter coordinates for slew (RA: 05h 35m 17s, Dec: -05° 23\' 28")',
      'Click "Slew" button',
      'Monitor position updates during slew',
      'Verify telescope stops at target coordinates',
      'Click "Park" button',
      'Verify telescope moves to park position',
      'Monitor telescope status during parking operation'
    ],
    expectedResults: [
      'Telescope correctly accepts and executes slew command',
      'Position updates are smooth and accurate',
      'Final position matches requested coordinates',
      'Park operation completes successfully',
      'UI accurately displays telescope status throughout operations'
    ],
    metrics: [
      'Slew accuracy (arcseconds from target)',
      'Time to complete slew (seconds)',
      'Smoothness of tracking updates (updates per second)',
      'Time to complete park operation (seconds)'
    ]
  },

  /**
   * Camera Exposure Scenario
   *
   * Steps:
   * 1. Start with a connected camera
   * 2. Configure exposure settings
   * 3. Start exposure
   * 4. Monitor progress
   * 5. Download and display image
   */
  cameraExposure: {
    name: 'Camera Exposure Sequence',
    deviceTypes: [DEVICE_TYPES.CAMERA],
    prerequisites: [
      'Camera is connected and operational',
      'Camera cooler is at target temperature (if applicable)'
    ],
    steps: [
      'Navigate to camera control panel',
      'Set exposure duration (5 seconds)',
      'Select binning (1x1)',
      'Set gain (if applicable)',
      'Select image format (FITS)',
      'Click "Start Exposure" button',
      'Monitor exposure progress',
      'Wait for image download to complete',
      'Verify image is displayed correctly',
      'Check image metadata for accuracy'
    ],
    expectedResults: [
      'Exposure starts successfully',
      'Progress is accurately displayed',
      'Image is downloaded and displayed correctly',
      'Image metadata shows correct exposure parameters',
      'UI provides appropriate feedback during all steps'
    ],
    metrics: [
      'Time to start exposure (seconds)',
      'Accuracy of progress indicator',
      'Time to download image (seconds)',
      'Image quality (SNR if measurable)'
    ]
  },

  /**
   * Multi-Device Workflow Scenario
   *
   * Steps:
   * 1. Connect to multiple devices (telescope, camera, etc.)
   * 2. Coordinate operations between devices
   * 3. Test complete imaging workflow
   */
  multiDeviceWorkflow: {
    name: 'Multi-Device Imaging Workflow',
    deviceTypes: [DEVICE_TYPES.TELESCOPE, DEVICE_TYPES.CAMERA, DEVICE_TYPES.FOCUSER],
    prerequisites: [
      'All devices are connected and operational',
      'All devices are properly configured'
    ],
    steps: [
      'Slew telescope to target coordinates',
      'Wait for slew to complete',
      'Run autofocus routine (if focuser available)',
      'Wait for focusing to complete',
      'Configure camera settings for imaging',
      'Start exposure sequence (3 x 10-second exposures)',
      'Monitor all devices during operation',
      'Check final images',
      'Park telescope when complete'
    ],
    expectedResults: [
      'All devices operate together without conflicts',
      'Operations sequence correctly without manual intervention',
      'All status updates are accurate across devices',
      'Final images are correctly acquired',
      'All devices return to safe state after completion'
    ],
    metrics: [
      'Total workflow completion time (minutes)',
      'Success rate of multi-device operations',
      'Accuracy of device synchronization',
      'Final image quality'
    ]
  },

  /**
   * Resilience Testing Scenario
   *
   * Steps:
   * 1. Test recovery from connection losses
   * 2. Test error handling during operations
   * 3. Verify graceful degradation
   */
  resilienceTesting: {
    name: 'Connection and Error Resilience',
    deviceTypes: [DEVICE_TYPES.TELESCOPE, DEVICE_TYPES.CAMERA],
    prerequisites: [
      'Devices are connected and operational',
      'Network allows controlled disconnection of devices'
    ],
    steps: [
      'Start normal device operations',
      'Temporarily disconnect network connection to device',
      'Wait for application to detect disconnection',
      'Restore network connection',
      'Attempt to reconnect to device',
      'Verify operations can resume',
      'During device operation, trigger a controlled error (e.g., slew to prohibited position)',
      'Verify error is properly handled',
      'Attempt to resume normal operations'
    ],
    expectedResults: [
      'Application detects disconnection promptly',
      'UI clearly indicates disconnection state',
      'Reconnection is handled gracefully',
      'Error conditions are properly displayed to user',
      'Application recovers from errors without crashing'
    ],
    metrics: [
      'Time to detect disconnection (seconds)',
      'Success rate of reconnection attempts',
      'Clarity of error messages',
      'Recovery time from error conditions (seconds)'
    ]
  }
}

/**
 * Test Execution Helpers
 */

// Create a test execution log
export function createTestLog(scenarioName: string) {
  const log: TestLogRecord = {
    scenarioName,
    startTime: new Date(),
    endTime: null,
    steps: [],
    metrics: {},
    notes: []
  }

  return {
    log,

    // Log a step result
    logStep(step: string, result: string) {
      log.steps.push({
        step,
        result,
        timestamp: new Date()
      })
    },

    // Record a metric
    recordMetric(name: string, value: number | string | boolean, unit?: string) {
      log.metrics[name] = {
        value,
        unit,
        timestamp: new Date()
      }
    },

    // Add a note
    addNote(note: string) {
      log.notes.push(note)
    },

    // Complete the test
    completeTest() {
      log.endTime = new Date()
      return log
    }
  }
}

/**
 * Store Instance for Manual Testing
 *
 * This creates a store and adapter instance that can be used
 * for manual testing from the browser console.
 */
export function createTestingEnvironment() {
  const store = useUnifiedStore()
  const adapter = new StoreAdapter(store)

  // Make accessible globally for browser console testing
  if (typeof window !== 'undefined') {
    // Use type assertion through unknown to avoid strict type checking issues
    const typedWindow = window as unknown as WindowWithTestEnv
    typedWindow.testStore = store
    typedWindow.testAdapter = adapter
    typedWindow.testScenarios = testScenarios
    typedWindow.createTestLog = createTestLog

    console.log('Testing environment created. Access via window.testStore, window.testAdapter')
    console.log('Test scenarios available via window.testScenarios')
    console.log('Create a test log with window.createTestLog("scenarioName")')
  }

  return { store, adapter }
}

// Auto-initialize when imported in a browser environment
if (typeof window !== 'undefined') {
  createTestingEnvironment()
}
