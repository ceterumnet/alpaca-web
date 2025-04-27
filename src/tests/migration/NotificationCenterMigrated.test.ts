import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NotificationCenterMigrated from '@/components/NotificationCenterMigrated.vue'
import { useNotificationStore } from '@/stores/useNotificationStore'

// Mock ToastNotification component
vi.mock('@/components/ui/ToastNotification.vue', () => ({
  default: {
    name: 'ToastNotification',
    props: {
      message: String,
      type: String,
      duration: Number,
      position: String
    },
    template: `
      <div class="toast-notification" data-testid="toast-notification">
        <div>{{ message }}</div>
        <div>{{ type }}</div>
        <button class="toast-close" @click="$emit('close')">×</button>
      </div>
    `
  }
}))

describe('NotificationCenterMigrated.vue', () => {
  beforeEach(() => {
    // Set up a fresh Pinia instance
    const pinia = createPinia()
    setActivePinia(pinia)

    // Mock global objects
    vi.stubGlobal(
      'setInterval',
      vi.fn(() => 1)
    )
    vi.stubGlobal('clearInterval', vi.fn())

    // Create a fake DOM element for Teleport
    const el = document.createElement('div')
    el.id = 'teleport-target'
    document.body.appendChild(el)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('renders notifications from the store', async () => {
    // Prepare the notification store with some notifications
    const store = useNotificationStore()

    // Add mock notifications
    store.showSuccess('Test success notification')
    store.showError('Test error notification')

    // Mount component
    mount(NotificationCenterMigrated)
    await flushPromises()

    // Find teleported content in the document body
    const notifications = document.querySelectorAll('[data-testid="toast-notification"]')

    // Should have two notifications
    expect(notifications.length).toBe(2)

    // Content should match our notifications
    expect(document.body.textContent).toContain('Test success notification')
    expect(document.body.textContent).toContain('Test error notification')
  })

  it('dismisses notifications when close is clicked', async () => {
    // Prepare the notification store with some notifications
    const store = useNotificationStore()
    const spy = vi.spyOn(store, 'dismissNotification')

    // Add mock notification
    store.showInfo('Test dismissable notification')

    // Mount component
    mount(NotificationCenterMigrated)
    await flushPromises()

    // Find close button and click it
    const closeButton = document.querySelector('.toast-close')
    expect(closeButton).not.toBeNull()
    closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    // Should have called dismissNotification in the store
    expect(spy).toHaveBeenCalled()
  })

  it('shows hidden notification count when there are more notifications than maxDisplayedNotifications', async () => {
    // Prepare the notification store with more notifications than allowed to display
    const store = useNotificationStore()

    // Add many notifications (more than maxDisplayedNotifications)
    for (let i = 0; i < 10; i++) {
      store.showInfo(`Notification ${i}`)
    }

    // Mount component (without using the returned wrapper)
    mount(NotificationCenterMigrated, {
      data() {
        return {
          maxDisplayedNotifications: 5
        }
      }
    })
    await flushPromises()

    // Find hidden notification count indicator
    const hiddenCountEl = document.querySelector('.hidden-notification-count')

    // Should show how many are hidden
    expect(hiddenCountEl).not.toBeNull()
    expect(hiddenCountEl?.textContent).toContain('5 more notifications')
  })

  it('handles keyboard navigation for accessibility', async () => {
    // Prepare the notification store with a notification
    const store = useNotificationStore()
    const spy = vi.spyOn(store, 'dismissNotification')

    // Add mock notification
    const notificationId = store.showInfo('Test keyboard accessibility')

    // Mount component
    mount(NotificationCenterMigrated)
    await flushPromises()

    // Find notification and dispatch keyboard events
    const notification = document.querySelector('[data-testid="toast-notification"]')
    expect(notification).not.toBeNull()

    // Enter key should dismiss
    notification?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true
      })
    )

    // Should have called dismissNotification in the store
    expect(spy).toHaveBeenCalledWith(notificationId)
  })

  it('cleans up on unmount', async () => {
    // Mock the global clearInterval
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

    // Mount component
    const wrapper = mount(NotificationCenterMigrated)

    // Unmount to trigger cleanup
    wrapper.unmount()

    // Should have called clearInterval
    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
