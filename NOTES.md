# These are Dave's personal notes about the system

- Need to understand how the different architecture layers should work
- Breadrumb and navigation state have been removed by me because I'm not sure they will be needed
-

FUTURE:

- [ ] Wire up PHD2 monitor - https://github.com/OpenPHDGuiding/phd2/wiki/EventMonitoring
- [ ] add support for Alpaca supported actions

        Ok - we have the base client along with the other clients in@api- Additionally, we have @UnifiedStore.ts along with some other helpers such as @AlpacaFeatureMap.ts @alpacaPropertyAccess.ts

        There is a part of the alpaca spec that I would like to implement which is supportedactions.

        The return result is a list of values that can then be used in the "action" API endpoint with a PUT per the spec.

  TODO:

- [x] Write unit tests for clients
- [ ] Write unit tests for stores:
- [ ] Notifications are weird. The CSS styles aren't quite right they don't always honor dark mode
- [ ] Toasts should only show up for errors
- [ ] Opening notifications doesn't need to generate a notification :)
- [ ] Generate Audit for Simplified Panels against what is available in the stores
- [ ] Create build instruction with specific examples of how the 2 critical environment variables work: `VITE_APP_BASE_PATH=/html/ VITE_APP_DISCOVERY_MODE=direct npm run build`
- [ ] Update README.md to include a project overview with links to the different documents available
- [ ] Create logging system
- [ ] Wire settings up
- [x] Add all alpaca device types
- [x] Test standalone operation without a node server running
- [x] Revise device management system to:
  - [x] Automatically add all of the devices discovered to the device store
  - [x] Have better names for the devices, for example Camera 0 is ambiguous
    - [N] Probably a good idea to have customizable names
    - [x] Need to figure out canonical name scheme so that even between sessions we can keep the same settings / data associated with said device
  - [x] Disable autoconnect when adding a device from discovery
- [x] New visual layouts for the panels
- [x] Integrate layout edit button more nicely - it's a giant bar right now...doesn't need to be
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
