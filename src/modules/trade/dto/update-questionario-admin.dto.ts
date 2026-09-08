import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateQuestionarioAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  concluido?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  precisaCotacao?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorAparelho?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorFinal?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorComDesconto?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  offerExpiresAt?: Date;
}
