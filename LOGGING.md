# Logging Strategy

This document outlines the current state of logging in the Alpaca Web project and provides recommendations for improvement.

## Current State of Logging

Logging in the project is currently performed primarily using the browser's `console` object (`console.log`, `console.warn`, `console.error`, `console.info`, `console.debug`).

Based on a review of the codebase, the following patterns are observed:

- **Extensive Use of `console.log`:** `console.log` is widely used for various purposes, including:
  - Debugging during development (e.g., logging variable states, function calls).
  - Tracking application lifecycle events (e.g., component mounting, store initialization).
  - Outputting status messages for operations (e.g., API calls, discovery processes).
- **Error Reporting:** `console.error` is used to log caught exceptions and error conditions.
- **Warnings:** `console.warn` is used for non-critical issues or deprecated features.
- **Inconsistent Formatting:** There's no consistent format for log messages. Some include prefixes like `[DEBUG]` (from `src/utils/debugUtils.ts`) or store names, while others are plain messages.
- **Verbosity:** Many logs appear to be for development-time debugging and might be too verbose for a production environment or for general user troubleshooting.
- **Lack of Levels:** While `console.error` and `console.warn` imply some level of severity, there isn't a systematic use of logging levels (e.g., TRACE, DEBUG, INFO, WARN, ERROR, FATAL).
- **No Centralized Configuration:** Logging behavior (e.g., enabling/disabling certain levels, changing output destinations) is not centrally configurable.
- **Direct Console Usage:** Most logging is done directly via `console.x()` calls scattered throughout the codebase.

**Examples of current logging:**

- `server/index.js`: Logs server startup, proxy requests, and errors.
- `src/lib/ASCOMImageBytes.ts`: Uses `console.warn` and `console.error` for issues during image processing.
- `src/utils/debugUtils.ts`: Provides a `debugLog` function that prefixes messages with `[DEBUG]`.
- `src/stores/`: Various stores (`useEnhancedDiscoveryStore`, `useUIPreferencesStore`, `useLayoutStore`, `modules/safetyMonitorActions.ts`) contain numerous `console.log` statements for state changes and operations.
- `src/App.vue`: Logs component lifecycle events and initial discovery status.

This ad-hoc approach can make it difficult to:

- Filter logs effectively.
- Understand the severity and context of log messages quickly.
- Control logging verbosity in different environments (development vs. production).
- Provide users with a clean and useful set of logs for troubleshooting.

## Recommendations for Improvement

- **Implement a Dedicated Logging Library:**
  - Introduce a well-established logging library (e.g., `loglevel`, `pino`, `vue-logger-plugin`, or similar). This provides features like:
    - Log levels (TRACE, DEBUG, INFO, WARN, ERROR, FATAL).
    - Configurable log outputs (e.g., console, file, remote server).
    - Log formatting.
    - Filtering by level or component.
- **Define Clear Logging Levels:**
  - **TRACE:** Very fine-grained information, typically only useful for deep debugging of specific modules.
  - **DEBUG:** Information useful for developers during debugging.
  - **INFO:** General application flow and significant events (e.g., service started, user action completed).
  - **WARN:** Potential issues or unexpected situations that don't necessarily break functionality but should be noted.
  - **ERROR:** Errors that affect functionality but don't crash the application.
  - **FATAL:** Critical errors that cause the application to terminate or become unstable.
- **Standardize Log Message Format:**
  - Include a timestamp.
  - Include the log level.
  - Include the source of the log (e.g., component name, store name, module name).
  - Example: `[2023-10-27T10:30:00Z] [INFO] [DeviceDiscovery] Discovery process started.`
- **Refactor Existing `console.log` Statements:**
  - Review all existing `console.log` (and other console calls).
  - Replace them with calls to the new logging library, assigning appropriate levels.
  - Remove purely debug-oriented logs that are no longer necessary or convert them to TRACE/DEBUG levels.
- **Centralized Logging Configuration:**
  - Allow configuration of the default log level (e.g., INFO for production, DEBUG for development).
  - Potentially allow users to adjust the log level dynamically for troubleshooting (see next section).
- **Contextual Logging:**
  - When logging errors, include relevant context (e.g., device ID, parameters involved, stack trace if available).
- **Review Server-Side Logging:**
  - Ensure server-side logs (from `server/index.js` and `server/alpacaDiscovery.js`) also follow these new conventions. Server logs might benefit from outputting to a file in addition to the console.

## Exposing Logs to Users for Troubleshooting

Providing users with access to logs can be invaluable for diagnosing issues, especially in a distributed system like Alpaca. Here are a few approaches:

