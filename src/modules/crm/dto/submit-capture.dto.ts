import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SubmitQuizCaptureDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;

  @Transform(trim)
  @IsString()
  @MinLength(8)
  @MaxLength(30)
  whatsapp: string;

  @Transform(trim)
  @IsEmail()
  @MaxLength(160)
  email: string;

  @IsIn(['iphone', 'mac', 'ipad'])
  category: 'iphone' | 'mac' | 'ipad';

  @Transform(trim)
  @IsString()
  @MaxLength(80)
  usage: string;

  @Transform(trim)
  @IsString()
  @MaxLength(80)
  storage: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  screenSize?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(180)
  recomendacao: string;

  @IsOptional()
  @IsString()
  @MaxLength(0)
  website?: string;
}

export class SubmitEconomyCaptureDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;

  @Transform(trim)
  @IsString()
  @MinLength(8)
  @MaxLength(30)
  whatsapp: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  produto: string;

  @IsOptional()
  @IsString()
  @MaxLength(0)
  website?: string;
}
