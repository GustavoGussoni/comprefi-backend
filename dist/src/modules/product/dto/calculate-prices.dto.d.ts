export declare class CalculatePricesDto {
    cost: number;
    category?: string;
    freight?: number;
    priceConfigName?: string;
}
export declare class CalculatedPricesResponseDto {
    pixPrice: string;
    installmentPrice: string;
    originalPrice: string;
    rawValues: {
        pixPrice: number;
        installmentPrice: number;
        originalPrice: number;
    };
}
