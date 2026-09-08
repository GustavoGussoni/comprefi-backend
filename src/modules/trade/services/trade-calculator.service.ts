import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { CalculateTradeDto, TradeResultDto } from "../dto/calculate-trade.dto";

@Injectable()
export class TradeCalculatorService {
  private readonly logger = new Logger(TradeCalculatorService.name);
  constructor(private prisma: PrismaService) {}

  private static readonly OFFER_DURATION_MINUTES = 30;
  private static readonly DISCOUNT_PERCENT = 3;

  async calculateTrade(data: CalculateTradeDto): Promise<TradeResultDto> {
    const defeitos = this.normalizeDefects(data.defeitos);
    const temDefeito = defeitos.length > 0;
    let valorBase: number;
    let valorManualUsado = false;

    if (data.valorManual !== undefined && data.valorManual !== null) {
      valorBase = this.roundCurrency(data.valorManual);
      valorManualUsado = true;
      this.logger.log(`Usando valor manual: R$ ${valorBase.toFixed(2)}`);
    } else {
      const valorTabela = await this.getValorBase(
        data.modeloAtual,
        data.capacidadeAtual,
      );

      if (!valorTabela) {
        throw new Error(
          `Valor não encontrado para ${data.modeloAtual} ${data.capacidadeAtual}. Forneça um valor manual.`,
        );
      }

      valorBase = this.roundCurrency(valorTabela.valorBase);
      this.logger.log(`Usando valor da tabela: R$ ${valorBase.toFixed(2)}`);
    }

    const depreciacaoBateria = this.roundCurrency(
      this.calculateBatteryDepreciation(data.bateriaAtual, valorBase),
    );
    const defeitosGraves = [
      "tela_quebrada",
      "camera_quebrada",
      "faceid_off",
      "traseira_quebrada",
      "outros",
    ];
    const precisaCotacao =
      defeitos.some((defeito) => defeitosGraves.includes(defeito)) ||
      Boolean(data.pecasTrocadas);
    const depreciacaoDefeitos = this.roundCurrency(
      this.calculateDefectsDepreciation(defeitos, data.modeloAtual),
    );
    const valorAparelho = this.roundCurrency(
      Math.max(0, valorBase - depreciacaoBateria - depreciacaoDefeitos),
    );

    const produtoDesejado = await this.getProdutoDesejado(data.modeloDesejado);
    const precoProduto = this.parsePrice(produtoDesejado.pixPrice);
    const valorFinal = this.roundCurrency(
      Math.max(0, precoProduto - valorAparelho),
    );
    const descontoPercentual = TradeCalculatorService.DISCOUNT_PERCENT;
    const valorComDesconto = this.roundCurrency(
      valorFinal * (1 - descontoPercentual / 100),
    );
    const cupomDesconto = this.generateCouponCode();
    const offerExpiresAt = new Date(
      Date.now() +
        TradeCalculatorService.OFFER_DURATION_MINUTES * 60 * 1000,
    );

    const resumoDetalhado = `Cálculo de troca:
Aparelho atual: ${data.modeloAtual} ${data.capacidadeAtual}
Valor base: R$ ${valorBase.toFixed(2)} ${valorManualUsado ? "(manual)" : "(tabela)"}
Depreciação bateria (${data.bateriaAtual}%): -R$ ${depreciacaoBateria.toFixed(2)}
Depreciação defeitos: -R$ ${depreciacaoDefeitos.toFixed(2)}
Valor final aparelho: R$ ${valorAparelho.toFixed(2)}
Produto desejado: ${produtoDesejado.modelo} (${produtoDesejado.pixPrice})
Valor a pagar: R$ ${valorFinal.toFixed(2)}
Com desconto de ${descontoPercentual}%: R$ ${valorComDesconto.toFixed(2)}`;

    const questionario = await this.saveQuestionario(data, defeitos, {
      valorBase,
      depreciacaoBateria,
      depreciacaoDefeitos,
      valorAparelho,
      precoProduto,
      valorFinal,
      valorComDesconto,
      descontoPercentual,
      valorManualUsado,
      cupomDesconto,
      offerExpiresAt,
      temDefeito,
      precisaCotacao,
      produtoDesejadoNome: produtoDesejado.modelo,
    });

    this.logger.log(resumoDetalhado);

    return {
      questionarioId: questionario.id,
      offerExpiresAt: offerExpiresAt.toISOString(),
      descontoPercentual,
      valorBase,
      depreciacaoBateria,
      depreciacaoDefeitos,
      valorAparelho,
      precoProduto,
      valorFinal,
      valorComDesconto,
      valorManualUsado,
      produtoDesejado,
      temDefeito,
      precisaCotacao,
      cupomDesconto,
      resumoDetalhado,
    };
  }

