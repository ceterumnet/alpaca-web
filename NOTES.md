# These are Dave's personal notes about the system

- Need to understand how the different architecture layers should work
- Breadrumb and navigation state have been removed by me because I'm not sure they will be needed
-

TODO:

- [ ] Revise device management system to:
  - [ ] Automatically add all of the devices discovered to the device store
  - [ ] Have better names for the devices, for example Camera 0 is ambiguous
    - [ ] Probably a good idea to have customizable names
    - [ ] Need to figure out canonical name scheme so that even between sessions we can keep the same settings / data associated with said device
  - [ ] Disable autoconnect when adding a device from discovery
- [ ] Figure out logging system
- [ ] Wire settings up
- [x] New visual layouts for the panels
- [ ] Integrate layout edit button more nicely - it's a giant bar right now...doesn't need to be
- [ ] Wire up PHD2 monitor - https://github.com/OpenPHDGuiding/phd2/wiki/EventMonitoring
- [ ] The buttons on the top right of the panels aren't wired up

- [ ] Layout Management:

  - [x] Need to have a settings option to nuke layout store (and potentially any of the other stores that have persistence)
  - [x] No way to delete layouts
  - [x] No option to set a layout as default

  Preview Functionality:

  - [x] The preview mode doesn't allow switching between desktop/tablet/mobile viewports
  - [x] No responsive preview to test how layouts behave at different screen sizes

  Panel Configuration:

  - [x] Limited controls for device-specific panel configuration
  - [x] No drag-and-drop reordering of panels (only manual position editing)

  User Experience Issues:

  - Layout selector could benefit from thumbnails/previews
  - No confirmation when overwriting existing layouts
  - No visual feedback when making changes

  Advanced Features:

  - No export/import functionality for sharing layouts
  - No layout versioning or history
  - No layout templates or presets for common configurations

Available Devices Notes:

I would like to work on evolving how device discovery fits into the overall system

Currently, there is a dedicated UI that renders discovered devices along with provisions for adding devices manually - @DiscoveryView.vue and @DiscoveredDevices.vue

These were useful for validating the functionality, but we want the system to be more intuitive.

Specifically - the process of discovering devices is more of a background activity that the user generally doesn't need to worry about.

Right now, we have the idea of "Add to workspace" for the list of discovered devices. However, this has been made somewhat obsolete by our sophisticated layout management.

What would be ideal is that as devices are discovered, they are "added to the workspace" - this really means just adding it to the discoveredDevices store.

However, the practical implication of this is that those devices are available in the selection boxes in @BasePanel.vue which already implements filtering etc...to give the user the option of choosing the correct device.

Currently - there is a EnhancedSideBar component. We will probably remove this eventually.

There is also a DiscoveryIndicator component in the top nav. This probably needs to run discovery when the app loads and then every minute or so and also when clicked - it currently navigates to discovered devices...we don't want that. We just want it to do a spinner and then the discovery service should generate a notification that devices have been discovered and are available for use
