# Alpaca Web Prototypes

This directory contains isolated prototype implementations for future Alpaca Web features. These prototypes allow for experimentation and testing of new concepts without affecting the main application.

## Available Prototypes

### Panel System Prototype

The panel system prototype demonstrates the flexible panel layout system for Alpaca Web, including panel definitions based on Alpaca specification for Camera, Telescope, and Focuser devices.

#### Features:

- Device-specific panel definitions with primary, secondary, and tertiary features
- Integration with ASCOM Alpaca specification
- Feature prioritization based on UI mode (Overview, Detailed, Fullscreen)
- Capability-based feature filtering

#### How to View:

1. Run the development server: `npm run dev | cat`
2. Navigate to: http://localhost:3000/prototypes/panel-system
3. Click the "Panel Definitions" tab to view the panel definitions for each device type

The Panel Definition Viewer lets you:

- View different device type panels (Camera, Telescope, Focuser)
- See how features are categorized into primary, secondary, and tertiary
- Test how different UI modes affect visible features

[View detailed documentation](./panel-system/README.md)

### Astronomical Object Catalog Demo

A standalone prototype for an Astronomical Object Catalog panel that allows users to search for celestial objects and send coordinates to a telescope.

#### Features:

- Search for celestial objects by name or catalog ID (e.g., M31, Andromeda)
- View object details including images and coordinates
- Filter objects by catalog type and object classification
- Save favorite objects for quick access
- Send object coordinates to a connected telescope
- Responsive design with three UI modes: Overview, Detailed, and Fullscreen

#### How to View:

1. Run the development server: `npm run dev | cat`
2. Navigate to: http://localhost:3000/prototypes/catalog-demo
3. Try searching for objects like "M31", "Orion", or "Jupiter"

This panel is designed to be integrated with the main panel system once the core device panels are fully implemented.

[View detailed documentation](./catalog-demo/README.md)

## Design Considerations for Panel System

### Feature Categorization

When designing panels, we should categorize features based on:

1. **Source of Feature**

   - Core Alpaca Spec features - directly mapped to the ASCOM API
   - Extended features - built on top of the Alpaca spec

2. **Interaction Type**

   - Actions - commands sent to the device (e.g., slew, connect)
   - Dynamic Data - values that change frequently and require polling (e.g., temperature)
   - Settings - configurations that typically change only when adjusted by the user
   - Modes - operational states that fundamentally change device behavior (e.g., equatorial vs alt-az)

3. **Priority Level**

   - Primary - essential controls required for basic operation
   - Secondary - important but not essential features
   - Tertiary - advanced or specialized features

4. **Control Type Adaptation**
   - Certain features require different UI controls based on device mode
   - Example: Gain Index Mode vs Gain Value Mode need different controls

### Responsive Design

Panels should be responsive by default, adapting to available space:

- Primary features always visible
- Secondary features visible when space allows
- Tertiary features collapsed but accessible when needed

The separate "UI Mode" concept (Overview, Detailed, Fullscreen) is redundant and should be eliminated in favor of a purely responsive design that follows the priority categorization.

### Screen Real Estate Optimization

Current panel definitions consume too much screen space. Future iterations should:

- Use more compact controls where appropriate
- Employ collapsible sections for related settings
- Consider context-sensitive controls that appear only when needed

### Device-Specific Layout Systems

While layouts share which device panels are included, it's important to note that the actual positioning and arrangement of panels should be configurable separately for each device type:

- Desktop layouts: Optimized for large screens with multi-column arrangements
- Tablet layouts: Adapted for medium screens with simplified positioning
- Mobile layouts: Completely reorganized for vertical scrolling on small screens

This separation ensures that layouts aren't just scaled-down versions of each other but are purposefully designed for each form factor. Panel inclusion remains consistent across devices (e.g., if a Camera panel is in the desktop layout, it should also be in the tablet and mobile layouts), but their arrangement, size, and priority-based visibility can differ significantly.

The Custom Layout Builder should be enhanced to allow separate configuration of panel positioning for each device type while maintaining the included panels across all form factors.

### Navigation System Redesign

The current navigation with separate top and side navigation bars needs reconsideration. We should explore:

