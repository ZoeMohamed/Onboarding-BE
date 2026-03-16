import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';

export class AuthUserResponseDto {
  @ApiProperty({
    example: '59173380-63dd-4e9b-a5a5-ec4c083798e9',
  })
  id: string;

  @ApiProperty({
    example: 'user@test.com',
  })
  email: string;

  @ApiProperty({
    example: 'Seed User',
  })
  name: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    example: true,
  })
  isActive: boolean;
}
