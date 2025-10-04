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
exports.CalculatedPricesResponseDto = exports.CalculatePricesDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CalculatePricesDto {
}
exports.CalculatePricesDto = CalculatePricesDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Custo base do produto",
        example: 4500.0,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CalculatePricesDto.prototype, "cost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Categoria do produto para cálculo de frete específico",
        example: "Macbooks",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculatePricesDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Valor do frete",
        example: 100.0,
        default: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculatePricesDto.prototype, "freight", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: "Configuração de preços a ser utilizada",
        example: "default",
        default: "default",
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculatePricesDto.prototype, "priceConfigName", void 0);
class CalculatedPricesResponseDto {
}
exports.CalculatedPricesResponseDto = CalculatedPricesResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Preço à vista no PIX calculado",
        example: "R$ 5.111,11",
    }),
    __metadata("design:type", String)
], CalculatedPricesResponseDto.prototype, "pixPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Preço parcelado calculado",
        example: "R$ 492,59",
    }),
    __metadata("design:type", String)
], CalculatedPricesResponseDto.prototype, "installmentPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Preço original calculado (para alavancagem)",
        example: "R$ 6.133,33",
    }),
    __metadata("design:type", String)
], CalculatedPricesResponseDto.prototype, "originalPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Valores numéricos para referência",
    }),
    __metadata("design:type", Object)
], CalculatedPricesResponseDto.prototype, "rawValues", void 0);
//# sourceMappingURL=calculate-prices.dto.js.map