1.  **In-App Log Viewer:**

    - **Concept:** Create a dedicated section or modal within the Alpaca Web UI where users can view recent logs.
    - **Features:**
      - Display logs with timestamps, levels, and messages.
      - Allow filtering by log level (e.g., show only WARN and ERROR).
      - Allow searching/filtering by keywords.
      - Provide a button to "Copy logs to clipboard" or "Download logs as .txt file".
      - Option to dynamically change the client-side logging verbosity (e.g., switch from INFO to DEBUG temporarily).
    - **Implementation:**
      - The chosen logging library might offer an in-memory buffer or a way to subscribe to log events.
      - A new Vue component would render these logs.
      - The Notification Manager UI in `App.vue` could be an inspiration, or a similar modal could be used.

2.  **Downloadable Log File:**

    - **Concept:** Allow users to download a file containing more extensive logs than what might be shown in an in-app viewer.
    - **Implementation:**
      - If a logging library is configured to also write to a structured format (like JSON) or an in-memory circular buffer, this data can be serialized and offered as a download.
      - Client-side: Collect logs in an array, then generate a Blob and trigger a download.
      - Server-side: If logs are written to files on the server, provide an endpoint to download them - not really security sensitive as this is never exposed publicly

3.  **Browser Developer Tools:**
    - **Current Method:** Users can already access logs via the browser's developer console.
    - **Improvement:** By adopting a structured logging approach with clear levels and formatting, these console logs become much more useful even without a dedicated in-app viewer. Users can use the browser's built-in filtering capabilities.

**Recommended Approach for Alpaca Web:**

- Start by implementing a robust client-side logging library and refactoring existing console calls. This immediately improves the quality of logs available in the browser console.
- Then, develop an **In-App Log Viewer**. This offers the best balance of convenience and power for users.
  - It can be integrated into the existing UI (perhaps near the notification manager).
  - It should allow basic filtering and a way to export logs.
  - Consider making the log level dynamically configurable through this UI for advanced troubleshooting.

**Technical Considerations for In-App Log Viewer:**

- **Performance:** Avoid rendering thousands of log lines directly in the DOM. Use virtualization or pagination if logs can become very large.
- **Storage:** Decide how many log entries to keep in memory. A circular buffer is a good approach.
- **Security/Privacy:** Be mindful of what information is logged, especially if logs can be exported. Avoid logging sensitive data unless absolutely necessary and clearly indicated.

By implementing these changes, the Alpaca Web project will have a more mature, maintainable, and user-friendly logging system.

## Implemented Logging Strategy with `vue-logger-plugin`

This section outlines the refined strategy for implementing and utilizing `vue-logger-plugin` throughout the application, focusing on providing rich, filterable logs for both developers and users.

### 1. Log Entry Structure

All logs captured for the in-app viewer will be stored in `useLogStore` as `LogEntry` objects with the following structure:

```typescript
export interface LogEntry {
  id: string // Auto-generated unique ID (timestamp + random string)
  timestamp: string // ISO string format (e.g., "2023-10-27T10:30:00.123Z")
  level: LogLevel // 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
  source?: string // Origin of the log (e.g., "MyComponent.vue:myFunction", "useMyStore.ts")
  // Used for module/system level filtering.
  message: string // The primary log message, constructed from logger arguments.
  deviceIds?: string[] // Optional array of device UIDs relevant to this log entry.
  // Used for device-specific filtering.
  rawArgs: unknown[] // The original arguments passed to the logger function.
}
```

### 2. Logging Conventions

To ensure logs are informative and properly contextualized:

- **General Logs (System/Module Level):**
  - Use standard logger calls: `log.info('User logged in', userData);`
  - The `source` field will be automatically derived by the logger plugin using `callerInfo` (filename, component name, function name).
- **Device-Specific Logs:**
  - To associate a log entry with specific device(s), provide a context object as the **first argument** to the logger call. This object **must** contain a `deviceIds` property, which is an array of strings.
  - Example:
    ```typescript
    log.info({ deviceIds: ['camera-001'] }, 'Exposure started for camera-001', { duration: 5 })
    log.error({ deviceIds: ['telescope-main', 'focuser-aux'] }, 'Sync failed between telescope and focuser')
    ```
  - The `UiLogCaptureHook` will extract `deviceIds` from this context object. The remaining arguments will form the `message`.
- **Clarity:** Ensure log messages are clear, concise, and provide sufficient context.

### 3. Log Capture and Storage Mechanism

- **Plugin Configuration (`src/plugins/logger.ts`):**
  - `vue-logger-plugin` is initialized with `callerInfo: true` to enable automatic `source` derivation.
  - A custom `prefixFormat` function formats logs for the browser console (timestamp, level, source).
  - The global log `level` is set dynamically (e.g., 'debug' for development, 'info' for production).
