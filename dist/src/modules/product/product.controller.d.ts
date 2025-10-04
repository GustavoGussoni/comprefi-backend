import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CalculatePricesDto } from './dto/calculate-prices.dto';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
    create(createProductDto: CreateProductDto, req: any): Promise<import("./entities/product.entity").Product>;
    findAll(category?: string, isNew?: boolean, isActive?: boolean, groupBy?: string): Promise<import("./entities/product.entity").Product[] | Record<string, import("./entities/product.entity").Product[]>>;
    getCategories(): Promise<string[]>;
    findByCategory(categorySlug: string): Promise<import("./entities/product.entity").Product[]>;
    findOne(id: string): Promise<import("./entities/product.entity").Product>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<import("./entities/product.entity").Product>;
    remove(id: string): Promise<void>;
    calculatePrices(calculatePricesDto: CalculatePricesDto): Promise<import("./dto/calculate-prices.dto").CalculatedPricesResponseDto>;
    bulkCreate(createProductsDto: CreateProductDto[], req: any): Promise<{
        total: number;
        successful: number;
        failed: number;
        results: any[];
    }>;
    syncFromSheet(req: any): Promise<{
        message: string;
        status: string;
    }>;
}
