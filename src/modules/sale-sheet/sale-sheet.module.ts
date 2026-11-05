import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { PrismaService } from "../../database/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { CentralSheetCatalog } from "./catalog/central-catalog";
import { resolveContractConfiguration } from "./contract/config";
import { ContractPdfRenderer } from "./contract/renderer";
import { createCrmDeliveryTransport } from "./crm/delivery";
import { CurrentSheetUserGuard } from "./current-sheet-user.guard";
import { PostgresSheetRepository } from "./postgres.repository";
import { SaleSheetController } from "./sale-sheet.controller";
import { SaleSheetService } from "./sale-sheet.service";
import {
  SHEET_CATALOG,
  SHEET_CRM_DELIVERY,
  SHEET_RENDERER,
  SHEET_REPOSITORY,
  SHEET_SELLER,
} from "./sale-sheet.types";
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SaleSheetController],
  providers: [
    SaleSheetService,
    CurrentSheetUserGuard,
    { provide: SHEET_REPOSITORY, useClass: PostgresSheetRepository },
    {
      provide: SHEET_CATALOG,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new CentralSheetCatalog({
          productVariant: {
            findMany: (query) =>
              prisma.productVariant.findMany({
                ...query,
                orderBy: [...query.orderBy],
              }),
          },
        }),
    },
    {
      provide: SHEET_RENDERER,
      useFactory: () =>
        new ContractPdfRenderer(resolveContractConfiguration().mode),
    },
    {
      provide: SHEET_SELLER,
      useFactory: () => resolveContractConfiguration().seller,
    },
    {
      provide: SHEET_CRM_DELIVERY,
      useFactory: () => createCrmDeliveryTransport(),
    },
  ],
  exports: [SaleSheetService],
})
export class SaleSheetModule {}
