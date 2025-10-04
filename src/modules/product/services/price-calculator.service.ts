import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import {
  CalculatePricesDto,
  CalculatedPricesResponseDto,
} from "../dto/calculate-prices.dto";

@Injectable()
export class PriceCalculatorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcula os preços baseado no custo e configurações
   * Fórmulas baseadas nas especificações do usuário:
   * - pixPrice = (custo + frete) / 0.9
   * - installmentPrice = (pixPrice / 0.8651) / 12
   * - originalPrice = pixPrice * 1.2 (20% a mais para alavancagem)
   */
  async calculatePrices(
    data: CalculatePricesDto
  ): Promise<CalculatedPricesResponseDto> {
    const { cost, freight = 100, priceConfigName = "default" } = data;
    const adjustedFreight = data.category?.toLowerCase().includes("macbook")
      ? 220
      : freight || 100;
    // Busca configuração de preços (se existir)
    let config = await this.prisma.priceConfig.findUnique({
      where: { name: priceConfigName },
    });

    // Se não encontrar configuração, usa valores padrão
    if (!config) {
      config = {
        id: "",
        name: "default",
        freightValue: 100,
        pixMultiplier: 0.9,
        installmentDiv1: 0.8651,
        installmentDiv2: 12,
        originalPricePerc: 1.19,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Cálculos corretos
    const pixPriceValue = (cost + adjustedFreight) / config.pixMultiplier;
    const installmentPriceValue =
      pixPriceValue / config.installmentDiv1 / config.installmentDiv2;
    const originalPriceValue = (cost + adjustedFreight) / 0.84;

    // Formatação para strings no padrão brasileiro
    const pixPrice = this.formatCurrency(pixPriceValue);
    const installmentPrice = this.formatCurrency(installmentPriceValue);
    const originalPrice = this.formatCurrency(originalPriceValue);

    return {
      pixPrice,
      installmentPrice,
      originalPrice,
      rawValues: {
        pixPrice: pixPriceValue,
        installmentPrice: installmentPriceValue,
        originalPrice: originalPriceValue,
      },
    };
  }

  /**
   * Formata valor numérico para string de moeda brasileira
   */
  private formatCurrency(value: number): string {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  }
  private getFreightByCategory(
    category?: string,
    defaultFreight: number = 100
  ): number {
    if (!category) return defaultFreight;

    const categoryLower = category.toLowerCase();
    if (categoryLower.includes("macbook") || categoryLower.includes("mac")) {
      return 220;
    }

    return defaultFreight;
  }
  /**
   * Calcula preços automaticamente para um produto baseado no custo
   */
  async calculateProductPrices(
    cost: number,
    freight: number = 100,
    configName: string = "default"
  ) {
    return this.calculatePrices({ cost, freight, priceConfigName: configName });
  }
}
