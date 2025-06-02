### .ts (TypeScript)

| File Path                                             | Category          | Reviewed | Notes                                                 |
| ----------------------------------------------------- | ----------------- | -------- | ----------------------------------------------------- |
| ./src/services/DeviceComponentRegistry.ts             | Service           | Yes      | Removed lots of unused code                           |
| ./src/services/DirectDiscoveryService.ts              | Service           | Yes      |                                                       |
| ./src/services/NotificationService.ts                 | Service           | No       |                                                       |
| ./src/services/discoveryServiceFactory.ts             | Service           | No       |                                                       |
| ./src/services/interfaces/DeviceDiscoveryInterface.ts | Service Interface | No       |                                                       |
| ./src/services/ProxiedDiscoveryService.ts             | Service           | No       |                                                       |
| ./src/services/imaging/ImageProcessingService.ts      | Imaging Service   | No       |                                                       |
| ./src/services/imaging/types.ts                       | Imaging Types     | No       |                                                       |
| ./src/api/alpaca/errors.ts                            | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/index.ts                             | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/safetymonitor-client.ts              | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/telescope-client.ts                  | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/base-client.ts                       | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/observingconditions-client.ts        | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/covercalibrator-client.ts            | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/camera-client.ts                     | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/filterwheel-client.ts                | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/types.ts                             | Alpaca API Types  | No       |                                                       |
| ./src/api/alpaca/focuser-client.ts                    | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/factory.ts                           | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/dome-client.ts                       | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/switch-client.ts                     | Alpaca API        | No       |                                                       |
| ./src/api/alpaca/rotator-client.ts                    | Alpaca API        | No       |                                                       |
| ./src/api/AlpacaClient.ts                             | Alpaca API        | No       |                                                       |
| ./src/router/index.ts                                 | Router            | No       |                                                       |
| ./src/plugins/logger.ts                               | Plugin            | No       |                                                       |
| ./src/stores/modules/cameraActions.ts                 | Store Module      | No       |                                                       |
| ./src/stores/modules/focuserActions.ts                | Store Module      | No       |                                                       |
| ./src/stores/modules/coverCalibratorActions.ts        | Store Module      | No       |                                                       |
| ./src/stores/modules/discoveryActions.ts              | Store Module      | No       |                                                       |
| ./src/stores/modules/rotatorActions.ts                | Store Module      | No       |                                                       |
| ./src/stores/modules/observingConditionsActions.ts    | Store Module      | No       |                                                       |
| ./src/stores/modules/switchActions.ts                 | Store Module      | No       |                                                       |
| ./src/stores/modules/filterWheelActions.ts            | Store Module      | No       |                                                       |
| ./src/stores/modules/telescopeActions.ts              | Store Module      | No       |                                                       |
| ./src/stores/modules/eventSystem.ts                   | Store Module      | No       |                                                       |
| ./src/stores/modules/domeActions.ts                   | Store Module      | No       |                                                       |
| ./src/stores/modules/coreActions.ts                   | Store Module      | No       | reworked devicestate and failed properties in general |
| ./src/stores/modules/safetyMonitorActions.ts          | Store Module      | No       |                                                       |
| ./src/stores/useLayoutStore.ts                        | Store             | No       |                                                       |
| ./src/stores/useLogStore.ts                           | Store             | No       |                                                       |
| ./src/stores/useDeepSkyCatalogStore.ts                | Store             | No       |                                                       |
| ./src/stores/types/device-store.types.ts              | Store Types       | No       |                                                       |
| ./src/stores/UnifiedStore.ts                          | Store             | No       |                                                       |
| ./src/stores/useUIPreferencesStore.ts                 | Store             | No       |                                                       |
| ./src/stores/useEnhancedDiscoveryStore.ts             | Store             | No       |                                                       |
| ./src/stores/useNotificationStore.ts                  | Store             | No       |                                                       |
| ./src/types/notifications/NotificationTypes.ts        | Types             | No       |                                                       |
| ./src/types/layouts/LayoutDefinition.ts               | Types             | No       |                                                       |
| ./src/types/layouts/GridLayoutDefinition.ts           | Types             | No       |                                                       |
| ./src/types/layouts/StaticLayoutTemplates.ts          | Types             | No       |                                                       |
| ./src/types/lodash-es.d.ts                            | Types             | No       |                                                       |
| ./src/types/property-mapping.ts                       | Types             | No       |                                                       |
| ./src/types/value-transforms.ts                       | Types             | No       |                                                       |
| ./src/types/DiscoveredDevice.ts                       | Types             | No       |                                                       |
| ./src/types/panels/FeatureTypes.ts                    | Types             | No       |                                                       |
| ./src/types/panels/AlpacaFeatureMap.ts                | Types             | No       |                                                       |
| ./src/types/navigation/Context.ts                     | Types             | No       |                                                       |
| ./src/types/device.types.ts                           | Types             | No       |                                                       |
| ./src/utils/alpacaPropertyAccess.ts                   | Utility           | No       |                                                       |
| ./src/utils/debugUtils.ts                             | Utility           | No       |                                                       |
| ./src/utils/astroCoordinates.ts                       | Utility           | No       |                                                       |
| ./src/lib/HistogramWorker.ts                          | Library           | No       |                                                       |
| ./src/lib/DisplayImageWorker.ts                       | Library           | No       |                                                       |
| ./src/lib/ASCOMImageBytes.ts                          | Library           | No       |                                                       |
| ./src/main.ts                                         | App Entry Point   | No       |                                                       |
| ./src/components/panels/index.ts                      | Panel Index       | No       |                                                       |

