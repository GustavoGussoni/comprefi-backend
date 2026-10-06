import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'Admin CompreFi',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'admin@comprefi.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário (mínimo 10 caracteres)',
    example: 'senha-segura',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  password: string;

  @ApiPropertyOptional({
    description: 'Papel de acesso do usuário',
    enum: UserRole,
    default: UserRole.SALES,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

