# These are Dave's personal notes about the system

- Need to understand how the different architecture layers should work
- Breadrumb and navigation state have been removed by me because I'm not sure they will be needed
-

TODO:

- [ ] Add all alpaca device types
- [ ] Test standalone operation without a node server running
  - [ ] Need to verify logic around proxy vs direct call
- [ ] Revise device management system to:
  - [x] Automatically add all of the devices discovered to the device store
  - [x] Have better names for the devices, for example Camera 0 is ambiguous
    - [ ] Probably a good idea to have customizable names
    - [x] Need to figure out canonical name scheme so that even between sessions we can keep the same settings / data associated with said device
  - [x] Disable autoconnect when adding a device from discovery
- [ ] Figure out logging system
- [ ] Wire settings up
- [x] New visual layouts for the panels
- [x] Integrate layout edit button more nicely - it's a giant bar right now...doesn't need to be
- [ ] Wire up PHD2 monitor - https://github.com/OpenPHDGuiding/phd2/wiki/EventMonitoring
- [x] The buttons on the top right of the panels aren't wired up

- [x] Layout Management:

  - [x] Need to have a settings option to nuke layout store (and potentially any of the other stores that have persistence)
  - [x] No way to delete layouts
  - [x] No option to set a layout as default

  Preview Functionality:

  - [x] The preview mode doesn't allow switching between desktop/tablet/mobile viewports
  - [x] No responsive preview to test how layouts behave at different screen sizes

  Panel Configuration:

  - [x] Limited controls for device-specific panel configuration
  - [x] No drag-and-drop reordering of panels (only manual position editing)
