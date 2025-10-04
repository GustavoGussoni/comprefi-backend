import { Injectable } from "@nestjs/common";
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

@Injectable()
export class ProductsPrismaRepository implements ProductsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateProductDto, userId: string): Promise<Product> {
    const product = new Product();
    Object.assign(product, { ...data, userId });

    const newProduct = await this.prisma.product.create({
      data: {
        id: product.id,
        model: product.model,
        storage: product.storage,
        color: product.color,
        battery: product.battery,
        originalPrice: product.originalPrice,
        installmentPrice: product.installmentPrice,
        pixPrice: product.pixPrice,
        details: product.details,
        image: product.image,
        realImages: product.realImages || [],
        category: product.category,
        specs: product.specs,
        cost: product.cost,
        freight: product.freight,
        isActive: product.isActive ?? true,
        isNew: product.isNew ?? true,
        userId,
      },
    });

    return newProduct as Product;
  }

  async findOne(id: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return product as Product | null;
  }

  async findAll(
    filters: FindAllFilters = {}
  ): Promise<Product[] | Record<string, Product[]>> {
    const { category, isNew, isActive, groupBy } = filters;

    const whereClause: any = {};

    if (category) {
      whereClause.category = category;
    }

    if (typeof isNew === "boolean") {
      whereClause.isNew = isNew;
    }

    if (typeof isActive === "boolean") {
      whereClause.isActive = isActive;
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ category: "asc" }, { model: "asc" }],
    });

    if (groupBy) {
      return this.groupBy(products as Product[], groupBy);
    }

    return products as Product[];
  }

  async findByCategory(categorySlug: string): Promise<Product[]> {
    // Converte slug para nome da categoria
    const categoryName = this.slugToCategory(categorySlug);

    const products = await this.prisma.product.findMany({
      where: {
        category: categoryName,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ model: "asc" }, { storage: "asc" }],
    });

    return products as Product[];
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        category: true,
      },
      distinct: ["category"],
    });

    return categories.map((c) => c.category);
  }

  async update(data: UpdateProductDto, productId: string): Promise<Product> {
    const updateData: any = { ...data };

    // Remove campos undefined
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return product as Product;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }

  private groupBy(products: Product[], key: string): Record<string, Product[]> {
    return products.reduce(
      (acc, cur) => {
        const groupKey = (cur as any)[key];
        (acc[groupKey] = acc[groupKey] || []).push(cur);
        return acc;
      },
      {} as Record<string, Product[]>
    );
  }

  private slugToCategory(slug: string): string {
    const slugToCategoryMap: Record<string, string> = {
      "iphones-seminovos": "iPhones Seminovos",
      "iphones-novos": "iPhones Novos",
      macbooks: "Macbooks",
      ipads: "iPads",
      "apple-watch": "Apple Watch",
      acessorios: "Acessórios",
    };

    return slugToCategoryMap[slug] || slug;
  }

  private categoryToSlug(category: string): string {
    const categoryToSlugMap: Record<string, string> = {
      "iPhones Seminovos": "iphones-seminovos",
      "iPhones Novos": "iphones-novos",
      Macbooks: "macbooks",
      iPads: "ipads",
      "Apple Watch": "apple-watch",
      Acessórios: "acessorios",
    };

    return (
      categoryToSlugMap[category] || category.toLowerCase().replace(/\s+/g, "-")
    );
  }
}
