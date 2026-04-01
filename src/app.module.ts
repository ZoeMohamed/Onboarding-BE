import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { CacheManagerStore } from 'cache-manager';
import { KeyvAdapter } from 'cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import type { RedisOptions } from 'ioredis';
import { Keyv } from 'keyv';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  CACHE_NAMESPACE,
  CACHE_TTL_FALLBACK_SECONDS,
  CACHE_TTL_MS_MULTIPLIER,
} from './common/constants/cache.constant';
import { config } from './infrastructure/config';
import { AuthModule } from './modules/auth/auth.module';
import { EventCategoryModule } from './modules/event-category/event-category.module';
import { EventCategory } from './modules/event-category/entities/event-category.entity';
import { EventModule } from './modules/event/event.module';
import { Event } from './modules/event/entities/event.entity';
import { User } from './modules/user/entities/user.entity';

const sslConfig = config.db.sslEnabled
  ? {
      rejectUnauthorized: config.db.sslRejectUnauthorized,
    }
  : undefined;

const resolveRedisTtlSeconds = (): number => {
  const parsedTtl = Number(config.redis.ttl);

  if (!Number.isFinite(parsedTtl) || parsedTtl <= 0) {
    return CACHE_TTL_FALLBACK_SECONDS;
  }

  return parsedTtl;
};

const parseRedisUrl = (redisUrl: string): RedisOptions => {
  const parsedUrl = new URL(redisUrl);
  const isSecure = parsedUrl.protocol === 'rediss:';

  return {
    host: parsedUrl.hostname,
    port: parseInt(parsedUrl.port || '6379', 10),
    username: parsedUrl.username
      ? decodeURIComponent(parsedUrl.username)
      : undefined,
    password: parsedUrl.password
      ? decodeURIComponent(parsedUrl.password)
      : undefined,
    tls: isSecure ? {} : undefined,
  };
};

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const ttlMilliseconds =
          resolveRedisTtlSeconds() * CACHE_TTL_MS_MULTIPLIER;

        if (!config.redis.url) {
          return {
            stores: [new Keyv({ namespace: CACHE_NAMESPACE })],
            ttl: ttlMilliseconds,
          };
        }

        const store = await redisStore({
          ...parseRedisUrl(config.redis.url),
          ttl: ttlMilliseconds,
        });

        return {
          stores: [
            new Keyv({
              namespace: CACHE_NAMESPACE,
              store: new KeyvAdapter(store as unknown as CacheManagerStore),
            }),
          ],
          ttl: ttlMilliseconds,
        };
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(config.db.url
        ? {
            url: config.db.url,
          }
        : {
            host: config.db.host,
            port: config.db.port,
            username: config.db.username,
            password: config.db.password,
            database: config.db.name,
          }),
      entities: [User, EventCategory, Event],
      synchronize: config.db.synchronize,
      ssl: sslConfig,
      extra: sslConfig
        ? {
            ssl: sslConfig,
          }
        : undefined,
    }),
    AuthModule,
    EventCategoryModule,
    EventModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