1. **Unified Navigation Approach**

   - A collapsible side navigation for workspace/layout selection and app-wide functions
   - Context-aware top navigation that adapts based on current workspace/layout
   - Reduced visual noise by combining elements where appropriate

2. **Hierarchical Organization**

   - Workspaces → Layouts → Panels → Device Controls
   - Clear visual hierarchy showing the current position within the application

3. **Personalization Options**

   - Ability to pin frequently used functions
   - Customizable navigation shortcuts
   - Recently used items for quick access

4. **Context-Aware Navigation System**

   - **Panel Context API**: Panels expose a standard "context" property describing their type and state (e.g., "camera:imaging", "mount:tracking")
   - **Context Events**: Panels emit events when significant state changes occur (e.g., "exposure-started", "filter-changed")
   - **Navigation Context Manager**: Centralized service that listens to all active panels and determines application context
   - **Rule-Based Configuration**: Declarative rules that link panel contexts to navigation items (e.g., "When camera is exposing AND mount is tracking, show dithering controls")
   - **Implementation Components**:
     - `PanelContextProvider`: Mixin/component that any panel can include to participate in the context system
     - `NavigationContextManager`: Service observing all active panels
     - `contextRules.ts`: Configuration file defining the mapping rules

   **Examples of Contextual Navigation:**

   - **Session-specific**: Show sequence controls during imaging, focus metrics during focusing
   - **Equipment-aware**: Show "Filter Focus Offsets" when camera + filter wheel + focuser are connected
   - **Workflow-stage**: Emphasize device discovery during setup, sequence controls during imaging
   - **Environmental**: Show planning tools during daytime, active session controls at night
   - **Mode-specific**: Show eyepiece calculator in visual mode, integration time calculator in astrophotography mode

### Device Discovery and Selection Improvements

The current "Discovery" system works well functionally but has UX issues:

1. **In-Panel Device Selection**

   - Each panel should have a device selector dropdown directly in its header
   - The dropdown lists discovered devices filtered by the panel's device type
   - "Manually Add Device" option at the bottom of each dropdown

2. **Simplified Discovery Process**

   - Refresh icon in the navigation for triggering discovery
   - Non-intrusive notifications showing "X new devices found"
   - Ability to filter discovered devices by type, connection state, etc.

3. **Device Persistence**
   - Manually added devices should persist across sessions
   - Last used device for each panel type remembered
   - Option to "forget" devices no longer needed

### Notifications System

A dedicated notifications system should be implemented:

1. **Notification Types**

   - System events (new devices discovered, connection issues)
   - Device events (actions completed, errors occurred)
   - User-directed notifications (action required)

2. **Notification Center**

   - Accessible via icon in the navigation
   - Shows history of notifications
   - Ability to clear individual or all notifications
   - Optional grouping by device or notification type

3. **Visual States**
   - Differentiated visual styles for info, warning, error
   - Transient notifications that auto-dismiss
   - Critical notifications that require user acknowledgment

### Debugging and Troubleshooting

A dedicated debugging panel for troubleshooting:

1. **System Log Viewer**

   - Filterable log of all actions and events
   - Timestamps and source indicators
   - Copy functionality for sharing logs

2. **Request/Response Inspector**

   - View actual API requests made to devices
   - Response data and timing information
   - Ability to retry failed requests

3. **Device State Viewer**

   - Current state of all connected devices
   - Historical state changes over time
   - Comparison between expected and actual states

4. **Performance Metrics**
   - Connection latency monitoring
   - Polling frequency and timing
   - Resource usage statistics

These debug tools should be easily accessible but not intrusive to normal operation, possibly through a dedicated "Developer Mode" toggle.

### Examples from Alpaca Specification

Below are concrete examples from the Alpaca specification to illustrate our categorization approach:

#### Camera Device Examples

