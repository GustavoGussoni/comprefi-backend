import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Product } from '../entities/product.entity';

interface FindAllFilters {
  category?: string;
  isNew?: boolean;
  isActive?: boolean;
  groupBy?: string;
}

export abstract class ProductsRepository {
  abstract create(data: CreateProductDto, userId: string): Promise<Product>;
  abstract findOne(id: string): Promise<Product | null>;
  abstract findAll(filters?: FindAllFilters): Promise<Product[] | Record<string, Product[]>>;
  abstract findByCategory(categorySlug: string): Promise<Product[]>;
  abstract getCategories(): Promise<string[]>;
  abstract update(data: UpdateProductDto, productId: string): Promise<Product>;
  abstract delete(id: string): Promise<void>;
}

