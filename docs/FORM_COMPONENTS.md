# Form Component Usage Guide

This guide demonstrates how to use the standardized form components in the Alpaca Web application. All form elements adhere to our design system and support both light and dark themes.

## Basic Form Elements

### Text Input

```vue
<div class="aw-form-group">
  <label for="username" class="aw-form-label">Username</label>
  <input 
    id="username" 
    v-model="username" 
    type="text" 
    class="aw-input" 
    placeholder="Enter username"
  />
  <span class="aw-form-help">Choose a unique username</span>
</div>
```

### Select Dropdown

```vue
<div class="aw-form-group">
  <label for="device-type" class="aw-form-label">Device Type</label>
  <select 
    id="device-type" 
    v-model="deviceType" 
    class="aw-select"
  >
    <option value="telescope">Telescope</option>
    <option value="camera">Camera</option>
    <option value="focuser">Focuser</option>
  </select>
</div>
```

### Textarea

```vue
<div class="aw-form-group">
  <label for="description" class="aw-form-label">Description</label>
  <textarea
    id="description"
    v-model="description"
    class="aw-textarea"
    placeholder="Enter description"
  ></textarea>
</div>
```

### Checkbox

```vue
<div class="aw-form-group">
  <label class="aw-checkbox-container">
    Enable notifications
    <input
      v-model="enableNotifications"
      type="checkbox"
    />
    <span class="aw-checkbox"></span>
  </label>
</div>
```

### Radio Buttons

```vue
<div class="aw-form-group">
  <label class="aw-form-label">Connection Type</label>
  
  <label class="aw-radio-container">
    Direct
    <input
      v-model="connectionType"
      type="radio"
      value="direct"
    />
    <span class="aw-radio"></span>
  </label>
  
  <label class="aw-radio-container">
    Network
    <input
      v-model="connectionType"
      type="radio"
      value="network"
    />
    <span class="aw-radio"></span>
  </label>
</div>
```

## Variant Examples

### Size Variants

```vue
<!-- Small size -->
<input type="text" class="aw-input aw-input--sm" placeholder="Small input" />

<!-- Default size -->
<input type="text" class="aw-input" placeholder="Default input" />

<!-- Large size -->
<input type="text" class="aw-input aw-input--lg" placeholder="Large input" />
```

### State Variants

```vue
<!-- Error state -->
<div class="aw-form-group">
  <label for="email" class="aw-form-label">Email</label>
  <input 
    id="email" 
    type="email" 
    class="aw-input aw-input--error" 
    value="invalid-email"
  />
  <span class="aw-form-error">Please enter a valid email address</span>
</div>

<!-- Success state -->
<div class="aw-form-group">
  <label for="username" class="aw-form-label">Username</label>
  <input 
    id="username" 
    type="text" 
    class="aw-input aw-input--success" 
    value="valid-username"
  />
  <span class="aw-form-help">Username is available!</span>
</div>

<!-- Disabled state -->
<div class="aw-form-group">
  <label for="api-key" class="aw-form-label">API Key</label>
  <input 
    id="api-key" 
    type="text" 
    class="aw-input" 
    value="API-KEY-12345"
    disabled
  />
</div>
```

## Complete Form Example

```vue
<form @submit.prevent="handleSubmit">
  <div class="aw-form-group">
    <label for="device-name" class="aw-form-label">Device Name</label>
    <input 
      id="device-name" 
      v-model="device.name" 
      type="text" 
      class="aw-input" 
      placeholder="Enter device name"
      required
    />
  </div>
  
  <div class="aw-form-group">
    <label for="device-type" class="aw-form-label">Device Type</label>
    <select 
      id="device-type" 
      v-model="device.type" 
      class="aw-select"
      required
    >
      <option value="" disabled>Select a device type</option>
      <option value="telescope">Telescope</option>
      <option value="camera">Camera</option>
      <option value="focuser">Focuser</option>
    </select>
  </div>
  
  <div class="aw-form-group">
    <label for="device-address" class="aw-form-label">IP Address</label>
    <input 
      id="device-address" 
      v-model="device.address" 
      type="text" 
      class="aw-input" 
      placeholder="e.g. 192.168.1.100"
      required
    />
  </div>
  
  <div class="aw-form-group">
    <label for="device-port" class="aw-form-label">Port</label>
    <input 
      id="device-port" 
      v-model.number="device.port" 
      type="number" 
      class="aw-input" 
      placeholder="e.g. 11111"
      required
    />
  </div>
  
  <div class="aw-form-group">
    <label class="aw-checkbox-container">
      Auto-connect on startup
      <input v-model="device.autoConnect" type="checkbox" />
      <span class="aw-checkbox"></span>
    </label>
  </div>
  
  <div class="aw-form-group">
    <button type="submit" class="aw-button aw-button--primary">Add Device</button>
    <button type="button" class="aw-button aw-button--secondary">Cancel</button>
  </div>
</form>
```

## Dark Theme Support

All form components automatically adapt to the dark theme when the `.dark-theme` class is applied to a parent element (usually the `:root` element). No additional classes are needed to support the dark theme.
