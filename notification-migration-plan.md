# NotificationCenter Migration Plan

## Overview

The NotificationCenterMigrated component will be a centralized notification service that provides a consistent way to display toast notifications throughout the application. Currently, toast notifications are being handled individually in each view (like DiscoveryView), which leads to code duplication and inconsistent notification behavior.

## Existing System Analysis

Currently, the application:

- Uses a `ToastNotification.vue` component for displaying individual notifications
- Manages toast collections and state in each view that needs notifications
- Has no centralized notification management or history
- Uses direct event handling in components rather than a notification service

## Component Requirements

The NotificationCenterMigrated component will:

1. **Centralized Notification Management**

   - Provide a global notification service accessible from any component
   - Maintain notification history with configurable retention policy
   - Support different notification types (success, error, info, warning)
   - Handle notification queuing and display

2. **UnifiedStore Integration**

   - Subscribe to relevant UnifiedStore events to automatically generate notifications
   - Store notification state in the UnifiedStore for persistence
   - Listen for system events (device connection, discovery, errors)

3. **Responsive Design**

   - Display notifications appropriately on different screen sizes
   - Support configurable notification positioning
   - Handle stacked notifications without overwhelming the UI

4. **Accessibility Features**
   - Ensure notifications are screen reader-friendly
   - Support keyboard navigation for dismissing notifications
   - Provide accessible color schemes for all notification types

## Implementation Approach

### 1. Create a Notification Store

First, we'll create a dedicated notification store using Pinia:

```typescript
// useNotificationStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  timestamp: number
  duration?: number
  read: boolean
  autoDismiss: boolean
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const maxHistory = ref(50)

  // Methods for adding, removing, and managing notifications
})
```

### 2. Create the NotificationCenterMigrated Component

```typescript
// NotificationCenterMigrated.vue
// Will handle displaying notifications from the store
// Will use existing ToastNotification component internally
```

### 3. Create NotificationService

```typescript
// services/NotificationService.ts
// Provides methods for showing different notification types
// Integrates with UnifiedStore for event subscription
```

## UnifiedStore Integration

The notification system will subscribe to these UnifiedStore events:

- `deviceAdded`: Show success notification
- `deviceRemoved`: Show info notification
- `deviceConnected`: Show success notification
- `deviceDisconnected`: Show info notification
- `error`: Show error notification
- `discoveryStarted`: Show info notification
- `discoveryCompleted`: Show info notification

## Component API

The NotificationCenterMigrated component will expose these methods through the notification service:

```typescript
// Add notification
showNotification(message: string, options?: NotificationOptions): string

// Notification type helpers
showSuccess(message: string, options?: NotificationOptions): string
showError(message: string, options?: NotificationOptions): string
showInfo(message: string, options?: NotificationOptions): string
showWarning(message: string, options?: NotificationOptions): string

// Management methods
dismissNotification(id: string): void
dismissAllNotifications(): void
clearHistory(): void
```

## Testing Strategy

1. **Unit Tests**:

   - Test notification store state management
   - Test notification component rendering
   - Test event subscription and handling

2. **Integration Tests**:

   - Test with UnifiedStore events
   - Test notification lifecycle

3. **UI Tests**:
   - Test responsive behavior
   - Test notification stacking
   - Test different notification types

## Migration Steps

1. Create notification store
2. Build NotificationCenterMigrated component
3. Create NotificationService
4. Update App.vue to include NotificationCenterMigrated
5. Replace direct ToastNotification usage with NotificationService calls
6. Update tests and documentation

## Expected Completion Time

- 1-2 days for implementation
- Documentation and testing: 0.5 day
