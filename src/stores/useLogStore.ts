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
  // --- Circular buffer implementation ---
  const logBuffer = ref<(LogEntry | undefined)[]>(Array(MAX_LOG_ENTRIES).fill(undefined))
  const logIndex = ref(0) // Points to the next slot to write
  const logCount = ref(0) // Total number of logs ever added (for correct slicing)

  // UI-specific state for filtering and display
  const filterLevel = ref<LogLevel | 'ALL'>('ALL')
  const filterKeyword = ref<string>('')
  const filterSource = ref<string>('') // For filtering by source/module
  const filterDeviceIds = ref<string[]>([]) // For filtering by specific device UIDs

  // Computed: logs in newest-first order
  const logEntries = computed<LogEntry[]>(() => {
    const result: LogEntry[] = []
    const total = Math.min(logCount.value, MAX_LOG_ENTRIES)
    for (let i = 0; i < total; i++) {
      const idx = (logIndex.value - 1 - i + MAX_LOG_ENTRIES) % MAX_LOG_ENTRIES
      const entry = logBuffer.value[idx]
      if (entry) result.push(entry)
    }
    return result
  })

  const addLogEntry = (entryData: Omit<LogEntry, 'id'>) => {
    const newEntry: LogEntry = {
      ...entryData,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }
    logBuffer.value[logIndex.value] = newEntry
    logIndex.value = (logIndex.value + 1) % MAX_LOG_ENTRIES
    logCount.value++
  }

  const clearLogs = () => {
    logBuffer.value = Array(MAX_LOG_ENTRIES).fill(undefined)
    logIndex.value = 0
    logCount.value = 0
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
    logEntries, // Raw entries, newest first
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
