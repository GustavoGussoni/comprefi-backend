"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModule = void 0;
const common_1 = require("@nestjs/common");
const product_service_1 = require("./product.service");
const product_controller_1 = require("./product.controller");
const product_repository_1 = require("./repositories/product.repository");
const product_prisma_repository_1 = require("./repositories/prisma/product-prisma.repository");
const price_calculator_service_1 = require("./services/price-calculator.service");
const prisma_service_1 = require("../../database/prisma.service");
let ProductModule = class ProductModule {
};
exports.ProductModule = ProductModule;
exports.ProductModule = ProductModule = __decorate([
    (0, common_1.Module)({
        controllers: [product_controller_1.ProductController],
        providers: [
            product_service_1.ProductService,
            price_calculator_service_1.PriceCalculatorService,
            prisma_service_1.PrismaService,
            {
                provide: product_repository_1.ProductsRepository,
                useClass: product_prisma_repository_1.ProductsPrismaRepository,
            },
        ],
        exports: [product_service_1.ProductService, price_calculator_service_1.PriceCalculatorService],
    })
], ProductModule);
//# sourceMappingURL=product.module.js.map