import { PrismaService } from "../../../database/prisma.service";
import { CalculatePricesDto, CalculatedPricesResponseDto } from "../dto/calculate-prices.dto";
export declare class PriceCalculatorService {
    private prisma;
    constructor(prisma: PrismaService);
    calculatePrices(data: CalculatePricesDto): Promise<CalculatedPricesResponseDto>;
    private formatCurrency;
    private getFreightByCategory;
    calculateProductPrices(cost: number, freight?: number, configName?: string): Promise<CalculatedPricesResponseDto>;
}
