import { CacheStore } from '../../domain';
import { CacheSerializer } from '../serializers';

type MemoryCacheEntry = {
  raw: string;
  /** Epoch ms, or `null` for an entry without an expiry. */
  expiresAt: number | null;
};

/**
 * Process-local adapter: dev without a broker, and the specs of everything built on top of
 * `CacheStore`. Shares nothing between replicas and survives no restart — `CACHE_DRIVER=memory`
 * is not a deployment option.
 *
 * Expiry is lazy (checked on read) rather than timer-driven, unlike `MemoryCache` in
 * `@backend/common`: a `setTimeout` per key keeps jest from exiting and buys nothing here.
 * The trade-off is that a key nobody reads again holds its memory until `clear`/`deleteByPrefix`.
 */
export class MemoryCacheStore extends CacheStore {
  private readonly serializer = new CacheSerializer();
  private readonly store = new Map<string, MemoryCacheEntry>();

  get<Value>(key: string): Promise<Value | null> {
    const entry = this.read(key);

    return Promise.resolve(entry ? this.serializer.deserialize<Value>(entry.raw) : null);
  }

  set<Value>(key: string, value: Value, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      raw: this.serializer.serialize(value),
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });

    return Promise.resolve();
  }

  has(key: string): Promise<boolean> {
    return Promise.resolve(Boolean(this.read(key)));
  }

  delete(...keys: string[]): Promise<number> {
    const deleted = keys.filter((key) => this.store.delete(key)).length;

    return Promise.resolve(deleted);
  }

  deleteByPrefix(prefix: string): Promise<number> {
    const matched = Array.from(this.store.keys()).filter((key) => key.startsWith(prefix));

    return this.delete(...matched);
  }

  private read(key: string): MemoryCacheEntry | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);

      return undefined;
    }

    return entry;
  }
}
