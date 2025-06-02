# These are Dave's personal notes about the system

## NOTES

- I've seen some weird inconsistencies in the store implementations and how variables / states are named and accessed
- I need to run an audit to ensure the stores use a consistent polling architecture. Perhaps that can be part of the devicestate revamp
- Need to review the \*DeviceProperties vs the states of the stores

```
I'm reviewing this file and also @coreActions.ts and I think the functionality in this file really belongs as part of @coreActions.ts .

I think this intent was lost a bit during one of many refactors, and only the @SimplifiedCameraPanel.vue is leveraging this file properly.

However, this file handles the various nuances of property names and their respective mappings between alpaca and the rest of the system.

Also, there is some weirdness and inconsistency between @switch-client.ts directly leveraging @value-transforms.ts which leads me to believe that @value-transforms.ts is also something that should just be part of @coreActions.ts or at least only leveraged inside of @coreActions.ts given that it is quite generic.

Additionally, I think that @property-mapping.ts may be a different strategy that is better than @value-transforms.ts / @alpacaPropertyAccess.ts

So you can see why I'm interesting in getting a rigorous analysis of this so I can determine what the best path forward is.

Please review and let me know what your thoughts are
```

FUTURE:

- [ ] Wire up PHD2 monitor - https://github.com/OpenPHDGuiding/phd2/wiki/EventMonitoring
- [ ] add support for Alpaca supported actions

        Ok - we have the base client along with the other clients in@api- Additionally, we have @UnifiedStore.ts along with some other helpers such as @AlpacaFeatureMap.ts @alpacaPropertyAccess.ts

        There is a part of the alpaca spec that I would like to implement which is supportedactions.

        The return result is a list of values that can then be used in the "action" API endpoint with a PUT per the spec.

# TODO

## Cleanup:

- [ ] Ensure that all of the panels are leveraging alpacaPropertyAccess

## Github stuff

- [ ] Figure out better dependabot configuration
- [ ] Automate distribution builds with standalone and proxy version

## Testing

- [x] Write unit tests for clients
- [x] Write unit tests for stores:
- [ ] Write unit tests for panels
- [ ] Write e2e tests...

## Features

- [x] Telescope Panel is missing a lot of indicators of status such as "At Home" / "Parked" / Slewing / Tracking. Some of these are combined with the inputs, but it isn't a great UX
- [ ] Wire settings up
- [x] Create logging system for user
- [ ] Filterwheel Panel should have concept of moving while switching filters

## Bugs

- [ ] We need to add some better handling of repeated failures to alpaca. They need to get marked as not supported after 3 calls or something like that
- [ ] ClientID needs to be initialized once and reused across the project
- [ ] ClientTransactionID needs to be initialized once and then incremented globally across the project
- [ ] Discovery errors need to be fixed
- [ ] Buttons on switch panel don't have the right colors
- [ ] Dome doesn't seem to be showing the status and has no polling. Also needs love
- [ ] Cover Calibrator has some sort of sequencing issue and doesn't seem to reflect the correct statuses

## UX Issues

- [x] Notifications are weird. The CSS styles aren't quite right they don't always honor dark mode
- [ ] Toasts should only show up for errors
- [ ] Opening notifications doesn't need to generate a notification :)

## Documentation

- [x] Generate Audit for Simplified Panels against what is available in the stores
- [ ] Create build instruction with specific examples of how the 2 critical environment variables work: `VITE_APP_BASE_PATH=/html/ VITE_APP_DISCOVERY_MODE=direct npm run build`
- [x] Update README.md to include a project overview with links to the different documents available

## General System

- [x] Need to implement the devicestate notes that were made
- [x] Do systemwide audit of logging patterns
- [x] Based on audit result, define consistent logging methodology

# Files:

