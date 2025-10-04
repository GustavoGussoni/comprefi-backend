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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const trade_calculator_service_1 = require("./services/trade-calculator.service");
const calculate_trade_dto_1 = require("./dto/calculate-trade.dto");
let TradeController = class TradeController {
    constructor(tradeCalculatorService) {
        this.tradeCalculatorService = tradeCalculatorService;
    }
    async calculateTrade(calculateTradeDto) {
        return this.tradeCalculatorService.calculateTrade(calculateTradeDto);
    }
    async getValidCombinations() {
        return this.tradeCalculatorService.getValidCombinations();
    }
    async getColorsByModel(modelo) {
        const colors = await this.tradeCalculatorService.getColorsByModel(modelo);
        return { modelo, colors };
    }
    async getDefectsList() {
        return {
            instantCalculation: [
                { id: "nenhum", label: "Nenhum defeito", depreciation: 0 },
                { id: "detalhe_leve", label: "Detalhe leve", depreciation: 200 },
                {
                    id: "detalhe_capinha",
                    label: "Detalhe de uso de capinha",
                    depreciation: 150,
                },
                { id: "risco_tela", label: "Risco na tela", depreciation: 300 },
                { id: "risco_camera", label: "Risco na câmera", depreciation: 400 },
                { id: "amassado", label: "Amassado", depreciation: 400 },
            ],
            manualQuotation: [
                {
                    id: "tela_quebrada",
                    label: "Tela quebrada",
                    note: "Cotação em até 3h",
                },
                {
                    id: "camera_quebrada",
                    label: "Câmera quebrada",
                    note: "Cotação em até 3h",
                },
                {
                    id: "faceid_off",
                    label: "Face ID não funciona",
                    note: "Cotação em até 3h",
                },
                {
                    id: "traseira_quebrada",
                    label: "Traseira quebrada",
                    note: "Cotação em até 3h",
                },
                { id: "outros", label: "Outros defeitos", note: "Cotação em até 3h" },
            ],
        };
    }
    async getQualificationOptions() {
        return {
            ondeOuviu: [
                "Instagram",
                "TikTok",
                "Facebook",
                "Indicação de amigo",
                "Google",
                "YouTube",
                "Outros",
            ],
            tempoPensando: [
                "Primeira vez que penso nisso",
                "Há algumas semanas",
                "Há 1 mês",
                "Há 2 meses",
                "Há 3 meses ou mais",
            ],
            urgenciaTroca: [
                "Agora mesmo",
                "Na próxima semana",
                "Daqui 2 semanas",
                "Próximo mês",
                "Daqui 2 meses",
                "Daqui 3 meses",
                "Ainda não decidi",
            ],
        };
    }
};
exports.TradeController = TradeController;
__decorate([
    (0, common_1.Post)("calculate"),
    (0, swagger_1.ApiOperation)({ summary: "Calcular valor de troca de iPhone" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Cálculo realizado com sucesso",
        type: calculate_trade_dto_1.TradeResultDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Dados inválidos",
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculate_trade_dto_1.CalculateTradeDto]),
    __metadata("design:returntype", Promise)
], TradeController.prototype, "calculateTrade", null);
__decorate([
    (0, common_1.Get)("combinations"),
    (0, swagger_1.ApiOperation)({ summary: "Obter combinações válidas de modelo e capacidade" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Combinações válidas retornadas",
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TradeController.prototype, "getValidCombinations", null);
__decorate([
    (0, common_1.Get)("colors/:modelo"),
    (0, swagger_1.ApiOperation)({ summary: "Obter cores disponíveis para um modelo" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Cores disponíveis retornadas",
    }),
    __param(0, (0, common_1.Param)("modelo")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TradeController.prototype, "getColorsByModel", null);
__decorate([
    (0, common_1.Get)("defects"),
    (0, swagger_1.ApiOperation)({ summary: "Obter lista de defeitos possíveis" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Lista de defeitos retornada",
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TradeController.prototype, "getDefectsList", null);
__decorate([
    (0, common_1.Get)("qualification-options"),
    (0, swagger_1.ApiOperation)({ summary: "Obter opções para perguntas de qualificação" }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Opções de qualificação retornadas",
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TradeController.prototype, "getQualificationOptions", null);
exports.TradeController = TradeController = __decorate([
    (0, swagger_1.ApiTags)("Trade Calculator"),
    (0, common_1.Controller)("trade"),
    __metadata("design:paramtypes", [trade_calculator_service_1.TradeCalculatorService])
], TradeController);
//# sourceMappingURL=trade.controller.js.map