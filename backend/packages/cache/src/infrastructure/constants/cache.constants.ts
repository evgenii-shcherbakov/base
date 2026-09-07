/** Names the subsystem in a log line built by `resolveErrorMessage`. */
export const CACHE_ERROR_FALLBACK = 'Cache operation failed';

/** Redis' own key delimiter, so a cache key reads like the rest of the keyspace. */
export const CACHE_KEY_SEPARATOR = ':';

/** `COUNT` hint of the SCAN loop behind `deleteByPrefix`. */
export const CACHE_SCAN_COUNT = 100;
