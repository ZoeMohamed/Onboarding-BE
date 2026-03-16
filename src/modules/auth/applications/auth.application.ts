import { Injectable } from '@nestjs/common';
import { User } from '../../user/entities/user.entity';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthApplication {
  constructor(private readonly authService: AuthService) {}

  register(dto: RegisterDto) {
    return this.authService.register(dto);
  }

  login(dto: LoginDto) {
    return this.authService.login(dto);
  }

  me(user: User) {
    return user;
  }
}
