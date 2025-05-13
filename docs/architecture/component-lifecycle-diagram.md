# Component Lifecycle in Registry Pattern

## Diagram of Component Lifecycle

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           Application Startup                              │
└───────────────────────────────────────────────────┬───────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     DeviceComponentRegistry Initialization                 │
└───────────────────────────────────────────────────┬───────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        Device Discovery/Connection                         │
└───────────────────────────────────────────────────┬───────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐                                                       │
│  │ For each device │                                                       │
│  └────────┬────────┘                                                       │
│           │         ┌─────────────────────────┐                            │
│           └────────►│ registerDevice(id, type) │                           │
│                     └────────────┬─────────────┘                           │
│                                  │                                          │
│                     ┌────────────┴─────────────┐                           │
│                     │ Create Component Instance │                           │
│                     └────────────┬─────────────┘                           │
│                                  │                                          │
│                                  ▼                                          │
│                     ┌─────────────────────────┐                            │
│                     │ Store in Registry       │                            │
│                     └─────────────────────────┘                            │
│                                                                             │
│                         Device Registration Phase                           │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           PanelLayoutView Mount                            │
└───────────────────────────────────────────────────┬───────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         Layout Selection/Change                            │
└───────────────────────────────────────────────────┬───────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────┐                                                     │
│  │ For each cell/panel│                                                     │
│  └─────────┬─────────┘                                                     │
│            │        ┌─────────────────────────┐                            │
│            └───────►│ assignDeviceToCell(...)  │                           │
│                     └────────────┬─────────────┘                           │
│                                  │                                          │
│                     ┌────────────┴─────────────┐                           │
│                     │   Get from Registry      │                           │
│                     └────────────┬─────────────┘                           │
│                                  │                                          │
│                                  ▼                                          │
│                     ┌─────────────────────────┐                            │
│                     │ Update Cell Assignment  │                            │
│                     └────────────┬─────────────┘                           │
│                                  │                                          │
│                                  ▼                                          │
│                     ┌─────────────────────────┐                            │
│                     │Set Component Visibility │                            │
│                     └─────────────────────────┘                            │
│                                                                             │
│                          Layout Rendering Phase                             │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          Component Rendering                               │
│                                                                             │
│  ┌─────────────────────────┐      ┌─────────────────────────┐             │
│  │     <KeepAlive>         │      │                         │             │
│  │  ┌─────────────────┐    │      │     Component State     │             │
│  │  │   Component     │    │      │     Preserved When      │             │
│  │  │   (v-if based   │◄───┼──────┤     Hidden but Not      │             │
│  │  │   on visibility)│    │      │     Destroyed           │             │
│  │  └─────────────────┘    │      │                         │             │
│  │     </KeepAlive>        │      └─────────────────────────┘             │
│  └─────────────────────────┘                                               │
│                           Component Lifecycle                              │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         User Layout Changes                                │
│                                                                             │
│  ┌─────────────────────────┐      ┌─────────────────────────┐             │
│  │  Layout A → Layout B    │      │ Components stay in      │             │
│  │                         │      │ registry but visibility │             │
│  │  - Different cells      │─────►│ changes                 │             │
│  │  - Different layouts    │      │                         │             │
│  │                         │      │ No component destruction│             │
│  └─────────────────────────┘      └─────────────────────────┘             │
│                                                                             │
│                            State Preservation                               │
└───────────────────────────────────────────────────────────────────────────┘
```

## Component Lifecycle Phases

1. **Initialization**

   - DeviceComponentRegistry is created as a singleton
   - Empty registry is initialized
   - Component types are mapped to component definitions

2. **Registration**

   - Devices are discovered or manually added
   - Each device is registered with the registry
   - Component instances are created but not mounted to DOM
   - Components are stored with unique keys (`${type}-${id}`)

3. **Layout Assignment**

   - Layout is loaded (initial or changed)
   - Cell-to-device assignments are processed
   - Registry tracks which component should be visible in which cell
   - Component visibility flags are updated

4. **Rendering**

   - LayoutContainer creates the grid structure
   - For each cell, the associated component is rendered if visible
   - `<keep-alive>` maintains component state when not visible
   - Component props are updated with correct device ID

5. **State Preservation During Layout Changes**

   - User switches layouts
   - Cell assignments change
   - Component visibility flags update
   - Components may change cells or become hidden
   - Internal state is preserved due to component instance reuse

6. **Cleanup**
   - When devices are removed, components can be unregistered
   - Registry performs cleanup to prevent memory leaks

This lifecycle ensures components maintain their state across layout changes, providing a seamless user experience while optimizing performance by avoiding unnecessary component recreations.
