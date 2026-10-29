import { Module } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { CurrentUsedStockUserGuard } from "./current-used-stock-user.guard";
import { UsedStockController } from "./used-stock.controller";
import { UsedStockService } from "./used-stock.service";

@Module({
  imports: [AuthModule],
  controllers: [UsedStockController],
  providers: [PrismaService, UsedStockService, CurrentUsedStockUserGuard],
})
export class UsedStockModule {}
