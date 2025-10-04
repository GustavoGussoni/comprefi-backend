export declare class CreateProductDto {
    model: string;
    storage?: string;
    color: string;
    battery: string;
    originalPrice: string;
    installmentPrice: string;
    pixPrice: string;
    details: string;
    image?: string;
    realImages?: string[];
    category: string;
    specs: string;
    cost?: number;
    freight?: number;
    isActive?: boolean;
    isNew?: boolean;
}
