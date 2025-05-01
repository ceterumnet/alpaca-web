# UI Style Consistency Plan

## 1. Current State Assessment

### Issues Identified:

1. CSS variables from `colors.css` are inconsistently used across components
2. Multiple styling approaches and naming conventions
3. Some components use hardcoded color values instead of CSS variables
4. Inconsistent button and control styling
5. Dark theme implementation is inconsistent

### Existing Structure:

- `src/assets/colors.css`: Defines CSS variables for theming
- `src/assets/base.css`: Basic styling
- `src/assets/modern-reset.css`: CSS reset
- Component-level scoped CSS with inconsistent variable usage

## 2. Implementation Plan

### Phase 1: Audit & Documentation

1. Complete a full audit of all component styles
2. Document all color usage and UI patterns
3. Create a comprehensive list of needed design tokens

### Phase 2: Design System Creation

1. Create a centralized design token system

   ```css
   /* Design tokens with clear naming conventions */
   :root {
     /* Base colors */
     --aw-color-primary: #4a7adc;
     --aw-color-primary-light: #789fea;
     --aw-color-primary-dark: #3a5fbc;

     /* Semantic colors */
     --aw-color-success: #4caf50;
     --aw-color-warning: #ff9800;
     --aw-color-error: #f44336;

     /* Neutral colors */
     --aw-color-background: #f5f7fa;
     --aw-color-surface: #ffffff;
     --aw-color-border: #e0e6ef;

     /* Typography */
     --aw-color-text-primary: #212121;
     --aw-color-text-secondary: #5a6270;

     /* Component-specific tokens */
     --aw-panel-background: var(--aw-color-surface);
     --aw-panel-header-background: var(--aw-color-primary);
     --aw-panel-header-text: #ffffff;

     /* Spacing tokens */
     --aw-spacing-xs: 4px;
     --aw-spacing-sm: 8px;
     --aw-spacing-md: 16px;
     --aw-spacing-lg: 24px;
     --aw-spacing-xl: 32px;
   }
   ```

2. Create component-specific tokens that reference base tokens
3. Implement proper dark theme using the same token structure

### Phase 3: Component Library Alignment

1. Update existing UI components to use the new design token system:

   - ✅ Button.vue
   - ✅ Icon.vue
   - ✅ EnhancedPanelComponent.vue
   - ✅ ToastNotification.vue
   - ✅ ButtonGroup.vue
   - ✅ NotificationCenter.vue
   - ✅ NotificationManager.vue
   - ✅ SettingsPanel.vue
   - ✅ SettingsView.vue (related view)
   - ✅ NavigationState.vue
   - ✅ BreadcrumbNav.vue
   - ✅ DiscoveryIndicator.vue
   - ✅ NavigationBar.vue
   - ✅ EnhancedSidebar.vue
   - ✅ LayoutContainer.vue
   - ✅ MainPanels.vue
   - ✅ AppSidebar.vue
   - ✅ CustomLayoutBuilder.vue
   - ✅ CameraControls.vue
   - ✅ CameraExposureControl.vue
   - ✅ ImageAnalysis.vue
   - ✅ ResponsiveTelescopePanel.vue
   - ✅ ResponsiveFocuserPanel.vue
   - ✅ DeviceDetailView.vue
   - ✅ DevicePalette.vue

2. For each component:

   - Replace hardcoded values with design tokens
   - Ensure consistent naming of CSS classes
   - Update style props to follow the new naming convention
   - Verify dark theme compatibility

3. Document the updated components with usage examples ✅

4. Create a simple style guide page within the app that showcases all components with their variants ✅

### Phase 4: Migration Strategy

1. Prioritize components for migration:

   - Start with most visible/core components
   - Move to less visible components

2. For each component:

   - Update to use design tokens
   - Follow consistent naming conventions
   - Refactor CSS to use the component library

3. Create automated tests to verify consistent style application

## 3. Implementation Guidelines

### CSS Variables Naming Convention

```
--aw-[category]-[property]-[variant]
```

Examples:

- `--aw-color-primary`
- `--aw-color-primary-dark`
- `--aw-component-button-primary-bg`

### Component Structure

```vue
<style scoped>
.component {
  /* Use CSS variables from design system */
  background-color: var(--aw-color-surface);
  color: var(--aw-color-text-primary);
  padding: var(--aw-spacing-md);
}

.component__element {
  border: 1px solid var(--aw-color-border);
}

.component--variant {
  background-color: var(--aw-color-primary-light);
}
</style>
```

### Documentation Standards

Every component should include:

- Usage examples
- Available props
- Styling variables
- Accessibility considerations

## 4. Tools & Resources

1. Style Linter: Add stylelint with custom rules to enforce conventions
2. Component Preview: Create a component showcase to visualize all UI elements
3. Theme Switcher: Add a global theme toggle for testing different themes
4. CSS Utility Classes: Consider adding utility classes for common patterns

## 5. Success Metrics

1. 100% of components using design tokens (no hardcoded values)
2. Consistent dark/light theme support across all components
3. Reduced CSS duplication
4. Improved developer experience via documentation
5. Visual consistency across the application

## 6. Example Migration Path

Below is an example of migrating a Button component from current implementation to using the new design system:

### Before:

```css
.app-button--primary {
  background-color: var(--color-primary);
  color: white;
}

.app-button--primary:hover:not(.app-button--disabled) {
  background-color: var(--color-primary-dark);
}

.app-button--secondary {
  background-color: var(--color-background);
  border-color: var(--color-border);
  color: var(--color-text);
}
```

### After:

```css
.aw-button--primary {
  background-color: var(--aw-color-primary);
  color: var(--aw-color-text-on-primary);
}

.aw-button--primary:hover:not(.aw-button--disabled) {
  background-color: var(--aw-color-primary-dark);
}

.aw-button--secondary {
  background-color: var(--aw-color-surface);
  border-color: var(--aw-color-border);
  color: var(--aw-color-text-primary);
}
```

This approach ensures consistent naming, variable usage, and makes the relationship between components and design tokens clear.
