import { TradeCalculatorService } from "./services/trade-calculator.service";
import { CalculateTradeDto, TradeResultDto } from "./dto/calculate-trade.dto";
export declare class TradeController {
    private readonly tradeCalculatorService;
    constructor(tradeCalculatorService: TradeCalculatorService);
    calculateTrade(calculateTradeDto: CalculateTradeDto): Promise<TradeResultDto>;
    getValidCombinations(): Promise<{
        "iPhone 11": string[];
        "iPhone 11 Pro": string[];
        "iPhone 11 Pro Max": string[];
        "iPhone 12 mini": string[];
        "iPhone 12": string[];
        "iPhone 12 Pro": string[];
        "iPhone 12 Pro Max": string[];
        "iPhone 13 mini": string[];
        "iPhone 13": string[];
        "iPhone 13 Pro": string[];
        "iPhone 13 Pro Max": string[];
        "iPhone 14": string[];
        "iPhone 14 Plus": string[];
        "iPhone 14 Pro": string[];
        "iPhone 14 Pro Max": string[];
        "iPhone 15": string[];
        "iPhone 15 Plus": string[];
        "iPhone 15 Pro": string[];
        "iPhone 15 Pro Max": string[];
        "iPhone 16": string[];
        "iPhone 16 Plus": string[];
        "iPhone 16 Pro": string[];
        "iPhone 16 Pro Max": string[];
        "iPhone SE (3\u00AA gera\u00E7\u00E3o)": string[];
    }>;
    getColorsByModel(modelo: string): Promise<{
        modelo: string;
        colors: string[];
    }>;
    getDefectsList(): Promise<{
        instantCalculation: {
            id: string;
            label: string;
            depreciation: number;
        }[];
        manualQuotation: {
            id: string;
            label: string;
            note: string;
        }[];
    }>;
    getQualificationOptions(): Promise<{
        ondeOuviu: string[];
        tempoPensando: string[];
        urgenciaTroca: string[];
    }>;
}
