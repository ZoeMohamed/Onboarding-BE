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
    baseUrl: process.env.APP_BASE_URL || '',
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
    synchronize: toBoolean(process.env.DB_SYNCHRONIZE, false),
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  redis: {
    url: process.env.REDIS_URL || '',
    ttl: parseInt(process.env.REDIS_TTL || '300', 10),
  },
  xendit: {
    secretKey: process.env.XENDIT_SECRET_KEY || '',
    webhookToken:
      process.env.XENDIT_WEBHOOK_TOKEN ||
      (runtimeEnv === 'test' ? 'xendit-test-webhook-token' : ''),
    apiBaseUrl: process.env.XENDIT_API_BASE_URL || 'https://api.xendit.co',
    successRedirectUrl: process.env.XENDIT_SUCCESS_REDIRECT_URL || '',
    failureRedirectUrl: process.env.XENDIT_FAILURE_REDIRECT_URL || '',
    invoiceDurationSeconds: parseInt(
      process.env.XENDIT_INVOICE_DURATION_SECONDS || '86400',
      10,
    ),
  },
  mail: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: toBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
    enabled: toBoolean(
      process.env.SMTP_ENABLED,
      Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
    ),
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'cloudinary',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      folder: process.env.CLOUDINARY_FOLDER || 'ticket-assets',
      enabled: toBoolean(
        process.env.CLOUDINARY_ENABLED,
        Boolean(
          process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET,
        ),
      ),
    },
  },
};
