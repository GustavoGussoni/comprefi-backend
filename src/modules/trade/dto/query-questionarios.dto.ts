import { ApiPropertyOptional } from '@nestjs/swagger';
import { CrmDeliveryStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryQuestionariosDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Nome, email, telefone, modelo ou ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CrmDeliveryStatus })
  @IsOptional()
  @IsEnum(CrmDeliveryStatus)
  crmStatus?: CrmDeliveryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  concluido?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  precisaCotacao?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modeloAtual?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modeloDesejado?: string;
}
