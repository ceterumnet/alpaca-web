import { createLogger } from 'vue-logger-plugin'
import type { LogLevel as VueLoggerLogLevel, CallerInfo, LoggerHook, LogEvent } from 'vue-logger-plugin'
import { useLogStore } from '@/stores/useLogStore'
import type { LogLevel as StoreLogLevel } from '@/stores/useLogStore'

// Determine log level based on environment
const logLevel = import.meta.env.MODE === 'development' ? 'debug' : 'info'

interface LogContext {
  deviceIds?: string | string[]
  // other potential context properties can be added here
}

// Custom prefix formatter
const prefixFormat = ({ level, caller }: { level: VueLoggerLogLevel; caller: CallerInfo | undefined }) => {
  const timestamp = new Date().toISOString()
  let prefix = `[${timestamp}] [${level.toUpperCase()}]`
  if (caller && caller.fileName) {
    let componentName = caller.fileName
    // Attempt to extract a cleaner component name if it's a .vue file
    const vueFileMatch = caller.fileName.match(/([^/]+\.vue)/)
    if (vueFileMatch && vueFileMatch[1]) {
      componentName = vueFileMatch[1]
    }
    prefix += ` [${componentName}`
    if (caller.functionName) {
      prefix += `:${caller.functionName}`
    }
    if (caller.lineNumber) {
      prefix += `:${caller.lineNumber}`
    }
    prefix += ']'
  }
  return prefix
}

// Custom hook to capture logs for the UI
const UiLogCaptureHook: LoggerHook = {
  run(event: LogEvent) {
    // Ensure Pinia store is accessed correctly, might need to be outside if Pinia isn't initialized yet
    // However, hooks are typically run after the app is initialized where Pinia is available.
    const logStore = useLogStore()

    const timestamp = new Date().toISOString()
    let source = 'Unknown' // Default source
    let deviceIds: string[] | undefined = undefined
    let messageArgs = [...event.argumentArray] // Clone to avoid mutating original if needed by other hooks

    if (event.caller && event.caller.fileName) {
      let componentName = event.caller.fileName
      const vueFileMatch = event.caller.fileName.match(/([^/]+\.vue)/)
      if (vueFileMatch && vueFileMatch[1]) {
        componentName = vueFileMatch[1]
      }
      source = componentName
      if (event.caller.functionName) {
        source += `:${event.caller.functionName}`
      }
    }

    if (messageArgs.length > 0 && typeof messageArgs[0] === 'object' && messageArgs[0] !== null) {
      const context = messageArgs[0] as LogContext
      if (typeof context.deviceIds === 'string') {
        deviceIds = [context.deviceIds]
        messageArgs = messageArgs.slice(1)
      } else if (Array.isArray(context.deviceIds)) {
        // Ensure all elements in deviceIds array are strings
        const allStrings = context.deviceIds.every((id) => typeof id === 'string')
        if (allStrings && context.deviceIds.length > 0) {
          deviceIds = context.deviceIds as string[]
          messageArgs = messageArgs.slice(1)
        } else if (context.deviceIds.length === 0) {
          // an empty array is valid for slicing
          messageArgs = messageArgs.slice(1)
        }
        // If not all strings or not an array, it's not a valid deviceIds context for our convention
        // and deviceIds remains undefined, messageArgs remains un-sliced for this path.
      }
    }

    const message = messageArgs
      .map((arg) => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            // Simple stringify for UI display. Avoid overly complex objects.
            return JSON.stringify(arg, null, 2) // Pretty print slightly
          } catch (e) {
            return '[Unserializable Object]'
          }
        }
        return String(arg)
      })
      .join(' ')

    logStore.addLogEntry({
      timestamp,
      level: event.level.toUpperCase() as StoreLogLevel, // Cast to store's LogLevel type
      source,
      message,
      deviceIds, // Pass extracted deviceIds
      rawArgs: event.argumentArray // Always store original full argument array
    })
  }
}

const logger = createLogger({
  enabled: true,
  consoleEnabled: true,
  level: logLevel as VueLoggerLogLevel,
  callerInfo: true,
  prefixFormat,
  beforeHooks: [],
  afterHooks: [UiLogCaptureHook]
})

export default logger
