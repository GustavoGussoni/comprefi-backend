import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class SubmitTradeContactDto {
  @ApiProperty({ example: 'Gustavo Gussoni' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  nome: string;

  @ApiProperty({ example: 'contato@exemplo.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({ example: '(34) 99999-9999' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, {
    message: 'whatsapp deve conter DDD e número válido',
  })
  whatsapp: string;

  @ApiProperty({ example: '38400-000' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'cep deve conter oito dígitos',
  })
  cep: string;

  @ApiProperty({
    description: 'Origem fixa do formulário para o DataCrazy',
    example: 'funil-troca',
    default: 'funil-troca',
    required: false,
  })
  @IsString()
  @MaxLength(80)
  fonte = 'funil-troca';
}
