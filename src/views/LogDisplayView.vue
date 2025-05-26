<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLogStore } from '@/stores/useLogStore';
import type { LogLevel } from '@/stores/useLogStore';
import { useLogger } from 'vue-logger-plugin';

// Define the log levels supported by vue-logger-plugin
type VueLoggerLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'log';

const logStore = useLogStore();
const logger = useLogger(); // For changing global log level

// Filter values from the store, directly used in template
const filterLevel = computed({
  get: () => logStore.filterLevel,
  set: (val) => logStore.setFilterLevel(val),
});

const filterKeyword = computed({
  get: () => logStore.filterKeyword,
  set: (val) => logStore.setFilterKeyword(val),
});

const filterSource = computed({
  get: () => logStore.filterSource,
  set: (val) => logStore.setFilterSource(val),
});

const filterDeviceIdsInput = ref(''); // Temporary input for comma-separated device IDs
watch(filterDeviceIdsInput, (newVal) => {
  logStore.setFilterDeviceIds(newVal.split(',').map(id => id.trim()).filter(id => id));
});


const availableLogLevels = ref<Array<LogLevel | 'ALL'>>(['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);

// Initialize globalLogLevel. Assume logger.level is a property access.
// If it were a function, logger.level() would be used.
// The result is cast through unknown to VueLoggerLogLevel, then to LogLevel via toUpperCase.
const pluginCurrentLevel = logger.level as unknown as VueLoggerLogLevel;
const globalLogLevel = ref<LogLevel | 'ALL'>(pluginCurrentLevel.toUpperCase() as LogLevel);

watch(globalLogLevel, (newVal) => {
  // Map LogLevel to VueLoggerLogLevel before applying
  // 'ALL' should not change the plugin's level; it's for filtering in this component
  if (newVal === 'ALL') return;

  let pluginLevel: VueLoggerLogLevel;
  // newLevel here is guaranteed to be LogLevel, not 'ALL'
  switch (newVal as LogLevel) { // Added cast here for clarity within switch
    case 'TRACE':
      pluginLevel = 'debug';
      break;
    case 'DEBUG':
      pluginLevel = 'debug';
      break;
    case 'INFO':
      pluginLevel = 'info';
      break;
    case 'WARN':
      pluginLevel = 'warn';
      break;
    case 'ERROR':
      pluginLevel = 'error';
      break;
    case 'FATAL':
      pluginLevel = 'error'; // Map FATAL to error for the plugin
      break;
    default:
      // This case should ideally not be reached if all LogLevel variants are handled above.
      // If it is, it implies newVal is a LogLevel not explicitly cased.
      // Fallback to lowercase, assuming it might match a VueLoggerLogLevel.
      pluginLevel = (newVal as string).toLowerCase() as VueLoggerLogLevel;
      break;
  }
  logger.apply({ level: pluginLevel });
});

const copyLogsToClipboard = () => {
  const logsText = logStore.filteredLogEntries.map(entry => 
    `[${entry.timestamp}] [${entry.level}] ${entry.source ? '[' + entry.source + ']' : ''} ${entry.message}`
  ).join('\n');
  navigator.clipboard.writeText(logsText)
    .then(() => alert('Logs copied to clipboard!'))
    .catch(err => console.error('Failed to copy logs: ', err));
};

const downloadLogs = () => {
  const logsText = logStore.filteredLogEntries.map(entry => 
    JSON.stringify(entry) // Save as JSON lines for better structure
  ).join('\n');
  const blob = new Blob([logsText], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alpaca-web-logs-${new Date().toISOString()}.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getLogLevelClass = (level: LogLevel): string => {
  switch (level) {
    case 'ERROR': return 'log-level-error';
    case 'WARN': return 'log-level-warn';
    case 'INFO': return 'log-level-info';
    case 'DEBUG': return 'log-level-debug';
    case 'TRACE': return 'log-level-trace';
    case 'FATAL': return 'log-level-fatal';
    default: return 'log-level-default';
  }
};

// For expanding rawArgs
const expandedEntryId = ref<string | null>(null);
const toggleRawArgs = (id: string) => {
  expandedEntryId.value = expandedEntryId.value === id ? null : id;
};

</script>

<template>
  <div class="log-display-view">
    <div class="log-controls">
      <div class="filter-group">
        <label for="log-level-filter">Level:</label>
        <select id="log-level-filter" v-model="filterLevel">
          <option v-for="level in availableLogLevels" :key="level" :value="level">{{ level }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="log-keyword-filter">Keyword:</label>
        <input id="log-keyword-filter" v-model="filterKeyword" type="text" placeholder="Search messages..." />
      </div>
      <div class="filter-group">
        <label for="log-source-filter">Source:</label>
        <input id="log-source-filter" v-model="filterSource" type="text" placeholder="Search sources..." />
      </div>
      <div class="filter-group">
        <label for="log-device-filter">Device IDs (CSV):</label>
        <input id="log-device-filter" v-model="filterDeviceIdsInput" type="text" placeholder="e.g., camera1,focuser2" />
      </div>
      <div class="filter-group">
        <label for="global-log-level">Global Logger Level:</label>
        <select id="global-log-level" v-model="globalLogLevel">
          <option v-for="level in availableLogLevels.filter(l => l !== 'ALL')" :key="level" :value="level">{{ level }}</option>
        </select>
      </div>
      <div class="action-buttons">
        <button @click="logStore.clearLogs()">Clear Displayed Logs</button>
        <button @click="copyLogsToClipboard">Copy Logs</button>
        <button @click="downloadLogs">Download Logs</button>
      </div>
    </div>

    <div class="log-entries-area">
      <div v-if="logStore.filteredLogEntries.length === 0" class="no-logs">
        No logs to display matching current filters.
      </div>
      <div v-else class="log-entry-list">
        <div v-for="entry in logStore.filteredLogEntries" :key="entry.id" class="log-entry" :class="getLogLevelClass(entry.level)">
          <div class="log-entry-main-line">
            <div class="log-meta">
              <span class="timestamp">{{ entry.timestamp }}</span>
              <span class="level">[{{ entry.level }}]</span>
              <span v-if="entry.source" class="source">[{{ entry.source }}]</span>
              <span v-if="entry.deviceIds && entry.deviceIds.length" class="device-ids">[Dev: {{ entry.deviceIds.join(', ') }}]</span>
            </div>
            <div class="log-message" title="Click to toggle raw arguments" @click="toggleRawArgs(entry.id)">
              {{ entry.message }}
            </div>
          </div>
          <pre v-if="expandedEntryId === entry.id" class="raw-args">{{ JSON.stringify(entry.rawArgs, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-display-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  background-color: var(--aw-panel-bg-color);
  color: var(--aw-text-color);
  overflow: hidden;
}

.log-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--aw-border-color);
  margin-bottom: 0.75rem;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.filter-group label {
  font-weight: 500;
  color: var(--aw-text-color-secondary);
  font-size: 0.8rem;
}

.filter-group input[type="text"],
.filter-group select {
  padding: 0.3rem 0.5rem;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--aw-border-color);
  background-color: var(--aw-input-bg-color);
  color: var(--aw-input-text-color);
  min-width: 120px;
  font-size: 0.8rem;
}

.filter-group input[type="text"]:focus,
.filter-group select:focus {
  outline: none;
  border-color: var(--aw-primary-color);
  box-shadow: 0 0 0 2px var(--aw-primary-color-light);
}


.action-buttons {
  display: flex;
  gap: 0.35rem;
  margin-left: auto;
}

.action-buttons button {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: var(--border-radius-md);
  background-color: var(--aw-button-secondary-bg);
  color: var(--aw-button-secondary-text);
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.8rem;
}

.action-buttons button:hover {
  background-color: var(--aw-button-secondary-hover-bg);
}

.action-buttons button:first-child { /* Clear logs */
  background-color: var(--aw-button-danger-bg);
}

.action-buttons button:first-child:hover {
  background-color: var(--aw-button-danger-hover-bg);
}


.log-entries-area {
  flex-grow: 1;
  overflow-y: auto;
  background-color: var(--aw-log-entries-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--aw-shadow-sm); /* Consider theming this shadow */
}

.no-logs {
  text-align: center;
  padding: 2rem;
  color: var(--aw-text-color-secondary);
}

.log-entry-list {
  /* background-color: var(--aw-log-entry-list-bg-color); */
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace;
  font-size: 0.875rem;  
}

.log-entry {
  padding: 0.3rem 0.6rem;
  border-bottom: 1px solid var(--aw-border-color-light);
  line-height: 1.4;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry-main-line {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  width: 100%;
}

.log-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--aw-text-color-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.timestamp {
  font-weight: 500;
}

.device-ids {
  font-style: italic;
}

.log-message {
  word-break: break-all;
  cursor: pointer;
  color: var(--aw-text-color-primary);
  flex-grow: 1;
}

.log-message:hover {
  /* text-decoration: underline; */
}


.raw-args {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: var(--aw-code-bg-color);
  border-radius: var(--border-radius-sm);
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
  color: var(--aw-code-text-color);
}


/* Log level specific styling */
.log-level-error { 
  background-color: var(--aw-error-muted); /* Use muted for less harsh bg */
  border-left: 4px solid var(--aw-error-color);
  color: var(--aw-error-text-color);
}

.log-level-error .log-entry-main-line,
.log-level-error .log-message {
  color: var(--aw-error-text-color);
}

.log-level-error .level { 
  color: var(--aw-error-color); 
  font-weight: bold; 
}

.log-level-warn {
  background-color: var(--aw-warning-muted); /* Use muted for less harsh bg */
  border-left: 4px solid var(--aw-warning-color);
  color: var(--aw-warning-text-color);
}

.log-level-warn .log-entry-main-line,
.log-level-warn .log-message {
  color: var(--aw-warning-text-color);
}

.log-level-warn .level { 
  color: var(--aw-warning-color); 
  font-weight: bold; 
}

.log-level-info {
  background-color: var(--aw-info-bg-color-light);
  border-left: 4px solid var(--aw-info-color);
}

.log-level-info .log-entry-main-line,
.log-level-info .log-message {
  color: var(--aw-info-text-color);
}

.log-level-info .level { 
  color: var(--aw-info-color); 
  font-weight: bold; 
}

.log-level-debug {
  background-color: var(--aw-bg-color-subtle);
  border-left: 4px solid var(--aw-text-color-muted); /* Using a muted color for border */
}

.log-level-debug .log-entry-main-line,
.log-level-debug .log-message {
  color: var(--aw-text-secondary-color);
}

.log-level-debug .level { 
  color: var(--aw-text-color-muted); 
  font-weight: bold; 
}

.log-level-trace {
  background-color: var(--aw-bg-color-extra-subtle);
  border-left: 4px solid var(--aw-text-color-tertiary); /* Using a tertiary color for border */
  font-style: italic;
}

.log-level-trace .log-entry-main-line,
.log-level-trace .log-message {
  color: var(--aw-text-color-tertiary);
}

.log-level-trace .level { 
  color: var(--aw-text-color-tertiary); 
  font-weight: bold; 
}


.log-level-fatal {
  background-color: var(--aw-fatal-bg-color);
  border-left: 4px solid var(--aw-fatal-color);
}

.log-level-fatal .log-entry-main-line,
.log-level-fatal .log-message {
 color: var(--aw-fatal-text-color);
}

.log-level-fatal .level { 
  color: var(--aw-fatal-color); 
  font-weight: bold; 
}

</style> 