| Feature           | Source      | Interaction Type | Priority  | Control Considerations                                  |
| ----------------- | ----------- | ---------------- | --------- | ------------------------------------------------------- |
| StartExposure     | Core Alpaca | Action           | Primary   | Primary action for cameras                              |
| StopExposure      | Core Alpaca | Action           | Primary   | Emergency control, always accessible                    |
| ImageReady        | Core Alpaca | Dynamic Data     | Primary   | Status feedback for main function                       |
| CoolerOn          | Core Alpaca | Setting/Mode     | Secondary | Changes operational mode, toggle UI                     |
| Temperature       | Core Alpaca | Dynamic Data     | Secondary | Real-time data requiring polling                        |
| TargetTemperature | Core Alpaca | Setting          | Secondary | User-adjustable value                                   |
| GainMode          | Core Alpaca | Mode             | Tertiary  | Impacts which controls should be shown (Index vs Value) |
| Gains             | Core Alpaca | Setting          | Tertiary  | If GainMode is Index, show as dropdown                  |
| Gain              | Core Alpaca | Setting          | Tertiary  | If GainMode is Value, show as slider/input              |
| ImageHistory      | Extended    | Feature          | Secondary | Built on top of Alpaca (stores images)                  |

#### Telescope Device Examples

| Feature                    | Source      | Interaction Type | Priority  | Control Considerations                               |
| -------------------------- | ----------- | ---------------- | --------- | ---------------------------------------------------- |
| Slew (various methods)     | Core Alpaca | Action           | Primary   | Primary telescope function                           |
| AbortSlew                  | Core Alpaca | Action           | Primary   | Safety control, always accessible                    |
| Tracking                   | Core Alpaca | Mode             | Primary   | Fundamental operational state                        |
| RightAscension/Declination | Core Alpaca | Dynamic Data     | Primary   | Core positional data, frequent updates               |
| SlewToCoordinates          | Core Alpaca | Action           | Primary   | Primary telescope function                           |
| AlignmentMode              | Core Alpaca | Mode             | Secondary | Affects coordinate system (Alt/Az vs Equatorial)     |
| SiteLatitude/Longitude     | Core Alpaca | Setting          | Tertiary  | Rarely changed configuration                         |
| FindHome                   | Core Alpaca | Action           | Secondary | Periodic maintenance function                        |
| ParkingStatus              | Core Alpaca | Dynamic Data     | Secondary | Operational state requiring polling                  |
| PrecisionPointing          | Extended    | Feature          | Tertiary  | Built on top of Alpaca (combines multiple API calls) |

#### Focuser Device Examples

| Feature                | Source      | Interaction Type | Priority  | Control Considerations                                |
| ---------------------- | ----------- | ---------------- | --------- | ----------------------------------------------------- |
| Move                   | Core Alpaca | Action           | Primary   | Primary focuser function                              |
| Position               | Core Alpaca | Dynamic Data     | Primary   | Key position data, requires polling                   |
| Halt                   | Core Alpaca | Action           | Primary   | Safety control, always accessible                     |
| IsMoving               | Core Alpaca | Dynamic Data     | Primary   | Status feedback for main function                     |
| TempComp               | Core Alpaca | Mode             | Secondary | Mode that changes behavior, toggle UI                 |
| Temperature            | Core Alpaca | Dynamic Data     | Secondary | Real-time data requiring polling                      |
| MaxStep                | Core Alpaca | Setting          | Tertiary  | Device capability, rarely changed                     |
| FocuserPositionHistory | Extended    | Feature          | Tertiary  | Built on top of Alpaca (records best focus positions) |

These examples demonstrate how to classify and prioritize features when designing device panels, helping to create a more intuitive and efficient user interface.

## Development Guidelines

When creating prototypes:

1. Keep them isolated from the main application
2. Document thoroughly with a README.md
3. Make them accessible through the Settings view
4. Include clear usage instructions and cleanup steps

## Using Prototypes

Prototypes can be accessed through the "Prototypes & Experiments" section in the Settings view. This provides a safe way to try new features while keeping them separate from the core application.

## Cleanup

When a prototype is no longer needed (either rejected or integrated into the main application), it can be safely removed by deleting its directory. Be sure to also remove any references to it in:

- Router configuration
- Settings view
- Any import statements

## Creating New Prototypes

To create a new prototype:

1. Create a new directory in `src/prototypes/`
2. Add a README.md documenting the prototype purpose and usage
3. Register a route in `router/index.ts` (using lazy loading)
4. Add a link in the Settings view prototype section
