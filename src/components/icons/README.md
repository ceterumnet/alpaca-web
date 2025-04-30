# AlpacaWeb Icon System

This directory contains the standardized icon system for AlpacaWeb. The icons are implemented as Vue components using functional rendering with the `h` function.

## Usage

### Direct icon component import

You can import individual icon components directly:

```vue
<script setup>
import { Camera, Telescope } from '@/components/icons'
</script>

<template>
  <Camera size="24" color="currentColor" />
  <Telescope size="32" color="#4caf50" />
</template>
```

### Using the Icon component

For consistency across the application, use the `Icon` component which wraps these icons and adds standard styling:

```vue
<script setup>
import Icon from '@/components/Icon.vue'
</script>

<template>
  <Icon type="camera" />
  <Icon type="telescope" />
</template>
```

## Available Icons

The following icons are available:

### Device Icons

- `Telescope`
- `Camera`
- `Filter`
- `Focus`
- `Dome`
- `DeviceUnknown`

### UI Icons

- `Search`
- `Lightning`
- `Settings`
- `Sun`
- `Moon`
- `ChevronLeft`
- `ChevronRight`
- `Gear`
- `Exposure`
- `Close`
- `Expand`
- `Collapse`
- `Compact`
- `Detailed`
- `Fullscreen`
- `Connected`
- `Disconnected`
- `ArrowUp`
- `ArrowDown`
- `ArrowLeft`
- `ArrowRight`
- `Stop`
- `TrackingOn`
- `TrackingOff`
- `Home`
- `Files`
- `History`
- `Cloud`

## Props

All icon components accept the following props:

| Prop    | Type   | Default        | Description         |
| ------- | ------ | -------------- | ------------------- |
| `size`  | String | '24'           | Icon size in pixels |
| `color` | String | 'currentColor' | Icon color          |
