import { describe, test, expect, beforeEach } from 'vitest';
import { LruStorageCache } from './lruCache';

// Simple in-memory localStorage mock
const storage: Record<string, string> = {};
beforeEach(() => {
  Object.keys(storage).forEach(k => delete storage[k]);
  (global as any).localStorage = {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => { storage[k] = v; },
    removeItem: (k: string) => { delete storage[k]; },
    get length() { return Object.keys(storage).length; },
    key: (i: number) => Object.keys(storage)[i] ?? null,
  };
});

describe('LruStorageCache', () => {
  test('set and get basic value', () => {
    const cache = new LruStorageCache('test', 10);
    cache.set('k1', 'v1');
    expect(cache.get('k1')).toBe('v1');
  });

  test('returns null for missing key', () => {
    const cache = new LruStorageCache('test', 10);
    expect(cache.get('nope')).toBe(null);
  });

  test('evicts oldest when over maxEntries', () => {
    const cache = new LruStorageCache('test', 3);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set('k3', 'v3');
    cache.set('k4', 'v4');  // evicts k1
    
    expect(cache.get('k1')).toBe(null);
    expect(cache.get('k2')).toBe('v2');
    expect(cache.get('k3')).toBe('v3');
    expect(cache.get('k4')).toBe('v4');
  });

  test('accessed keys are promoted to most-recent', () => {
    const cache = new LruStorageCache('test', 3);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set('k3', 'v3');
    cache.get('k1');  // promotes k1
    cache.set('k4', 'v4');  // evicts k2 (now oldest), not k1
    
    expect(cache.get('k1')).toBe('v1');
    expect(cache.get('k2')).toBe(null);
  });

  test('updating existing key does not grow the cache', () => {
    const cache = new LruStorageCache('test', 3);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set('k3', 'v3');
    cache.set('k1', 'v1-updated');  // update, should not evict
    
    expect(cache.get('k1')).toBe('v1-updated');
    expect(cache.get('k2')).toBe('v2');
    expect(cache.get('k3')).toBe('v3');
  });

  test('clear removes all entries', () => {
    const cache = new LruStorageCache('test', 10);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.clear();
    expect(cache.get('k1')).toBe(null);
    expect(cache.get('k2')).toBe(null);
  });
});
