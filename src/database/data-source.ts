import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../infrastructure/config';
import { EventCategory } from '../modules/event-category/entities/event-category.entity';
import { User } from '../modules/user/entities/user.entity';

const sslConfig = config.db.sslEnabled
  ? {
      rejectUnauthorized: config.db.sslRejectUnauthorized,
    }
  : undefined;

const AppDataSource = new DataSource({
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
  entities: [User, EventCategory],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
  ssl: sslConfig,
  extra: sslConfig
    ? {
        ssl: sslConfig,
      }
    : undefined,
});

export default AppDataSource;
