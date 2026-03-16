import { ApiProperty } from '@nestjs/swagger';
import { AuthUserResponseDto } from './auth-user-response.dto';

export class LoginResponseDto {
  @ApiProperty({
    type: AuthUserResponseDto,
  })
  user: AuthUserResponseDto;

  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDA2MDQ4MDB9.signature',
  })
  accessToken: string;
}