- **`UiLogCaptureHook` (`src/plugins/logger.ts`):**
  - This `afterHook` intercepts every log event.
  - It constructs a `LogEntry` object by:
    - Generating a `timestamp`.
    - Extracting the `level`.
    - Deriving `source` from `event.caller` (filename, function name).
    - Checking `event.argumentArray[0]` for a context object. If found and it has a `deviceIds` array, these are extracted.
    - Concatenating the remaining log arguments (or all arguments if no context object) to form the `message`.
    - Storing the original `event.argumentArray` in `rawArgs`.
  - The fully formed `LogEntry` is then passed to `useLogStore`.
- **`useLogStore` (`src/stores/useLogStore.ts`):**
  - A Pinia store responsible for managing log entries.
  - Stores a capped number of `LogEntry` objects (e.g., `MAX_LOG_ENTRIES = 1000`) in a reactive array, adding new entries to the beginning.
  - Provides reactive state for filter criteria (see Filtering section).
  - Exposes a computed property `filteredLogEntries` that returns logs based on the active filters.
  - **Important:** The store itself does _not_ filter logs at the point of ingestion beyond the `MAX_LOG_ENTRIES` limit. It stores all logs that pass the global logger level and provides dynamic filtering for display.

### 4. In-App Log Viewer (Planned Features & Filtering)

A dedicated UI component (`LogViewer.vue` or similar) will provide access to the captured logs with the following features:

- **Display:** Shows a list/table of `filteredLogEntries` from `useLogStore`.
- **Dynamic Filtering Capabilities:**
  - **By Log Level:** A dropdown to select specific levels (TRACE, DEBUG, INFO, WARN, ERROR, FATAL) or 'ALL'.
  - **By Source/Module:** A text input to filter logs where the `source` field contains the entered keyword (case-insensitive).
  - **By Device ID(s):** A text input or multi-select component to specify one or more device IDs. Logs will be shown if their `deviceIds` array contains any of the selected device IDs. When a device filter is active, logs without any `deviceIds` (i.e. system logs) might be hidden or shown based on a toggle, to allow focus on device-specific issues.
  - **By Message Keyword:** A text input to filter logs where the `message` field contains the entered keyword (case-insensitive).
- **Log Management:**
  - Button to `clearLogs()` from the `useLogStore`.
  - Button to "Copy logs to clipboard".
  - Button to "Download logs as .txt file".
- **Logger Control:**
  - A UI element (e.g., dropdown) to dynamically change the _global active log level_ of the `vue-logger-plugin` itself using `logger.apply({ level: newLevel })`. This controls what gets logged application-wide and subsequently captured by the hook.

### 5. Refactoring Existing `console.x` Calls

When migrating existing `console.log`, `console.warn`, and `console.error` statements:

1.  **Choose the Correct Level:**
    - `console.error` -> `log.error()`
    - `console.warn` -> `log.warn()`
    - `console.log` -> Evaluate context:
      - User-facing important events: `log.info()`
      - Developer-focused debugging information: `log.debug()`
      - Very verbose, detailed tracing: `log.trace()` (if a TRACE level is defined and used)
2.  **Provide Device Context:** If the log pertains to a specific device or set of devices, include the context object as the first argument: `log.info({ deviceIds: ['myDevice'] }, 'Device status updated');`
3.  **Ensure Message Clarity:** Make sure the log message is understandable and provides useful information.
4.  **Use `useLogger()`:** In Vue components (Composition API), get the logger instance via `const log = useLogger();`. In Pinia stores or other TypeScript modules, import the logger instance from ` '@/plugins/logger'`.

## Files with Console Logging

The following table tracks the progress of migrating console logging statements to the new logging system.

