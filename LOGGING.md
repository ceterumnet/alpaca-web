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
      - Server-side: If logs are written to files on the server, provide an endpoint to download them (requires careful security consideration).

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
