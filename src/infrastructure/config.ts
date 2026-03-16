import * as dotenv from 'dotenv';

dotenv.config();

const toBoolean = (
  value: string | undefined,
  defaultValue = false,
): boolean => {
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
};

export const config = {
  app: {
    port: process.env.APP_PORT || '3000',
    env: process.env.APP_ENV || 'development',
  },
  db: {
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || '',
    sslEnabled: toBoolean(
      process.env.DB_SSL,
      process.env.APP_ENV === 'production',
    ),
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
