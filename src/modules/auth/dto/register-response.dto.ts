import { ApiProperty } from '@nestjs/swagger';
import { AuthUserResponseDto } from './auth-user-response.dto';

export class RegisterResponseDto extends AuthUserResponseDto {
  @ApiProperty({
    example: '2026-03-16T03:19:43.983Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-03-16T03:19:43.983Z',
  })
  updatedAt: Date;
}
