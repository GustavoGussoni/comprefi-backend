import { PrismaService } from "../../../../database/prisma.service";
import { CreateProductDto } from "../../dto/create-product.dto";
import { UpdateProductDto } from "../../dto/update-product.dto";
import { Product } from "../../entities/product.entity";
import { ProductsRepository } from "../product.repository";
interface FindAllFilters {
    category?: string;
    isNew?: boolean;
    isActive?: boolean;
    groupBy?: string;
}
export declare class ProductsPrismaRepository implements ProductsRepository {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: CreateProductDto, userId: string): Promise<Product>;
    findOne(id: string): Promise<Product | null>;
    findAll(filters?: FindAllFilters): Promise<Product[] | Record<string, Product[]>>;
    findByCategory(categorySlug: string): Promise<Product[]>;
    getCategories(): Promise<string[]>;
    update(data: UpdateProductDto, productId: string): Promise<Product>;
    delete(id: string): Promise<void>;
    private groupBy;
    private slugToCategory;
    private categoryToSlug;
}
export {};
