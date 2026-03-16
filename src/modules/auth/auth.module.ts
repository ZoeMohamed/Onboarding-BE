import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { type StringValue } from 'ms';
import { config } from '../../infrastructure/config';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/services/user.repository';
import { AuthApplication } from './applications/auth.application';
import { AuthController } from './controllers/v1/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({
      secret: config.jwt.secret,
      signOptions: { expiresIn: config.jwt.expiresIn as StringValue },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthApplication, AuthService, JwtStrategy, UserRepository],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
