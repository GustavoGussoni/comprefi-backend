"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsPrismaRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../database/prisma.service");
const product_entity_1 = require("../../entities/product.entity");
let ProductsPrismaRepository = class ProductsPrismaRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data, userId) {
        const product = new product_entity_1.Product();
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
        return newProduct;
    }
    async findOne(id) {
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
        return product;
    }
    async findAll(filters = {}) {
        const { category, isNew, isActive, groupBy } = filters;
        const whereClause = {};
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
            return this.groupBy(products, groupBy);
        }
        return products;
    }
    async findByCategory(categorySlug) {
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
        return products;
    }
    async getCategories() {
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
    async update(data, productId) {
        const updateData = { ...data };
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
        return product;
    }
    async delete(id) {
        await this.prisma.product.delete({ where: { id } });
    }
    groupBy(products, key) {
        return products.reduce((acc, cur) => {
            const groupKey = cur[key];
            (acc[groupKey] = acc[groupKey] || []).push(cur);
            return acc;
        }, {});
    }
    slugToCategory(slug) {
        const slugToCategoryMap = {
            "iphones-seminovos": "iPhones Seminovos",
            "iphones-novos": "iPhones Novos",
            macbooks: "Macbooks",
            ipads: "iPads",
            "apple-watch": "Apple Watch",
            acessorios: "Acessórios",
        };
        return slugToCategoryMap[slug] || slug;
    }
    categoryToSlug(category) {
        const categoryToSlugMap = {
            "iPhones Seminovos": "iphones-seminovos",
            "iPhones Novos": "iphones-novos",
            Macbooks: "macbooks",
            iPads: "ipads",
            "Apple Watch": "apple-watch",
            Acessórios: "acessorios",
        };
        return (categoryToSlugMap[category] || category.toLowerCase().replace(/\s+/g, "-"));
    }
};
exports.ProductsPrismaRepository = ProductsPrismaRepository;
exports.ProductsPrismaRepository = ProductsPrismaRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsPrismaRepository);
//# sourceMappingURL=product-prisma.repository.js.map