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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const common_1 = require("@nestjs/common");
const product_service_1 = require("./product.service");
const create_product_dto_1 = require("./dto/create-product.dto");
const update_product_dto_1 = require("./dto/update-product.dto");
const calculate_prices_dto_1 = require("./dto/calculate-prices.dto");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let ProductController = class ProductController {
    constructor(productService) {
        this.productService = productService;
    }
    create(createProductDto, req) {
        return this.productService.create(createProductDto, req.user.id);
    }
    findAll(category, isNew, isActive, groupBy) {
        return this.productService.findAll({
            category,
            isNew,
            isActive,
            groupBy,
        });
    }
    getCategories() {
        return this.productService.getCategories();
    }
    findByCategory(categorySlug) {
        return this.productService.findByCategory(categorySlug);
    }
    findOne(id) {
        return this.productService.findOne(id);
    }
    update(id, updateProductDto) {
        return this.productService.update(id, updateProductDto);
    }
    remove(id) {
        return this.productService.remove(id);
    }
    calculatePrices(calculatePricesDto) {
        return this.productService.calculatePrices(calculatePricesDto);
    }
    bulkCreate(createProductsDto, req) {
        return this.productService.bulkCreate(createProductsDto, req.user.id);
    }
    syncFromSheet(req) {
        return this.productService.syncFromGoogleSheets(req.user.id);
    }
};
exports.ProductController = ProductController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Criar um novo produto' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Produto criado com sucesso' }),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_product_dto_1.CreateProductDto, Object]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todos os produtos' }),
    (0, swagger_1.ApiQuery)({
        name: 'category',
        type: String,
        required: false,
        description: 'Filtrar por categoria',
        example: 'iPhones Seminovos',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'isNew',
        type: Boolean,
        required: false,
        description: 'Filtrar por produtos novos (true) ou seminovos (false)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'isActive',
        type: Boolean,
        required: false,
        description: 'Filtrar por produtos ativos',
        example: true,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'groupBy',
        type: String,
        required: false,
        description: 'Agrupar resultados por campo específico',
        example: 'category',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de produtos retornada com sucesso' }),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('isNew')),
    __param(2, (0, common_1.Query)('isActive')),
    __param(3, (0, common_1.Query)('groupBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Boolean, String]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todas as categorias disponíveis' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de categorias retornada com sucesso' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('by-category/:categorySlug'),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar produtos por slug da categoria' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Produtos da categoria retornados com sucesso' }),
    __param(0, (0, common_1.Param)('categorySlug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "findByCategory", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar produto por ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Produto encontrado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Produto não encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar um produto' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Produto atualizado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Produto não encontrado' }),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Deletar um produto' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Produto deletado com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Produto não encontrado' }),
    (0, common_1.HttpCode)(204),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('calculate-prices'),
    (0, swagger_1.ApiOperation)({ summary: 'Calcular preços baseado no custo' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Preços calculados com sucesso' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculate_prices_dto_1.CalculatePricesDto]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "calculatePrices", null);
__decorate([
    (0, common_1.Post)('bulk-create'),
    (0, swagger_1.ApiOperation)({ summary: 'Criar múltiplos produtos em lote' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Produtos criados com sucesso' }),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Post)('sync-from-sheet'),
    (0, swagger_1.ApiOperation)({ summary: 'Sincronizar produtos a partir de planilha Google Sheets' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Sincronização realizada com sucesso' }),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "syncFromSheet", null);
exports.ProductController = ProductController = __decorate([
    (0, swagger_1.ApiTags)('Products'),
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [product_service_1.ProductService])
], ProductController);
//# sourceMappingURL=product.controller.js.map