import * as dotenv from 'dotenv';

dotenv.config();

const runtimeEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';

const toBoolean = (
  value: string | undefined,
  defaultValue = false,
): boolean => {
  if (value === undefined) {
    return defaultValue;
  }
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const shouldEnableSslByDefault = (): boolean => {
  const host = (process.env.DB_HOST || '').toLowerCase();
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);

  if (host && !localHosts.has(host)) {
    return true;
  }

  if (process.env.DATABASE_URL?.includes('render.com')) {
    return true;
  }

  return runtimeEnv === 'production';
};

export const config = {
  app: {
    port: process.env.PORT || process.env.APP_PORT || '3000',
    env: runtimeEnv,
  },
  db: {
    url: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || '',
    sslEnabled: toBoolean(process.env.DB_SSL, shouldEnableSslByDefault()),
    sslRejectUnauthorized: toBoolean(
      process.env.DB_SSL_REJECT_UNAUTHORIZED,
      false,
    ),
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};
