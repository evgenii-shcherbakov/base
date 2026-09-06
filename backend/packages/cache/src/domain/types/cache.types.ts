/** Which adapter backs the store. `memory` is process-local — dev and tests only. */
export type CacheDriver = 'redis' | 'memory';

export type CacheServiceOptions = {
  /** First key segment, shared by every process (`CACHE_KEY_PREFIX`). */
  keyPrefix: string;
  /** Second key segment, usually the service name. Scopes add further segments. */
  namespace?: string;
  /** Seconds. `0` (or a missing value) stores without an expiry. */
  defaultTtl?: number;
};
