# Alpaca Web Panel System Design

## Overview

This document outlines the design for a flexible, user-customizable panel system for Alpaca Web that allows users to create layouts tailored to their specific astronomy workflows while adhering to the Alpaca specification.

## Core Concepts

### Panel Hierarchy

Panels use a priority-based system to organize features:

1. **Primary Features**

   - Essential controls required by the Alpaca spec
   - Always visible, even on small screens
   - Examples: Connect/disconnect, core device functions

2. **Secondary Features**

   - Important but not essential features
   - Visible on medium and large screens
   - Examples: Tracking control, cooler settings

3. **Tertiary Features**
   - Advanced or specialized features
   - May be collapsed on smaller screens
   - Examples: Custom actions, detailed status data

### Device-Specific Categorization

Each device type has smart defaults for feature categorization:

| Device Type  | Primary                    | Secondary                | Tertiary            |
| ------------ | -------------------------- | ------------------------ | ------------------- |
| Camera       | Exposure, Download         | Cooling, Binning         | Advanced Settings   |
| Telescope    | Slew Controls, Coordinates | Tracking, Alignment      | Meridian Settings   |
| Focuser      | Position Control           | Temperature Compensation | Backlash Settings   |
| Filter Wheel | Filter Selection           | Filter Details           | Advanced Options    |
| Dome         | Open/Close, Home           | Azimuth Control          | Advanced Automation |

### User Customization

- Users can override the default priority of any feature
- Customizations are stored in user preferences
- Simple UI for drag-and-drop prioritization

## Panel System Architecture

### Panel Components

1. **Device Connection Management**

   - Each panel includes connect/disconnect controls
   - Connection status indicators
   - Device selection dropdown

2. **Device Selection**

   - Ability to assign specific devices to panels
   - Example: Multiple camera panels with different cameras assigned
   - Device type filtering

3. **Layout Management**

   - Template-based layouts for different workflows
   - Responsive design using priority system
   - Custom layout builder
   - Layout persistence

4. **Device Discovery Integration**
   - Discovery panel for finding new devices
   - Quick-add discovered devices to existing layouts
   - Auto-configuration based on discovered capabilities

## Implementation Details

### Panel Component Structure

```
Panel
├── PanelHeader
│   ├── DeviceSelector
│   ├── ConnectionControls
│   └── PanelActions
├── PanelContent
│   ├── PrimaryFeatures (always visible)
│   ├── SecondaryFeatures (collapsible)
│   └── TertiaryFeatures (collapsed by default)
└── PanelFooter
    └── StatusIndicators
```

### Device Selection Flow

1. User creates or edits a panel layout
2. User selects device type for a panel
3. System presents list of available devices of that type
4. User selects specific device to bind to the panel
5. Panel loads with device-specific features based on capabilities

### Responsive Behavior

- Primary features always visible on all screen sizes
- Secondary features visible on medium screens, collapsible on small screens
- Tertiary features collapsed by default on smaller screens
- Layout adjusts based on screen size (column stacking, etc.)

## Future Enhancements

1. **Layout Sharing**

   - Export/import layout configurations
   - Community-shared layouts

2. **Workflow Presets**

   - Task-specific layouts (imaging, visual, planetary)
   - Auto-selection of relevant devices

3. **Dynamic Panels**
   - Context-aware panels that change based on current operation
   - Workflow step guidance

## Next Steps

1. Complete prototype implementation
2. User testing of categorization defaults
3. Implement device selection and connection management
4. Integrate with discovery system
5. Add user preference persistence
