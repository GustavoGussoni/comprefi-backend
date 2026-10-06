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
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
