import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
// import type { LogLevel as VueLoggerLogLevel } from 'vue-logger-plugin' // Renaming to avoid clash

// Define more specific log levels if needed, or use VueLoggerLogLevel directly
export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

export interface LogEntry {
  id: string // Unique ID for each log entry (e.g., timestamp + random string)
  timestamp: string
  level: LogLevel
  source?: string // e.g., component name, store, module
  message: string
  deviceIds?: string[] // Added for device-specific filtering
  rawArgs: unknown[] // Store the original arguments for detailed inspection if needed
  // Potentially add more structured data later, like specific error codes, user actions, etc.
}

const MAX_LOG_ENTRIES = 1000 // Define a max number of log entries to keep

export const useLogStore = defineStore('logStore', () => {
  const logEntries = ref<LogEntry[]>([])

  // UI-specific state for filtering and display
  const filterLevel = ref<LogLevel | 'ALL'>('ALL')
  const filterKeyword = ref<string>('')
  const filterSource = ref<string>('') // For filtering by source/module
  const filterDeviceIds = ref<string[]>([]) // For filtering by specific device UIDs

  const addLogEntry = (entryData: Omit<LogEntry, 'id'>) => {
    const newEntry: LogEntry = {
      ...entryData,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }
    logEntries.value.unshift(newEntry) // Add to the beginning of the array

    // Keep the array size manageable
    if (logEntries.value.length > MAX_LOG_ENTRIES) {
      logEntries.value.splice(MAX_LOG_ENTRIES)
    }
  }

  const clearLogs = () => {
    logEntries.value = []
  }

  const filteredLogEntries = computed(() => {
    return logEntries.value.filter((entry) => {
      const levelMatch = filterLevel.value === 'ALL' || entry.level === filterLevel.value
      const keywordMatch = !filterKeyword.value || entry.message.toLowerCase().includes(filterKeyword.value.toLowerCase())
      const sourceMatch = !filterSource.value || (entry.source && entry.source.toLowerCase().includes(filterSource.value.toLowerCase()))
      const deviceMatch = filterDeviceIds.value.length === 0 || (entry.deviceIds && entry.deviceIds.some((id) => filterDeviceIds.value.includes(id)))
      return levelMatch && keywordMatch && sourceMatch && deviceMatch
    })
  })

  const setFilterLevel = (level: LogLevel | 'ALL') => {
    filterLevel.value = level
  }

  const setFilterKeyword = (keyword: string) => {
    filterKeyword.value = keyword
  }

  const setFilterSource = (keyword: string) => {
    filterSource.value = keyword
  }

  const clearFilterSource = () => {
    filterSource.value = ''
  }

  const setFilterDeviceIds = (deviceUids: string[]) => {
    filterDeviceIds.value = deviceUids
  }

  const clearFilterDeviceIds = () => {
    filterDeviceIds.value = []
  }

  return {
    logEntries, // Raw entries, might not be needed by most components
    filteredLogEntries, // For the log viewer
    filterLevel, // For binding to UI controls
    filterKeyword, // For binding to UI controls
    filterSource,
    filterDeviceIds,
    addLogEntry,
    clearLogs,
    setFilterLevel,
    setFilterKeyword,
    setFilterSource,
    clearFilterSource,
    setFilterDeviceIds,
    clearFilterDeviceIds,
    MAX_LOG_ENTRIES
  }
})