  private async getValorBase(modelo: string, capacidade: string) {
    return await this.prisma.valorTroca.findFirst({
      where: {
        modelo,
        capacidade,
        ativo: true,
      },
    });
  }

  private calculateBatteryDepreciation(bateria: number, valorBase: number): number {
    // Regra proporcional: desconto é um % do valor base
    if (bateria >= 99) return Math.round(valorBase * 0.04);  // 99-100% → -4%
    if (bateria >= 88) return Math.round(valorBase * 0.08);  // 88-98% → -8%
    if (bateria >= 80) return Math.round(valorBase * 0.16);  // 80-87% → -16%
    return Math.round(valorBase * 0.32);                     // < 80% → -32%
  }

  private calculateDefectsDepreciation(
    defeitos: string[],
    modelo: string
  ): number {
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
          // Estes deveriam ir para cotação manual, mas caso passem:
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

  private isOldModel(modelo: string): boolean {
    return modelo.includes("iPhone 11") || modelo.includes("iPhone 12");
  }

  private async getProdutoDesejado(modeloDesejado: string) {
    // 1. Tentar buscar por ID direto (o frontend envia o variant ID)
    const variantById = await this.prisma.productVariant.findUnique({
      where: { id: modeloDesejado },
      include: { productGroup: true },
    }).catch(() => null); // catch caso não seja um ID válido

    if (variantById && variantById.isActive) {
      return {
        modelo: `${variantById.productGroup.model} ${variantById.storage} ${variantById.color}`,
        pixPrice: variantById.pixPrice,
        installmentPrice: variantById.installmentPrice,
        originalPrice: variantById.originalPrice,
      };
    }

    // 2. Tentar buscar por nome no catálogo v2
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        isActive: true,
        productGroup: {
          model: {
            contains: modeloDesejado,
            mode: "insensitive",
          },
          isActive: true,
        },
      },
      include: {
        productGroup: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (variant) {
      return {
        modelo: `${variant.productGroup.model} ${variant.storage} ${variant.color}`,
        pixPrice: variant.pixPrice,
        installmentPrice: variant.installmentPrice,
        originalPrice: variant.originalPrice,
      };
    }

    // 3. Fallback: buscar na tabela Product legada
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

  private parsePrice(priceString: string): number {
    const value = Number(
      priceString
        .replace("R$", "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", "."),
    );

    if (!Number.isFinite(value)) {
      throw new Error(`Preço inválido no catálogo: ${priceString}`);
    }

    return this.roundCurrency(value);
  }

  private normalizeDefects(defeitos?: string[]): string[] {
    return Array.from(
      new Set(
        (defeitos ?? [])
          .map((defeito) => defeito.trim())
          .filter((defeito) => defeito.length > 0 && defeito !== "nenhum"),
      ),
    );
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private generateCouponCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TROCA30M-${random}${timestamp.slice(-3).toUpperCase()}`;
  }

  private async saveQuestionario(
    data: CalculateTradeDto,
    defeitos: string[],
    result: {
      valorBase: number;
      depreciacaoBateria: number;
      depreciacaoDefeitos: number;
      valorAparelho: number;
      precoProduto: number;
      valorFinal: number;
      valorComDesconto: number;
      descontoPercentual: number;
      valorManualUsado: boolean;
      cupomDesconto: string;
      offerExpiresAt: Date;
      temDefeito: boolean;
      precisaCotacao: boolean;
      produtoDesejadoNome: string;
    },
  ) {
    return this.prisma.questionarioTroca.create({
      data: {
        modeloAtual: data.modeloAtual,
        capacidadeAtual: data.capacidadeAtual,
        corAtual: data.corAtual,
        bateriaAtual: data.bateriaAtual,
        defeitos,
        pecasTrocadas: Boolean(data.pecasTrocadas),
        quaisPecas: data.quaisPecas,
        modeloDesejado: data.modeloDesejado,
        produtoDesejadoNome: result.produtoDesejadoNome,
        ondeOuviu: data.ondeOuviu,
        tempoPensando: data.tempoPensando,
        urgenciaTroca: data.urgenciaTroca,
        valorBase: result.valorBase,
        depreciacaoBateria: result.depreciacaoBateria,
        depreciacaoDefeitos: result.depreciacaoDefeitos,
        valorAparelho: result.valorAparelho,
        precoProduto: result.precoProduto,
        valorFinal: result.valorFinal,
        valorComDesconto: result.valorComDesconto,
        descontoPercentual: result.descontoPercentual,
        valorManualUsado: result.valorManualUsado,
        cupomDesconto: result.cupomDesconto,
        offerExpiresAt: result.offerExpiresAt,
        temDefeito: result.temDefeito,
        precisaCotacao: result.precisaCotacao,
        etapaAtual: 10,
        concluido: false,
      },
    });
  }

  async getValidCombinations() {
    // Retorna combinações válidas de modelo + capacidade
    const combinations = {
      "iPhone 11": ["64GB", "128GB", "256GB"],
      "iPhone 11 Pro": ["64GB", "256GB", "512GB"],
      "iPhone 11 Pro Max": ["64GB", "256GB", "512GB"],
      "iPhone 12": ["64GB", "128GB", "256GB"],
      "iPhone 12 Pro": ["128GB", "256GB", "512GB"],
      "iPhone 12 Pro Max": ["128GB", "256GB", "512GB"],
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
    };

    return combinations;
  }

  async getColorsByModel(modelo: string): Promise<string[]> {
    // Cores por modelo e geração
    const colorMap: Record<string, string[]> = {
      // iPhone 11
      "iPhone 11": ["Preto", "Branco", "Vermelho", "Amarelo", "Roxo", "Verde"],
      "iPhone 11 Pro": ["Dourado", "Cinza Espacial", "Prateado", "Verde Meia-noite"],
      "iPhone 11 Pro Max": ["Dourado", "Cinza Espacial", "Prateado", "Verde Meia-noite"],
      // iPhone 12
      "iPhone 12": ["Preto", "Branco", "Vermelho", "Verde", "Azul", "Roxo"],
      "iPhone 12 Pro": ["Dourado", "Grafite", "Prateado", "Azul Pacífico"],
      "iPhone 12 Pro Max": ["Dourado", "Grafite", "Prateado", "Azul Pacífico"],
      // iPhone 13
      "iPhone 13": ["Rosa", "Azul", "Meia-noite", "Estelar", "Vermelho", "Verde"],
      "iPhone 13 Pro": ["Dourado", "Grafite", "Prateado", "Azul Sierra", "Verde Alpino"],
      "iPhone 13 Pro Max": ["Dourado", "Grafite", "Prateado", "Azul Sierra", "Verde Alpino"],
      // iPhone 14
      "iPhone 14": ["Azul", "Roxo", "Amarelo", "Meia-noite", "Estelar", "Vermelho"],
      "iPhone 14 Plus": ["Azul", "Roxo", "Amarelo", "Meia-noite", "Estelar", "Vermelho"],
      "iPhone 14 Pro": ["Dourado", "Grafite", "Prateado", "Roxo Profundo"],
      "iPhone 14 Pro Max": ["Dourado", "Grafite", "Prateado", "Roxo Profundo"],
      // iPhone 15
      "iPhone 15": ["Rosa", "Amarelo", "Verde", "Azul", "Preto"],
      "iPhone 15 Plus": ["Rosa", "Amarelo", "Verde", "Azul", "Preto"],
      "iPhone 15 Pro": ["Titânio Natural", "Titânio Azul", "Titânio Branco", "Titânio Preto"],
      "iPhone 15 Pro Max": ["Titânio Natural", "Titânio Azul", "Titânio Branco", "Titânio Preto"],
      // iPhone 16
      "iPhone 16": ["Ultramarino", "Verde-azulado", "Rosa", "Branco", "Preto"],
      "iPhone 16 Plus": ["Ultramarino", "Verde-azulado", "Rosa", "Branco", "Preto"],
      "iPhone 16 Pro": ["Titânio Natural", "Titânio Preto", "Titânio Branco", "Titânio Deserto"],
      "iPhone 16 Pro Max": ["Titânio Natural", "Titânio Preto", "Titânio Branco", "Titânio Deserto"],
    };

    return colorMap[modelo] || ["Preto", "Branco", "Azul", "Vermelho"];
  }

  // Novo método para verificar se valor existe na tabela
  async checkValueExists(modelo: string, capacidade: string): Promise<boolean> {
    const valor = await this.getValorBase(modelo, capacidade);
    return !!valor;
  }

  // Novo método para sugerir valor baseado em modelos similares
  async suggestValue(
    modelo: string,
    capacidade: string
  ): Promise<number | null> {
    // Buscar valores de modelos similares para sugestão
    const similarModels = await this.prisma.valorTroca.findMany({
      where: {
        OR: [
          { modelo: { contains: modelo.split(" ")[1] } }, // Ex: "iPhone 13" busca por "13"
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
      // Retorna a média dos valores encontrados
      const media =
        similarModels.reduce((sum, item) => sum + item.valorBase, 0) /
        similarModels.length;
      return Math.round(media);
    }

    return null;
  }
}
