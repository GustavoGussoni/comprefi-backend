import { Module } from "@nestjs/common";
import { TradeController } from "./trade.controller";
import { TradeCalculatorService } from "./services/trade-calculator.service";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [TradeController],
  providers: [TradeCalculatorService, PrismaService],
  exports: [TradeCalculatorService],
})
export class TradeModule {}
