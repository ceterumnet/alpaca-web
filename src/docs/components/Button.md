# Button Component

Buttons provide the core interactive elements for user actions throughout the Alpaca Web interface. They follow the UI Style Consistency Plan with proper theming support for both light and dark (astronomy) modes.

## Usage

**Using the Vue Component:**

```vue
<template>
  <AppButton variant="primary">Primary Action</AppButton>
  <AppButton variant="secondary">Secondary Action</AppButton>
  <AppButton variant="tertiary">Tertiary Action</AppButton>
  <AppButton variant="danger">Danger Action</AppButton>
  <AppButton variant="success">Success Action</AppButton>
  <AppButton variant="warning">Warning Action</AppButton>
</template>

<script>
import { defineComponent } from 'vue'
import AppButton from '@/components/ui/Button.vue'

export default defineComponent({
  components: {
    AppButton
  }
})
</script>
```

**Using CSS Classes Directly:**

```html
<button class="aw-button aw-button--primary">Primary Button</button>
<button class="aw-button aw-button--secondary">Secondary Button</button>
<button class="aw-button aw-button--tertiary">Tertiary Button</button>
<button class="aw-button aw-button--danger">Danger Button</button>
<button class="aw-button aw-button--success">Success Button</button>
<button class="aw-button aw-button--warning">Warning Button</button>
```

## Button Variants

- **Primary**: Main call-to-action, used for the most important action
- **Secondary**: Alternative actions, less visually prominent
- **Tertiary**: Minimal styling, used for less important actions
- **Danger**: Destructive actions that may lead to data loss
- **Success**: Positive actions or confirmations
- **Warning**: Actions that require caution

## Sizes

Buttons come in three sizes:

```html
<button class="aw-button aw-button--primary aw-button--small">Small</button>
<button class="aw-button aw-button--primary">Default (Medium)</button>
<button class="aw-button aw-button--primary aw-button--large">Large</button>
```

## States

Buttons support various states:

```html
<!-- Disabled -->
<button class="aw-button aw-button--primary" disabled>Disabled</button>

<!-- Loading -->
<button class="aw-button aw-button--primary aw-button--loading">Loading</button>

<!-- Full Width -->
<button class="aw-button aw-button--primary aw-button--full-width">Full Width</button>
```

## With Icons

Buttons can include icons:

```vue
<AppButton variant="primary" icon="camera">With Icon</AppButton>
<AppButton variant="primary" icon="settings"></AppButton>
<!-- Icon only -->
```

Using CSS classes:

```html
<button class="aw-button aw-button--primary aw-button--with-icon">
  <span class="icon">📷</span>
  With Icon
</button>

<button class="aw-button aw-button--primary aw-button--icon-only">
  <span class="icon">⚙️</span>
</button>
```

## Accessibility

- Ensure buttons have meaningful text that describes their action
- Use `aria-label` for icon-only buttons
- Maintain color contrast ratios according to WCAG guidelines
- Use appropriate button types (`type="button"`, `type="submit"`, etc.)

## Dark Theme Support

All button variants automatically adjust to dark theme settings, which use a red-based theme for astronomy to preserve night vision.
