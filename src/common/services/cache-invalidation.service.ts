import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_NAMESPACE } from '../constants/cache.constant';
import { config } from '../../infrastructure/config';

type RedisLikeStore = {
  keys: (pattern?: string) => Promise<string[]>;
  mdel?: (...keys: string[]) => Promise<void>;
  del?: (key: string) => Promise<void>;
};

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async invalidateByPrefixes(prefixes: string[]): Promise<void> {
    const store = this.resolveRedisLikeStore();

    if (!store) {
      this.logger.warn(
        'Redis-like cache store tidak ditemukan, invalidate prefix dilewati',
      );

      if (!config.redis.url && typeof this.cacheManager.clear === 'function') {
        await this.cacheManager.clear();
      }

      return;
    }

    for (const prefix of prefixes) {
      const pattern = `${CACHE_NAMESPACE}:${prefix}*`;
      const keys = await store.keys(pattern);

      if (keys.length === 0) {
        continue;
      }

      if (typeof store.mdel === 'function') {
        await store.mdel(...keys);
        continue;
      }

      if (typeof store.del === 'function') {
        await Promise.all(keys.map((key) => store.del!(key)));
      }
    }
  }

  private resolveRedisLikeStore(): RedisLikeStore | null {
    const stores = (this.cacheManager as { stores?: unknown[] }).stores;

    if (!Array.isArray(stores) || stores.length === 0) {
      return null;
    }

    const keyvStore = stores[0] as {
      opts?: {
        store?: {
          _cache?: RedisLikeStore;
        };
      };
    };

    const redisLikeStore = keyvStore.opts?.store?._cache;

    if (
      !redisLikeStore ||
      typeof redisLikeStore.keys !== 'function'
    ) {
      return null;
    }

    return redisLikeStore;
  }
}
