import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RegisterSchema = z.object({
  email: z
    .string()
    .email('Format email tidak valid')
    .max(255, 'Email maksimal 255 karakter'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(32, 'Password maksimal 32 karakter'),
  name: z
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter'),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
