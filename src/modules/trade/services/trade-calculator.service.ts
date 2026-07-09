import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { CalculateTradeDto, TradeResultDto } from "../dto/calculate-trade.dto";

@Injectable()
export class TradeCalculatorService {
  private readonly logger = new Logger(TradeCalculatorService.name);
  constructor(private prisma: PrismaService) {}

  async calculateTrade(data: CalculateTradeDto): Promise<TradeResultDto> {
    // 1. Determinar valor base do aparelho atual
    let valorBase: number;
    let valorManualUsado = false;

    if (data.valorManual !== undefined && data.valorManual !== null) {
      // Prioridade: valor manual sempre sobrescreve
      valorBase = data.valorManual;
      valorManualUsado = true;
      this.logger.log(`💰 Usando valor manual: R$ ${valorBase.toFixed(2)}...`);
    } else {
      // Buscar na tabela
      const valorTabela = await this.getValorBase(
        data.modeloAtual,
        data.capacidadeAtual
      );

      if (valorTabela) {
        valorBase = valorTabela.valorBase;
        this.logger.log(
          `📊 Usando valor da tabela: R$ ${valorBase.toFixed(2)}...`
        );
      } else {
        throw new Error(
          `Valor não encontrado para ${data.modeloAtual} ${data.capacidadeAtual}. Forneça um valor manual.`
        );
      }
    }

    // 2. Calcular depreciação por bateria (proporcional ao valor base)
    const depreciacaoBateria = this.calculateBatteryDepreciation(
      data.bateriaAtual,
      valorBase
    );

    // 3. Verificar se tem defeitos que exigem cotação manual
    const defeitosGraves = [
      "tela_quebrada",
      "camera_quebrada",
      "faceid_off",
      "traseira_quebrada",
      "outros",
    ];
    const precisaCotacao =
      data.defeitos?.some((defeito) => defeitosGraves.includes(defeito)) ||
      data.pecasTrocadas ||
      false;

    // 4. Calcular depreciação por defeitos leves
    const depreciacaoDefeitos = this.calculateDefectsDepreciation(
      data.defeitos || [],
      data.modeloAtual
    );

    // 5. Calcular valor final do aparelho atual
    const valorAparelho = Math.max(
      0,
      valorBase - depreciacaoBateria - depreciacaoDefeitos
    );

    // 6. Buscar produto desejado
    const produtoDesejado = await this.getProdutoDesejado(data.modeloDesejado);

    // 7. Calcular valor final da troca
    const precoPixDesejado = this.parsePrice(produtoDesejado.pixPrice);
    const valorFinal = Math.max(0, precoPixDesejado - valorAparelho);

    // 8. Gerar cupom de desconto
    const cupomDesconto = this.generateCouponCode();
    const valorComDesconto = valorFinal * 0.97; // 3% de desconto

    const precoProduto = this.parsePrice(produtoDesejado.pixPrice);

    // 9. Salvar questionário no banco
    await this.saveQuestionario(
      data,
      valorAparelho,
      valorFinal,
      false,
      false,
      valorManualUsado
    );

    // 10. Log detalhado do cálculo
    const resumoDetalhado = `🧮 Cálculo de troca:
📱 Aparelho atual: ${data.modeloAtual} ${data.capacidadeAtual}
💰 Valor base: R$ ${valorBase.toFixed(2)} ${valorManualUsado ? "(manual)" : "(tabela)"}
🔋 Depreciação bateria (${data.bateriaAtual}%): -R$ ${depreciacaoBateria.toFixed(2)}
🔧 Depreciação defeitos: -R$ ${depreciacaoDefeitos.toFixed(2)}
📊 Valor final aparelho: R$ ${valorAparelho.toFixed(2)}
🎯 Produto desejado: ${produtoDesejado.modelo} (${produtoDesejado.pixPrice})
💳 Valor a pagar: R$ ${valorFinal.toFixed(2)}
🎁 Com desconto: R$ ${valorComDesconto.toFixed(2)}`;
    this.logger.log(resumoDetalhado);

    if (precisaCotacao) {
      return {
        // Dados do aparelho atual
        valorBase: valorBase,
        depreciacaoBateria: depreciacaoBateria,
        depreciacaoDefeitos: depreciacaoDefeitos,
        valorAparelho: valorAparelho,

        // Dados do produto desejado
        produtoDesejado: produtoDesejado,
        precoProduto: Number(precoProduto),

        // Cálculo final
        valorFinal: Number(valorFinal.toFixed(2)),
        valorComDesconto: valorComDesconto,

        // Flags
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
    // Converter "R$ 5.111,11" para 5111.11
    return parseFloat(
      priceString
        .replace("R$", "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    );
  }

  private generateCouponCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `TROCA2H-${random}${timestamp.slice(-3)}`;
  }

  private async saveQuestionario(
    data: CalculateTradeDto,
    valorAparelho: number,
    valorFinal: number,
    temDefeito: boolean,
    precisaCotacao: boolean,
    valorManualUsado: boolean
  ) {
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
        etapaAtual: 10, // Questionário completo
        concluido: false, // Ainda não preencheu contato
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
