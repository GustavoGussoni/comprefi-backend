import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CalculatePricesDto {
  @ApiProperty({
    description: "Custo base do produto",
    example: 4500.0,
  })
  @IsNumber()
  @IsNotEmpty()
  cost: number;

  @ApiPropertyOptional({
    description: "Categoria do produto para cálculo de frete específico",
    example: "Macbooks",
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: "Valor do frete",
    example: 100.0,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  freight?: number;

  @ApiPropertyOptional({
    description: "Configuração de preços a ser utilizada",
    example: "default",
    default: "default",
  })
  @IsOptional()
  @IsString()
  priceConfigName?: string;
}

export class CalculatedPricesResponseDto {
  @ApiProperty({
    description: "Preço à vista no PIX calculado",
    example: "R$ 5.111,11",
  })
  pixPrice: string;

  @ApiProperty({
    description: "Preço parcelado calculado",
    example: "R$ 492,59",
  })
  installmentPrice: string;

  @ApiProperty({
    description: "Preço original calculado (para alavancagem)",
    example: "R$ 6.133,33",
  })
  originalPrice: string;

  @ApiProperty({
    description: "Valores numéricos para referência",
  })
  rawValues: {
    pixPrice: number;
    installmentPrice: number;
    originalPrice: number;
  };
}
