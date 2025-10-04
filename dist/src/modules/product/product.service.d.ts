import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CalculatePricesDto } from './dto/calculate-prices.dto';
import { ProductsRepository } from './repositories/product.repository';
import { PriceCalculatorService } from './services/price-calculator.service';
interface FindAllFilters {
    category?: string;
    isNew?: boolean;
    isActive?: boolean;
    groupBy?: string;
}
export declare class ProductService {
    private readonly productsRepository;
    private readonly priceCalculatorService;
    constructor(productsRepository: ProductsRepository, priceCalculatorService: PriceCalculatorService);
    create(createProductDto: CreateProductDto, userId: string): Promise<import("./entities/product.entity").Product>;
    findAll(filters?: FindAllFilters): Promise<import("./entities/product.entity").Product[] | Record<string, import("./entities/product.entity").Product[]>>;
    findOne(id: string): Promise<import("./entities/product.entity").Product>;
    findByCategory(categorySlug: string): Promise<import("./entities/product.entity").Product[]>;
    getCategories(): Promise<string[]>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<import("./entities/product.entity").Product>;
    remove(id: string): Promise<void>;
    calculatePrices(calculatePricesDto: CalculatePricesDto): Promise<import("./dto/calculate-prices.dto").CalculatedPricesResponseDto>;
    bulkCreate(createProductsDto: CreateProductDto[], userId: string): Promise<{
        total: number;
        successful: number;
        failed: number;
        results: any[];
    }>;
    syncFromGoogleSheets(userId: string): Promise<{
        message: string;
        status: string;
    }>;
    seedFromFrontendData(userId: string): Promise<{
        message: string;
        total: number;
        successful: number;
        failed: number;
        results: any[];
    }>;
}
export {};
