import { Module } from "@nestjs/common";
import { TradeController } from "./trade.controller";
import { ValorTrocaController } from "./valor-troca.controller";
import { QuestionarioController } from "./questionario.controller";
import { TradeCalculatorService } from "./services/trade-calculator.service";
import { PrismaService } from "../../database/prisma.service";
import { AdminIdentityGuard } from "../auth/admin-identity.guard";

@Module({
  controllers: [TradeController, ValorTrocaController, QuestionarioController],
  providers: [TradeCalculatorService, PrismaService, AdminIdentityGuard],
  exports: [TradeCalculatorService],
})
export class TradeModule {}
