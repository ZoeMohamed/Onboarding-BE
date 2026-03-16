import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User } from '../../../user/entities/user.entity';
import { AuthApplication } from '../../applications/auth.application';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { LoginDto } from '../../dto/login.dto';
import { RegisterDto } from '../../dto/register.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authApplication: AuthApplication) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authApplication.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authApplication.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.authApplication.me(user);
  }
}
