/**
 * Bounded LRU cache that persists to localStorage. Oldest entries are evicted
 * when the cache exceeds maxEntries. Use for translation cache and similar
 * use cases where unbounded growth is a problem but disk persistence is useful.
 */
export class LruStorageCache {
  private indexKey: string;
  private entryPrefix: string;
  private maxEntries: number;
  private warnedOnFailure = false;

  /**
   * @param namespace - Used to scope the cache; keys become `${namespace}:index` and `${namespace}:entry:${key}`.
   * @param maxEntries - Evict oldest when the count exceeds this. Default 1000.
   */
  constructor(namespace: string, maxEntries: number = 1000) {
    this.indexKey = `${namespace}:index`;
    this.entryPrefix = `${namespace}:entry:`;
    this.maxEntries = maxEntries;
  }

  private readIndex(): string[] {
    try {
      const raw = localStorage.getItem(this.indexKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeIndex(keys: string[]): void {
    try {
      localStorage.setItem(this.indexKey, JSON.stringify(keys));
    } catch (e) {
      this.warnOnce(e);
    }
  }

  private warnOnce(e: unknown): void {
    if (!this.warnedOnFailure) {
      console.warn('[LruStorageCache] localStorage write failed (likely quota exceeded). Falling back to memory-only for this session.', e);
      this.warnedOnFailure = true;
    }
  }

  get(key: string): string | null {
    try {
      const value = localStorage.getItem(this.entryPrefix + key);
      if (value === null) return null;
      // Promote to most-recent on access
      const index = this.readIndex();
      const filtered = index.filter(k => k !== key);
      filtered.push(key);
      this.writeIndex(filtered);
      return value;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      let index = this.readIndex();
      
      // Remove existing position if present
      index = index.filter(k => k !== key);
      index.push(key);
      
      // Evict oldest if over limit
      while (index.length > this.maxEntries) {
        const evictKey = index.shift();
        if (evictKey) {
          try { localStorage.removeItem(this.entryPrefix + evictKey); } catch {}
        }
      }
      
      localStorage.setItem(this.entryPrefix + key, value);
      this.writeIndex(index);
    } catch (e) {
      this.warnOnce(e);
    }
  }

  /**
   * Clear all entries in this cache namespace. Useful for testing or admin reset.
   */
  clear(): void {
    try {
      const index = this.readIndex();
      for (const key of index) {
        try { localStorage.removeItem(this.entryPrefix + key); } catch {}
      }
      localStorage.removeItem(this.indexKey);
    } catch {}
  }
}
