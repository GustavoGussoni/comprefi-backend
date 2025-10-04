import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductsRepository } from './repositories/product.repository';
import { ProductsPrismaRepository } from './repositories/prisma/product-prisma.repository';
import { PriceCalculatorService } from './services/price-calculator.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    PriceCalculatorService,
    PrismaService,
    {
      provide: ProductsRepository,
      useClass: ProductsPrismaRepository,
    },
  ],
  exports: [ProductService, PriceCalculatorService],
})
export class ProductModule {}

