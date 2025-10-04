import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  MaxLength,
  IsUrl,
} from "class-validator";

export class CreateProductDto {
  @ApiProperty({
    description: "Modelo do produto",
    example: "iPhone 15 Pro Max",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  model: string;

  @ApiPropertyOptional({
    description: "Capacidade de armazenamento (opcional para acessórios)",
    example: "256GB",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  storage?: string;

  @ApiProperty({
    description: "Cor(es) disponível(is)",
    example: "Titânio Natural",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  color: string;

  @ApiProperty({
    description: "Percentual da bateria (para produtos seminovos)",
    example: "89%",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  battery: string;

  @ApiProperty({
    description: "Preço original (para alavancagem)",
    example: "R$ 6.590,00",
  })
  @IsString()
  @IsNotEmpty()
  originalPrice: string;

  @ApiProperty({
    description: "Preço parcelado",
    example: "R$ 540,67",
  })
  @IsString()
  @IsNotEmpty()
  installmentPrice: string;

  @ApiProperty({
    description: "Preço à vista no PIX",
    example: "R$ 5.690",
  })
  @IsString()
  @IsNotEmpty()
  pixPrice: string;

  @ApiProperty({
    description: "Detalhes específicos do produto",
    example: "sem detalhes | garantia Apple até junho",
  })
  @IsString()
  @IsNotEmpty()
  details: string;

  @ApiPropertyOptional({
    description: "URL da imagem principal do produto",
    example: "https://example.com/iphone15promax.jpg",
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({
    description: "Array de URLs das fotos reais do produto",
    example: ["https://example.com/real1.jpg", "https://example.com/real2.jpg"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  realImages?: string[];

  @ApiProperty({
    description: "Categoria do produto",
    example: "iPhones Seminovos",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiProperty({
    description: "Especificações técnicas do produto",
    example:
      'Tela Super Retina XDR de 6,7", chip A17 Pro, câmera tripla de 48MP, 256GB de armazenamento',
  })
  @IsString()
  @IsNotEmpty()
  specs: string;

  @ApiPropertyOptional({
    description: "Custo base do produto (para cálculos automáticos)",
    example: 4500.0,
  })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({
    description: "Valor do frete",
    example: 100.0,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  freight?: number;

  @ApiPropertyOptional({
    description: "Se o produto está ativo",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Se o produto é novo (true) ou seminovo (false)",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;
}
