import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ProductModule } from "./modules/product/product.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaService } from "./database/prisma.service";
import { TradeModule } from "./modules/trade/trade.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { validateEnvironment } from "./config/env.validation";
import { UsedStockModule } from "./modules/used-stock/used-stock.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ProductModule,
    AuthModule,
    UsersModule,
    TradeModule,
    CatalogModule,
    UsedStockModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
