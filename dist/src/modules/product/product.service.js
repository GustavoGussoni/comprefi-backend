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
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const product_repository_1 = require("./repositories/product.repository");
const price_calculator_service_1 = require("./services/price-calculator.service");
let ProductService = class ProductService {
    constructor(productsRepository, priceCalculatorService) {
        this.productsRepository = productsRepository;
        this.priceCalculatorService = priceCalculatorService;
    }
    async create(createProductDto, userId) {
        if (createProductDto.cost) {
            const calculatedPrices = await this.priceCalculatorService.calculateProductPrices(createProductDto.cost, createProductDto.freight || 100);
            if (!createProductDto.pixPrice) {
                createProductDto.pixPrice = calculatedPrices.pixPrice;
            }
            if (!createProductDto.installmentPrice) {
                createProductDto.installmentPrice = calculatedPrices.installmentPrice;
            }
            if (!createProductDto.originalPrice) {
                createProductDto.originalPrice = calculatedPrices.originalPrice;
            }
        }
        return this.productsRepository.create(createProductDto, userId);
    }
    async findAll(filters = {}) {
        return this.productsRepository.findAll(filters);
    }
    async findOne(id) {
        const product = await this.productsRepository.findOne(id);
        if (!product) {
            throw new common_1.NotFoundException('Produto não encontrado!');
        }
        return product;
    }
    async findByCategory(categorySlug) {
        return this.productsRepository.findByCategory(categorySlug);
    }
    async getCategories() {
        return this.productsRepository.getCategories();
    }
    async update(id, updateProductDto) {
        const existingProduct = await this.productsRepository.findOne(id);
        if (!existingProduct) {
            throw new common_1.NotFoundException('Produto não encontrado!');
        }
        if (updateProductDto.cost) {
            const calculatedPrices = await this.priceCalculatorService.calculateProductPrices(updateProductDto.cost, updateProductDto.freight || existingProduct.freight || 100);
            if (!updateProductDto.pixPrice) {
                updateProductDto.pixPrice = calculatedPrices.pixPrice;
            }
            if (!updateProductDto.installmentPrice) {
                updateProductDto.installmentPrice = calculatedPrices.installmentPrice;
            }
            if (!updateProductDto.originalPrice) {
                updateProductDto.originalPrice = calculatedPrices.originalPrice;
            }
        }
        return this.productsRepository.update(updateProductDto, id);
    }
    async remove(id) {
        const existingProduct = await this.productsRepository.findOne(id);
        if (!existingProduct) {
            throw new common_1.NotFoundException('Produto não encontrado!');
        }
        await this.productsRepository.delete(id);
    }
    async calculatePrices(calculatePricesDto) {
        return this.priceCalculatorService.calculatePrices(calculatePricesDto);
    }
    async bulkCreate(createProductsDto, userId) {
        const results = [];
        for (const productDto of createProductsDto) {
            try {
                const product = await this.create(productDto, userId);
                results.push({ success: true, product });
            }
            catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    productData: productDto
                });
            }
        }
        return {
            total: createProductsDto.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        };
    }
    async syncFromGoogleSheets(userId) {
        return {
            message: 'Funcionalidade de sincronização com Google Sheets em desenvolvimento',
            status: 'pending_implementation',
        };
    }
    async seedFromFrontendData(userId) {
        const frontendProducts = [
            {
                model: "iPhone 15 Pro Max",
                storage: "256GB",
                color: "Titânio Natural",
                battery: "89%",
                originalPrice: "R$ 6.590,00",
                installmentPrice: "R$ 540,67",
                pixPrice: "R$ 5.690",
                details: "sem detalhes | garantia Apple até junho",
                category: "iPhones Seminovos",
                specs: 'Tela Super Retina XDR de 6,7", chip A17 Pro, câmera tripla de 48MP, 256GB de armazenamento',
                isNew: false,
                realImages: [],
            },
            {
                model: "iPhone 16 Pro Max",
                storage: "(1TB)",
                color: "Titânio Preto, Titânio Cinza/Natural, Titânio Branco, Titânio Deserto",
                battery: "100%",
                originalPrice: "R$ 14445.35",
                installmentPrice: "R$ 1160",
                pixPrice: "R$ 12.039",
                details: "aparelho novo",
                category: "iPhones Novos",
                specs: 'Tela ~6.9", Chip A18 Pro, Câmera Ultra Wide 48MP, Zoom Óptico 5x, Wi-Fi 7, Botão de Captura, Bateria ~4676 mAh (Rumor)',
                isNew: true,
                realImages: [],
            },
        ];
        const results = [];
        for (const productData of frontendProducts) {
            try {
                const product = await this.create(productData, userId);
                results.push({ success: true, product });
            }
            catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    productData
                });
            }
        }
        return {
            message: 'Seed de dados do frontend executado',
            total: frontendProducts.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        };
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [product_repository_1.ProductsRepository,
        price_calculator_service_1.PriceCalculatorService])
], ProductService);
//# sourceMappingURL=product.service.js.map