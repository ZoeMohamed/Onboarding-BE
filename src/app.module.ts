import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { config } from './infrastructure/config';
import { EventCategoryModule } from './modules/event-category/event-category.module';
import { EventCategory } from './modules/event-category/entities/event-category.entity';
import { User } from './modules/user/entities/user.entity';

const sslConfig = config.db.sslEnabled
  ? {
      rejectUnauthorized: config.db.sslRejectUnauthorized,
    }
  : undefined;

@Module({
  imports: [
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
      entities: [User, EventCategory],
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