| File Path                                                 | Status  | Migrated |
| :-------------------------------------------------------- | :------ | :------- |
| `server/alpacaDiscovery.js`                               | Skipped | [ ]      |
| `server/index.js`                                         | Skipped | [ ]      |
| `src/lib/ASCOMImageBytes.ts`                              | Pending | [ ]      |
| `src/views/GridLayoutDemo.vue`                            | Pending | [ ]      |
| `src/views/PanelLayoutView.vue`                           | Pending | [ ]      |
| `src/utils/debugUtils.ts`                                 | Pending | [ ]      |
| `src/utils/alpacaPropertyAccess.ts`                       | Pending | [ ]      |
| `src/stores/useUIPreferencesStore.ts`                     | Pending | [ ]      |
| `src/stores/useEnhancedDiscoveryStore.ts`                 | Pending | [ ]      |
| `src/stores/useLayoutStore.ts`                            | Pending | [ ]      |
| `src/App.vue`                                             | Pending | [ ]      |
| `src/components/discovery/AlpacaDevicesTable.vue`         | Pending | [ ]      |
| `src/components/discovery/AlpacaDeviceEntry.vue`          | Pending | [ ]      |
| `src/components/discovery/ManualDiscoveryDialog.vue`      | Pending | [ ]      |
| `src/components/devices/DeviceControlPanel.vue`           | Pending | [ ]      |
| `src/components/devices/CameraControlPanel.vue`           | Pending | [ ]      |
| `src/components/devices/ActionsNotSupported.vue`          | Pending | [ ]      |
| `src/components/panels/DevicePanel.vue`                   | Pending | [ ]      |
| `src/components/panels/PanelContextMenu.vue`              | Pending | [ ]      |
| `src/components/panels/PanelHeader.vue`                   | Pending | [ ]      |
| `src/components/panels/features/StandardActionsPanel.vue` | Pending | [ ]      |
| `src/components/ui/NotificationManager.vue`               | Pending | [ ]      |
| `src/services/imaging/fitsUtils.ts`                       | Pending | [ ]      |
| `src/services/interfaces/IDeviceService.ts`               | Pending | [ ]      |
| `src/services/deviceServiceFactory.ts`                    | Pending | [ ]      |
| `src/services/localDeviceService.ts`                      | Pending | [ ]      |
| `src/services/remoteDeviceService.ts`                     | Pending | [ ]      |
| `src/stores/modules/deviceActions.ts`                     | Pending | [ ]      |
| `src/stores/modules/domeActions.ts`                       | Pending | [ ]      |
| `src/stores/modules/focuserActions.ts`                    | Pending | [ ]      |
| `src/stores/modules/rotatorActions.ts`                    | Pending | [ ]      |
| `src/stores/modules/safetyMonitorActions.ts`              | Pending | [ ]      |
| `src/stores/modules/switchActions.ts`                     | Pending | [ ]      |
| `src/stores/modules/telescopeActions.ts`                  | Pending | [ ]      |
| `src/stores/useAlpacaDeviceStore.ts`                      | Pending | [ ]      |
| `src/stores/useDeviceDetailStore.ts`                      | Pending | [ ]      |
| `src/stores/useDeviceInteractionStore.ts`                 | Pending | [ ]      |
| `src/stores/useDiscoveryStore.ts`                         | Pending | [ ]      |
| `src/stores/useNotificationStore.ts`                      | Pending | [ ]      |
| `src/stores/useUnifiedDeviceStore.ts`                     | Pending | [ ]      |
| `src/plugins/vuetify.ts`                                  | Pending | [ ]      |
| `src/router/index.ts`                                     | Pending | [ ]      |
| `cypress/e2e/camera.cy.ts`                                | Pending | [ ]      |
| `cypress/e2e/darkmode.cy.ts`                              | Pending | [ ]      |
| `cypress/e2e/device_interaction.cy.ts`                    | Pending | [ ]      |
| `cypress/e2e/discovery_and_connection.cy.ts`              | Pending | [ ]      |
| `cypress/e2e/dome.cy.ts`                                  | Pending | [ ]      |
| `cypress/e2e/focuser.cy.ts`                               | Pending | [ ]      |
| `cypress/e2e/layout_management.cy.ts`                     | Pending | [ ]      |
| `cypress/e2e/navigation.cy.ts`                            | Pending | [ ]      |
| `cypress/e2e/rotator.cy.ts`                               | Pending | [ ]      |
| `cypress/e2e/safetymonitor.cy.ts`                         | Pending | [ ]      |
| `cypress/e2e/switch.cy.ts`                                | Pending | [ ]      |
| `cypress/e2e/telescope.cy.ts`                             | Pending | [ ]      |
| `cypress/support/commands.ts`                             | Pending | [ ]      |
| `tests/components/forms/NumberInput.spec.ts`              | Pending | [ ]      |
| `tests/components/panels/PanelHeader.spec.ts`             | Pending | [ ]      |
| `tests/stores/modules/deviceActions.spec.ts`              | Pending | [ ]      |
| `tests/stores/useAlpacaDeviceStore.spec.ts`               | Pending | [ ]      |
| `tests/stores/useEnhancedDiscoveryStore.spec.ts`          | Pending | [ ]      |
| `tests/stores/useLayoutStore.spec.ts`                     | Pending | [ ]      |
| `tests/stores/useUIPreferencesStore.spec.ts`              | Pending | [ ]      |
| `tests/utils/alpacaPropertyAccess.spec.ts`                | Pending | [ ]      |
| `tests/views/PanelLayoutView.spec.ts`                     | Pending | [ ]      |
| `src/main.ts`                                             | Pending | [ ]      |

<!-- Add more files as needed -->
