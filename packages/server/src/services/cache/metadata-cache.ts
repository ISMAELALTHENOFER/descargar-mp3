import NodeCache from 'node-cache';

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600', 10);

const cache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: 120,
});

export class MetadataCache {
  get<T>(key: string): T | undefined {
    return cache.get<T>(key);
  }

  set<T>(key: string, value: T): void {
    cache.set(key, value);
  }

  has(key: string): boolean {
    return cache.has(key);
  }

  invalidate(key: string): void {
    cache.del(key);
  }

  flush(): void {
    cache.flushAll();
  }
}

export const metadataCache = new MetadataCache();
