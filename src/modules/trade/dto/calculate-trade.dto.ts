import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
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
    description: "Valor manual do aparelho atual; sobrescreve a tabela",
    example: 3500,
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
    description: "Indica se alguma peça já foi trocada",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  pecasTrocadas?: boolean;

  @ApiPropertyOptional({
    description: "Peças que foram trocadas",
    example: "Tela e bateria",
  })
  @IsOptional()
  @IsString()
  quaisPecas?: string;

  @ApiProperty({
    description: "ID da variante ou nome do produto desejado",
    example: "cmf7variantid",
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

export class DesiredTradeProductDto {
  @ApiProperty({ example: "iPhone 16 Pro Max 256GB Titânio Natural" })
  modelo: string;

  @ApiProperty({ example: "R$ 7.666,67" })
  pixPrice: string;

  @ApiProperty({ example: "R$ 738,51" })
  installmentPrice: string;

  @ApiProperty({ example: "R$ 8.214,29" })
  originalPrice: string;
}

export class TradeResultDto {
  @ApiProperty({ description: "Identificador da simulação" })
  questionarioId: string;

  @ApiProperty({
    description: "Expiração da oferta de 3% em formato ISO 8601",
    example: "2026-09-08T20:30:00.000Z",
  })
  offerExpiresAt: string;

  @ApiProperty({ description: "Percentual de desconto temporário", example: 3 })
  descontoPercentual: number;

  @ApiProperty({ description: "Valor base do aparelho", example: 2800 })
  valorBase: number;

  @ApiProperty({ description: "Depreciação por bateria", example: 448 })
  depreciacaoBateria: number;

  @ApiProperty({ description: "Depreciação por defeitos", example: 350 })
  depreciacaoDefeitos: number;

  @ApiProperty({ description: "Valor final do aparelho", example: 2002 })
  valorAparelho: number;

  @ApiProperty({ description: "Preço PIX do produto desejado", example: 7666.67 })
  precoProduto: number;

  @ApiProperty({ description: "Diferença sem desconto", example: 5664.67 })
  valorFinal: number;

  @ApiProperty({ description: "Diferença com desconto temporário", example: 5494.73 })
  valorComDesconto: number;

  @ApiProperty({ description: "Indica uso de valor manual", example: false })
  valorManualUsado: boolean;

  @ApiProperty({ type: DesiredTradeProductDto })
  produtoDesejado: DesiredTradeProductDto;

  @ApiProperty({ description: "Indica defeito informado", example: true })
  temDefeito: boolean;

  @ApiProperty({ description: "Indica necessidade de cotação manual", example: false })
  precisaCotacao: boolean;

  @ApiProperty({ description: "Cupom da oferta temporária" })
  cupomDesconto: string;

  @ApiProperty({ description: "Resumo textual do cálculo" })
  resumoDetalhado: string;
}
