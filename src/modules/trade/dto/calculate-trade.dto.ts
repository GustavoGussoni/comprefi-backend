import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from "class-validator";

export class CalculateTradeDto {
  @ApiProperty({
    description: "Modelo do iPhone atual",
    example: "iPhone 13 Pro",
  })
  @IsString()
  modeloAtual: string;

  @ApiProperty({
    description: "Capacidade do iPhone atual",
    example: "256GB",
  })
  @IsString()
  capacidadeAtual: string;

  @ApiProperty({
    description: "Cor do iPhone atual",
    example: "Azul Sierra",
  })
  @IsString()
  corAtual: string;

  @ApiProperty({
    description: "Saúde da bateria em porcentagem",
    example: 95,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  bateriaAtual: number;

  @ApiPropertyOptional({
    description:
      "Valor manual do aparelho atual (sobrescreve tabela de valores)",
    example: 3500.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorManual?: number;

  @ApiPropertyOptional({
    description: "Lista de defeitos selecionados",
    example: ["detalhe_leve", "risco_tela"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defeitos?: string[];

  @ApiPropertyOptional({
    description: "Se já trocou alguma peça",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  pecasTrocadas?: boolean;

  @ApiPropertyOptional({
    description: "Quais peças foram trocadas",
    example: "Tela e bateria",
  })
  @IsOptional()
  @IsString()
  quaisPecas?: string;

  @ApiProperty({
    description: "Modelo do iPhone desejado",
    example: "iPhone 15 Pro Max",
  })
  @IsString()
  modeloDesejado: string;

  @ApiPropertyOptional({
    description: "Onde ouviu falar da CompreFi",
    example: "Instagram",
  })
  @IsOptional()
  @IsString()
  ondeOuviu?: string;

  @ApiPropertyOptional({
    description: "Há quanto tempo pensa em trocar",
    example: "Há 2 meses",
  })
  @IsOptional()
  @IsString()
  tempoPensando?: string;

  @ApiPropertyOptional({
    description: "Urgência para trocar",
    example: "Próxima semana",
  })
  @IsOptional()
  @IsString()
  urgenciaTroca?: string;
}

export class TradeResultDto {
  @ApiProperty({ description: "Valor base do aparelho", example: 2800 })
  @IsNumber()
  valorBase: number;

  @ApiProperty({ description: "Depreciação por bateria", example: 1000 })
  @IsNumber()
  depreciacaoBateria: number;

  @ApiProperty({ description: "Depreciação por defeitos", example: 350 })
  @IsNumber()
  depreciacaoDefeitos: number;

  @ApiProperty({ description: "Valor final do aparelho", example: 1450 })
  @IsNumber()
  valorAparelho: number;

  @ApiProperty({ description: "Preço do produto desejado", example: 7666.67 })
  @IsNumber()
  precoProduto: string | number;

  @ApiProperty({ description: "Valor a pagar", example: 6216.67 })
  @IsNumber()
  valorFinal: number;

  @ApiProperty({ description: "Valor com desconto", example: 6030.17 })
  @IsNumber()
  valorComDesconto: number;

  @ApiProperty({ description: "Produto desejado" })
  produtoDesejado: any;

  @ApiProperty({ description: "Tem defeito", example: true })
  @IsBoolean()
  temDefeito: boolean;

  @ApiProperty({ description: "Precisa cotação", example: false })
  @IsBoolean()
  precisaCotacao: boolean;

  @ApiProperty({ description: "Cupom de desconto" })
  cupomDesconto: string;

  @ApiProperty({ description: "Resumo detalhado" })
  resumoDetalhado: string;
}
