// Jest setup file
import 'jest';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    getURL: jest.fn((path: string) => `chrome-extension://mock-id/${path}`)
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    onUpdated: {
      addListener: jest.fn()
    }
  },
  webRequest: {
    onBeforeRequest: {
      addListener: jest.fn()
    },
    onBeforeSendHeaders: {
      addListener: jest.fn()
    }
  },
  action: {
    setBadgeBackgroundColor: jest.fn(),
    setBadgeText: jest.fn()
  },
  notifications: {
    create: jest.fn()
  }
};

// @ts-expect-error - Setting global chrome mock for testing
global.chrome = mockChrome;

// Mock window.postMessage
Object.defineProperty(window, 'postMessage', {
  value: jest.fn(),
  writable: true
});

// Mock console methods for tests
global.console = {
  ...console,
  // Suppress debug logs in tests
  debug: jest.fn(),
  log: jest.fn()
};