```
src
├── api
│   ├── alpaca
│   │   ├── base-client.ts
│   │   ├── camera-client.ts
│   │   ├── covercalibrator-client.ts
│   │   ├── dome-client.ts
│   │   ├── errors.ts
│   │   ├── factory.ts
│   │   ├── filterwheel-client.ts
│   │   ├── focuser-client.ts
│   │   ├── index.ts
│   │   ├── observingconditions-client.ts
│   │   ├── rotator-client.ts
│   │   ├── safetymonitor-client.ts
│   │   ├── switch-client.ts
│   │   ├── telescope-client.ts
│   │   └── types.ts
│   └── AlpacaClient.ts
├── App.vue
├── assets
│   ├── base.css
│   ├── catalogs
│   │   ├── addendum.csv
│   │   ├── convert-ngc-csv-to-msgpack.cjs
│   │   ├── NGC.csv
│   │   └── ngc.msgpack
│   ├── components
│   │   ├── buttons.css
│   │   └── forms.css
│   ├── design-tokens.css
│   ├── icons
│   ├── main.css
│   └── modern-reset.css
├── components
│   ├── devices
│   │   ├── SimplifiedCameraPanel.vue
│   │   ├── SimplifiedCoverCalibratorPanel.vue
│   │   ├── SimplifiedDomePanel.vue
│   │   ├── SimplifiedFilterWheelPanel.vue
│   │   ├── SimplifiedFocuserPanel.vue
│   │   ├── SimplifiedObservingConditionsPanel.vue
│   │   ├── SimplifiedRotatorPanel.vue
│   │   ├── SimplifiedSafetyMonitorPanel.vue
│   │   ├── SimplifiedSwitchPanel.vue
│   │   └── SimplifiedTelescopePanel.vue
│   ├── discovery
│   │   └── ManualDiscoveryPrompt.vue
│   ├── layout
│   │   ├── LayoutContainer.vue
│   │   └── NavigationBar.vue
│   ├── navigation
│   │   └── DiscoveryIndicator.vue
│   ├── panels
│   │   ├── CameraControls.vue
│   │   ├── DeepSkyCatalogPanel.vue
│   │   ├── features
│   │   │   ├── CameraExposureControl.vue
│   │   │   └── CameraImageDisplay.vue
│   │   └── index.ts
│   └── ui
│       ├── CollapsibleSection.vue
│       ├── DeviceInfo.vue
│       ├── HistogramStretchControl.vue
│       ├── Icon.vue
│       ├── LogPanel.vue
│       ├── NotificationCenter.vue
│       ├── NotificationManager.vue
│       ├── SettingsPanel.vue
│       ├── SlideUpLogContainer.vue
│       └── ToastNotification.vue
├── lib
│   ├── ASCOMImageBytes.ts
│   ├── DisplayImageWorker.ts
│   └── HistogramWorker.ts
├── main.ts
├── plugins
│   └── logger.ts
├── router
│   └── index.ts
├── services
│   ├── DeviceComponentRegistry.ts
│   ├── DirectDiscoveryService.ts
│   ├── discoveryServiceFactory.ts
│   ├── imaging
│   │   ├── ImageProcessingService.ts
│   │   └── types.ts
│   ├── interfaces
│   │   └── DeviceDiscoveryInterface.ts
│   ├── NotificationService.ts
│   └── ProxiedDiscoveryService.ts
├── shims-vue.d.ts
├── stores
│   ├── modules
│   │   ├── cameraActions.ts
│   │   ├── coreActions.ts
│   │   ├── coverCalibratorActions.ts
│   │   ├── discoveryActions.ts
│   │   ├── domeActions.ts
│   │   ├── eventSystem.ts
│   │   ├── filterWheelActions.ts
│   │   ├── focuserActions.ts
│   │   ├── observingConditionsActions.ts
│   │   ├── rotatorActions.ts
│   │   ├── safetyMonitorActions.ts
│   │   ├── switchActions.ts
│   │   └── telescopeActions.ts
│   ├── types
│   │   └── device-store.types.ts
│   ├── UnifiedStore.ts
│   ├── useDeepSkyCatalogStore.ts
│   ├── useEnhancedDiscoveryStore.ts
│   ├── useLayoutStore.ts
│   ├── useLogStore.ts
│   ├── useNotificationStore.ts
│   └── useUIPreferencesStore.ts
├── types
│   ├── device.types.ts
│   ├── DiscoveredDevice.ts
│   ├── layouts
│   │   ├── GridLayoutDefinition.ts
│   │   ├── LayoutDefinition.ts
│   │   └── StaticLayoutTemplates.ts
│   ├── lodash-es.d.ts
│   ├── navigation
│   │   └── Context.ts
│   ├── notifications
│   │   └── NotificationTypes.ts
│   ├── panels
│   │   ├── AlpacaFeatureMap.ts
│   │   └── FeatureTypes.ts
│   ├── property-mapping.ts
│   ├── README.md
│   └── value-transforms.ts
├── ui
│   └── icons -> ../components/icons
├── utils
│   ├── alpacaPropertyAccess.ts
│   ├── astroCoordinates.ts
│   └── debugUtils.ts
└── views
    ├── LogDisplayView.vue
    ├── PanelLayoutView.vue
    ├── SettingsView.vue
    └── StyleGuideView.vue
```
