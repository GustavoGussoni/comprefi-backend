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
exports.TradeCalculatorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
let TradeCalculatorService = class TradeCalculatorService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculateTrade(data) {
        let valorBase;
        let valorManualUsado = false;
        if (data.valorManual !== undefined && data.valorManual !== null) {
            valorBase = data.valorManual;
            valorManualUsado = true;
            console.log(`💰 Usando valor manual: R$ ${valorBase.toFixed(2)} para ${data.modeloAtual} ${data.capacidadeAtual}`);
        }
        else {
            const valorTabela = await this.getValorBase(data.modeloAtual, data.capacidadeAtual);
            if (valorTabela) {
                valorBase = valorTabela.valorBase;
                console.log(`📊 Usando valor da tabela: R$ ${valorBase.toFixed(2)} para ${data.modeloAtual} ${data.capacidadeAtual}`);
            }
            else {
                throw new Error(`Valor não encontrado para ${data.modeloAtual} ${data.capacidadeAtual}. Forneça um valor manual.`);
            }
        }
        const depreciacaoBateria = this.calculateBatteryDepreciation(data.bateriaAtual);
        const defeitosGraves = [
            "tela_quebrada",
            "camera_quebrada",
            "faceid_off",
            "traseira_quebrada",
            "outros",
        ];
        const precisaCotacao = data.defeitos?.some((defeito) => defeitosGraves.includes(defeito)) ||
            data.pecasTrocadas ||
            false;
        const depreciacaoDefeitos = this.calculateDefectsDepreciation(data.defeitos || [], data.modeloAtual);
        const valorAparelho = Math.max(0, valorBase - depreciacaoBateria - depreciacaoDefeitos);
        const produtoDesejado = await this.getProdutoDesejado(data.modeloDesejado);
        const precoPixDesejado = this.parsePrice(produtoDesejado.pixPrice);
        const valorFinal = Math.max(0, precoPixDesejado - valorAparelho);
        const cupomDesconto = this.generateCouponCode();
        const valorComDesconto = valorFinal * 0.97;
        const precoProduto = this.parsePrice(produtoDesejado.pixPrice);
        await this.saveQuestionario(data, valorAparelho, valorFinal, false, false, valorManualUsado);
        const resumoDetalhado = `🧮 Cálculo de troca:
  📱 Aparelho atual: ${data.modeloAtual} ${data.capacidadeAtual}
  💰 Valor base: R$ ${valorBase.toFixed(2)} ${valorManualUsado ? "(manual)" : "(tabela)"}
  🔋 Depreciação bateria (${data.bateriaAtual}%): -R$ ${depreciacaoBateria.toFixed(2)}
  🔧 Depreciação defeitos: -R$ ${depreciacaoDefeitos.toFixed(2)}
  📊 Valor final aparelho: R$ ${valorAparelho.toFixed(2)}
  🎯 Produto desejado: ${produtoDesejado.modelo} (${produtoDesejado.pixPrice})
  💳 Valor a pagar: R$ ${valorFinal.toFixed(2)}
  🎁 Com desconto: R$ ${valorComDesconto.toFixed(2)}`;
        console.log(resumoDetalhado);
        if (precisaCotacao) {
            return {
                valorBase: valorBase,
                depreciacaoBateria: depreciacaoBateria,
                depreciacaoDefeitos: depreciacaoDefeitos,
                valorAparelho: valorAparelho,
                produtoDesejado: produtoDesejado,
                precoProduto: Number(precoProduto),
                valorFinal: Number(valorFinal.toFixed(2)),
                valorComDesconto: valorComDesconto,
                temDefeito: data.defeitos.length > 0,
                precisaCotacao: false,
                cupomDesconto: cupomDesconto,
                resumoDetalhado: resumoDetalhado,
            };
        }
        return {
            valorAparelho,
            valorFinal,
            valorBase,
            depreciacaoBateria,
            depreciacaoDefeitos,
            precoProduto: Number(precoProduto),
            temDefeito: (data.defeitos?.length || 0) > 0,
            precisaCotacao: false,
            produtoDesejado,
            cupomDesconto,
            valorComDesconto,
            resumoDetalhado,
        };
    }
    async getValorBase(modelo, capacidade) {
        return await this.prisma.valorTroca.findFirst({
            where: {
                modelo,
                capacidade,
                ativo: true,
            },
        });
    }
    calculateBatteryDepreciation(bateria) {
        if (bateria === 100)
            return 200;
        if (bateria >= 90)
            return 400;
        if (bateria >= 80)
            return 1000;
        return 1700;
    }
    calculateDefectsDepreciation(defeitos, modelo) {
        let total = 0;
        for (const defeito of defeitos) {
            switch (defeito) {
                case "detalhe_leve":
                    total += 200;
                    break;
                case "detalhe_capinha":
                    total += 150;
                    break;
                case "risco_tela":
                    total += 300;
                    break;
                case "risco_camera":
                    total += 400;
                    break;
                case "amassado":
                    total += 400;
                    break;
                case "tela_quebrada":
                    total += this.isOldModel(modelo) ? 800 : 2000;
                    break;
                case "camera_quebrada":
                    total += 600;
                    break;
                case "faceid_off":
                    total += this.isOldModel(modelo) ? 400 : 800;
                    break;
                case "traseira_quebrada":
                    total += 1000;
                    break;
            }
        }
        return total;
    }
    isOldModel(modelo) {
        return modelo.includes("iPhone 11") || modelo.includes("iPhone 12");
    }
    async getProdutoDesejado(modeloDesejado) {
        const produto = await this.prisma.product.findFirst({
            where: {
                model: {
                    contains: modeloDesejado,
                    mode: "insensitive",
                },
                isActive: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        if (!produto) {
            throw new Error(`Produto não encontrado: ${modeloDesejado}`);
        }
        return {
            modelo: produto.model,
            pixPrice: produto.pixPrice,
            installmentPrice: produto.installmentPrice,
            originalPrice: produto.originalPrice,
        };
    }
    parsePrice(priceString) {
        return parseFloat(priceString
            .replace("R$", "")
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(",", "."));
    }
    generateCouponCode() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `TROCA2H-${random}${timestamp.slice(-3)}`;
    }
    async saveQuestionario(data, valorAparelho, valorFinal, temDefeito, precisaCotacao, valorManualUsado) {
        return await this.prisma.questionarioTroca.create({
            data: {
                modeloAtual: data.modeloAtual,
                capacidadeAtual: data.capacidadeAtual,
                corAtual: data.corAtual,
                bateriaAtual: data.bateriaAtual,
                defeitos: data.defeitos || [],
                pecasTrocadas: data.pecasTrocadas || false,
                quaisPecas: data.quaisPecas,
                modeloDesejado: data.modeloDesejado,
                ondeOuviu: data.ondeOuviu,
                tempoPensando: data.tempoPensando,
                urgenciaTroca: data.urgenciaTroca,
                valorAparelho,
                valorFinal,
                temDefeito,
                precisaCotacao,
                etapaAtual: 10,
                concluido: false,
            },
        });
    }
    async getValidCombinations() {
        const combinations = {
            "iPhone 11": ["64GB", "128GB", "256GB"],
            "iPhone 11 Pro": ["64GB", "256GB", "512GB"],
            "iPhone 11 Pro Max": ["64GB", "256GB", "512GB"],
            "iPhone 12 mini": ["64GB", "128GB", "256GB"],
            "iPhone 12": ["64GB", "128GB", "256GB"],
            "iPhone 12 Pro": ["128GB", "256GB", "512GB"],
            "iPhone 12 Pro Max": ["128GB", "256GB", "512GB"],
            "iPhone 13 mini": ["128GB", "256GB", "512GB"],
            "iPhone 13": ["128GB", "256GB", "512GB"],
            "iPhone 13 Pro": ["128GB", "256GB", "512GB", "1TB"],
            "iPhone 13 Pro Max": ["128GB", "256GB", "512GB", "1TB"],
            "iPhone 14": ["128GB", "256GB", "512GB"],
            "iPhone 14 Plus": ["128GB", "256GB", "512GB"],
            "iPhone 14 Pro": ["128GB", "256GB", "512GB", "1TB"],
            "iPhone 14 Pro Max": ["128GB", "256GB", "512GB", "1TB"],
            "iPhone 15": ["128GB", "256GB", "512GB"],
            "iPhone 15 Plus": ["128GB", "256GB", "512GB"],
            "iPhone 15 Pro": ["128GB", "256GB", "512GB", "1TB"],
            "iPhone 15 Pro Max": ["256GB", "512GB", "1TB"],
            "iPhone 16": ["128GB", "256GB", "512GB"],
            "iPhone 16 Plus": ["128GB", "256GB", "512GB"],
            "iPhone 16 Pro": ["128GB", "256GB", "512GB", "1TB"],
            "iPhone 16 Pro Max": ["256GB", "512GB", "1TB"],
            "iPhone SE (3ª geração)": ["64GB", "128GB", "256GB"],
        };
        return combinations;
    }
    async getColorsByModel(modelo) {
        const colorMap = {
            "iPhone 11": ["Preto", "Branco", "Vermelho", "Amarelo", "Roxo", "Verde"],
            "iPhone 12": ["Preto", "Branco", "Vermelho", "Verde", "Azul", "Roxo"],
            "iPhone 13": ["Rosa", "Azul", "Meia-noite", "Estelar", "Vermelho"],
            "iPhone 14": [
                "Azul",
                "Roxo",
                "Amarelo",
                "Meia-noite",
                "Estelar",
                "Vermelho",
            ],
            "iPhone 15": ["Rosa", "Amarelo", "Verde", "Azul", "Preto"],
            "iPhone 16": ["Ultramarino", "Verde-azulado", "Rosa", "Branco", "Preto"],
        };
        if (modelo.includes("Pro")) {
            return ["Grafite", "Dourado", "Prateado", "Azul Sierra"];
        }
        return colorMap[modelo] || ["Preto", "Branco", "Azul", "Vermelho"];
    }
    async checkValueExists(modelo, capacidade) {
        const valor = await this.getValorBase(modelo, capacidade);
        return !!valor;
    }
    async suggestValue(modelo, capacidade) {
        const similarModels = await this.prisma.valorTroca.findMany({
            where: {
                OR: [
                    { modelo: { contains: modelo.split(" ")[1] } },
                    { capacidade },
                ],
                ativo: true,
            },
            orderBy: {
                valorBase: "desc",
            },
            take: 3,
        });
        if (similarModels.length > 0) {
            const media = similarModels.reduce((sum, item) => sum + item.valorBase, 0) /
                similarModels.length;
            return Math.round(media);
        }
        return null;
    }
};
exports.TradeCalculatorService = TradeCalculatorService;
exports.TradeCalculatorService = TradeCalculatorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TradeCalculatorService);
//# sourceMappingURL=trade-calculator.service.js.map