---

### .vue (Vue Components)

| File Path                                                       | Category             | Reviewed | Notes |
| --------------------------------------------------------------- | -------------------- | -------- | ----- |
| ./src/App.vue                                                   | App Component        | No       |       |
| ./src/views/SettingsView.vue                                    | View                 | No       |       |
| ./src/views/StyleGuideView.vue                                  | View                 | No       |       |
| ./src/views/PanelLayoutView.vue                                 | View                 | No       |       |
| ./src/views/LogDisplayView.vue                                  | View                 | No       |       |
| ./src/components/discovery/ManualDiscoveryPrompt.vue            | Component            | No       |       |
| ./src/components/ui/SlideUpLogContainer.vue                     | UI Component         | No       |       |
| ./src/components/ui/DeviceInfo.vue                              | UI Component         | No       |       |
| ./src/components/ui/SettingsPanel.vue                           | UI Component         | No       |       |
| ./src/components/ui/HistogramStretchControl.vue                 | UI Component         | No       |       |
| ./src/components/ui/Icon.vue                                    | UI Component         | No       |       |
| ./src/components/ui/NotificationManager.vue                     | UI Component         | No       |       |
| ./src/components/ui/ToastNotification.vue                       | UI Component         | No       |       |
| ./src/components/ui/NotificationCenter.vue                      | UI Component         | No       |       |
| ./src/components/ui/LogPanel.vue                                | UI Component         | No       |       |
| ./src/components/ui/CollapsibleSection.vue                      | UI Component         | No       |       |
| ./src/components/layout/NavigationBar.vue                       | Layout Component     | No       |       |
| ./src/components/layout/LayoutContainer.vue                     | Layout Component     | No       |       |
| ./src/components/panels/features/CameraImageDisplay.vue         | Panel Feature        | No       |       |
| ./src/components/panels/features/CameraExposureControl.vue      | Panel Feature        | No       |       |
| ./src/components/panels/DeepSkyCatalogPanel.vue                 | Panel                | No       |       |
| ./src/components/panels/CameraControls.vue                      | Panel                | No       |       |
| ./src/components/devices/SimplifiedDomePanel.vue                | Device Panel         | No       |       |
| ./src/components/devices/SimplifiedFocuserPanel.vue             | Device Panel         | No       |       |
| ./src/components/devices/SimplifiedSafetyMonitorPanel.vue       | Device Panel         | No       |       |
| ./src/components/devices/SimplifiedObservingConditionsPanel.vue | Device Panel         | No       |       |
| ./src/components/devices/SimplifiedCameraPanel.vue              | Device Panel         | No       |       |
| ./src/components/devices/SimplifiedTelescopePanel.vue           | Device Panel         | No       |       |
| ./src/components/devices/SimplifiedFilterWheelPanel.vue         | Device Panel         | No       |       |
| ./src/components/devices/SimplifiedSwitchPanel.vue              | Device Panel         | No       |       |
| ./src/components/devices/SimplifiedRotatorPanel.vue             | Device Panel         | No       |       |
| ./src/components/devices/SimplifiedCoverCalibratorPanel.vue     | Device Panel         | No       |       |
| ./src/components/navigation/DiscoveryIndicator.vue              | Navigation Component | No       |       |

---

### .css (CSS Stylesheets)

| File Path                           | Category         | Reviewed | Notes |
| ----------------------------------- | ---------------- | -------- | ----- |
| ./src/assets/base.css               | Base Styles      | No       |       |
| ./src/assets/components/panels.css  | Component Styles | No       |       |
| ./src/assets/components/forms.css   | Component Styles | No       |       |
| ./src/assets/components/buttons.css | Component Styles | No       |       |
| ./src/assets/modern-reset.css       | Reset Styles     | No       |       |
| ./src/assets/main.css               | Main Styles      | No       |       |
| ./src/assets/design-tokens.css      | Design Tokens    | No       |       |

---

### .csv (CSV Data)

| File Path                          | Category     | Reviewed | Notes |
| ---------------------------------- | ------------ | -------- | ----- |
| ./src/assets/catalogs/addendum.csv | Catalog Data | No       |       |
| ./src/assets/catalogs/NGC.csv      | Catalog Data | No       |       |

---

### .msgpack (Binary Data)

| File Path                         | Category     | Reviewed | Notes |
| --------------------------------- | ------------ | -------- | ----- |
| ./src/assets/catalogs/ngc.msgpack | Catalog Data | No       |       |

---

### .cjs (CommonJS Script)

| File Path                                            | Category       | Reviewed | Notes |
| ---------------------------------------------------- | -------------- | -------- | ----- |
| ./src/assets/catalogs/convert-ngc-csv-to-msgpack.cjs | Catalog Script | No       |       |

---

### .md (Markdown)

| File Path             | Category      | Reviewed | Notes |
| --------------------- | ------------- | -------- | ----- |
| ./src/types/README.md | Documentation | No       |       |

---

### .d.ts (TypeScript Declarations)

| File Path                  | Category          | Reviewed | Notes |
| -------------------------- | ----------------- | -------- | ----- |
| ./src/types/lodash-es.d.ts | Type Declarations | No       |       |
| ./src/shims-vue.d.ts       | Type Declarations | No       |       |
