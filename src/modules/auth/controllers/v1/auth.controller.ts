import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '../../../user/entities/user.entity';
import { AuthApplication } from '../../applications/auth.application';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { AuthUserResponseDto } from '../../dto/auth-user-response.dto';
import { LoginDto } from '../../dto/login.dto';
import { LoginResponseDto } from '../../dto/login-response.dto';
import { RegisterDto } from '../../dto/register.dto';
import { RegisterResponseDto } from '../../dto/register-response.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authApplication: AuthApplication) {}

  @ApiOperation({ summary: 'Register user baru' })
  @ApiCreatedResponse({
    description: 'User berhasil didaftarkan',
    type: RegisterResponseDto,
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authApplication.register(dto);
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiOkResponse({
    description: 'Login berhasil',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Email atau password salah' })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authApplication.login(dto);
  }

  @ApiOperation({ summary: 'Ambil profil user yang sedang login' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'Data user dari access token',
    type: AuthUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak valid atau kadaluarsa' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.authApplication.me(user);
  }
}
