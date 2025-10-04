"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeResultDto = exports.CalculateTradeDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CalculateTradeDto {
}
exports.CalculateTradeDto = CalculateTradeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Modelo do iPhone atual",
        example: "iPhone 13 Pro",
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateTradeDto.prototype, "modeloAtual", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Capacidade do iPhone atual",
        example: "256GB",
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateTradeDto.prototype, "capacidadeAtual", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Cor do iPhone atual",
        example: "Azul Sierra",
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateTradeDto.prototype, "corAtual", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Saúde da bateria em porcentagem",
        example: 95,
        minimum: 0,
        maximum: 100,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CalculateTradeDto.prototype, "bateriaAtual", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Valor manual do aparelho atual (sobrescreve tabela de valores)",
        example: 3500.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CalculateTradeDto.prototype, "valorManual", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Lista de defeitos selecionados",
        example: ["detalhe_leve", "risco_tela"],
        type: [String],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CalculateTradeDto.prototype, "defeitos", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Se já trocou alguma peça",
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CalculateTradeDto.prototype, "pecasTrocadas", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Quais peças foram trocadas",
        example: "Tela e bateria",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateTradeDto.prototype, "quaisPecas", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Modelo do iPhone desejado",
        example: "iPhone 15 Pro Max",
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateTradeDto.prototype, "modeloDesejado", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Onde ouviu falar da CompreFi",
        example: "Instagram",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateTradeDto.prototype, "ondeOuviu", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Há quanto tempo pensa em trocar",
        example: "Há 2 meses",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateTradeDto.prototype, "tempoPensando", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Urgência para trocar",
        example: "Próxima semana",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateTradeDto.prototype, "urgenciaTroca", void 0);
class TradeResultDto {
}
exports.TradeResultDto = TradeResultDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Valor base do aparelho", example: 2800 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], TradeResultDto.prototype, "valorBase", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Depreciação por bateria", example: 1000 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], TradeResultDto.prototype, "depreciacaoBateria", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Depreciação por defeitos", example: 350 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], TradeResultDto.prototype, "depreciacaoDefeitos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Valor final do aparelho", example: 1450 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], TradeResultDto.prototype, "valorAparelho", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Preço do produto desejado", example: 7666.67 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], TradeResultDto.prototype, "precoProduto", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Valor a pagar", example: 6216.67 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], TradeResultDto.prototype, "valorFinal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Valor com desconto", example: 6030.17 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], TradeResultDto.prototype, "valorComDesconto", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Produto desejado" }),
    __metadata("design:type", Object)
], TradeResultDto.prototype, "produtoDesejado", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Tem defeito", example: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TradeResultDto.prototype, "temDefeito", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Precisa cotação", example: false }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TradeResultDto.prototype, "precisaCotacao", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Cupom de desconto" }),
    __metadata("design:type", String)
], TradeResultDto.prototype, "cupomDesconto", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "Resumo detalhado" }),
    __metadata("design:type", String)
], TradeResultDto.prototype, "resumoDetalhado", void 0);
//# sourceMappingURL=calculate-trade.dto.js.map