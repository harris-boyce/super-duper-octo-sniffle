/**
 * Vitest setup file
 * 
 * This file runs before all tests to configure the test environment.
 * It sets up global test utilities, mocks, and configuration.
 */

import { vi } from 'vitest';

// Mock browser APIs that aren't available in happy-dom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IndexedDB for AI content caching tests
// happy-dom doesn't implement IDBRequest, IDBTransaction, etc.
if (typeof indexedDB === 'undefined' || typeof IDBRequest === 'undefined') {
  // Mock IDBRequest
  class MockIDBRequest extends EventTarget {
    result: any = null;
    error: Error | null = null;
    source: any = null;
    transaction: any = null;
    readyState: 'pending' | 'done' = 'pending';
    onsuccess: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
  }
  global.IDBRequest = MockIDBRequest as any;

  // Mock IDBOpenDBRequest
  class MockIDBOpenDBRequest extends MockIDBRequest {
    onupgradeneeded: ((event: any) => void) | null = null;
    onblocked: ((event: any) => void) | null = null;
  }
  global.IDBOpenDBRequest = MockIDBOpenDBRequest as any;

  // Mock IDBTransaction
  class MockIDBTransaction extends EventTarget {
    db: any = null;
    error: Error | null = null;
    mode: 'readonly' | 'readwrite' | 'versionchange' = 'readonly';
    objectStoreNames: string[] = [];
    onabort: ((event: any) => void) | null = null;
    oncomplete: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    
    objectStore(name: string): any {
      return {
        name,
        get: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        add: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      };
    }
    
    abort(): void {}
  }
  global.IDBTransaction = MockIDBTransaction as any;

  // Mock IDBDatabase
  class MockIDBDatabase extends EventTarget {
    name: string = 'test-db';
    version: number = 1;
    objectStoreNames: string[] = [];
    onabort: ((event: any) => void) | null = null;
    onclose: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    onversionchange: ((event: any) => void) | null = null;
    
    transaction(storeNames: string | string[], mode?: 'readonly' | 'readwrite'): any {
      const tx = new MockIDBTransaction();
      tx.mode = mode || 'readonly';
      return tx;
    }
    
    createObjectStore(name: string, options?: any): any {
      this.objectStoreNames.push(name);
      return {
        name,
        keyPath: options?.keyPath,
        autoIncrement: options?.autoIncrement,
        indexNames: [],
        transaction: new MockIDBTransaction(),
        createIndex: vi.fn(),
        deleteIndex: vi.fn(),
      };
    }
    
    deleteObjectStore(name: string): void {
      const index = this.objectStoreNames.indexOf(name);
      if (index > -1) {
        this.objectStoreNames.splice(index, 1);
      }
    }
    
    close(): void {}
  }
  global.IDBDatabase = MockIDBDatabase as any;

  // Mock indexedDB
  global.indexedDB = {
    open: vi.fn().mockImplementation((name: string, version?: number) => {
      const request = new MockIDBOpenDBRequest();
      setTimeout(() => {
        const db = new MockIDBDatabase();
        db.name = name;
        db.version = version || 1;
        request.result = db;
        request.readyState = 'done';
        if (request.onsuccess) {
          request.onsuccess({ target: request } as any);
        }
      }, 0);
      return request;
    }),
    deleteDatabase: vi.fn().mockImplementation((name: string) => {
      const request = new MockIDBRequest();
      setTimeout(() => {
        request.result = undefined;
        request.readyState = 'done';
        if (request.onsuccess) {
          request.onsuccess({ target: request } as any);
        }
      }, 0);
      return request;
    }),
    databases: vi.fn().mockResolvedValue([]),
    cmp: vi.fn().mockImplementation((a: any, b: any) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    }),
  } as any;
}

// Mock fetch globally (individual tests can override)
global.fetch = vi.fn();

// Setup console mocks to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  // Keep warn and error for debugging
  warn: originalConsole.warn,
  error: originalConsole.error,
};
