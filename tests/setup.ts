import { vi } from 'vitest'

vi.mock('@/stores/useLogStore', () => ({
  useLogStore: vi.fn(() => ({
    addLogEntry: vi.fn() // Mock the addLogEntry function
    // Add any other store properties or methods that might be accessed by the logger hook or other code during tests
  }))
}))
