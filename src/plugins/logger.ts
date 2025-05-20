import { createLogger } from 'vue-logger-plugin'
import type { LogLevel, CallerInfo } from 'vue-logger-plugin'

// Determine log level based on environment
const logLevel = import.meta.env.MODE === 'development' ? 'debug' : 'info'

// Custom prefix formatter
const prefixFormat = ({ level, caller }: { level: LogLevel; caller: CallerInfo | undefined }) => {
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

const logger = createLogger({
  enabled: true,
  consoleEnabled: true,
  level: logLevel as LogLevel,
  callerInfo: true,
  prefixFormat,
  beforeHooks: [],
  afterHooks: []
})

export default logger
