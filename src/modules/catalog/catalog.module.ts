import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { PrismaService } from "../../database/prisma.service";
import { CatalogCrmSkuService } from "./catalog-crm-sku.service";
import { CurrentCatalogCrmAdminGuard } from "./current-catalog-crm-admin.guard";

@Module({
  controllers: [CatalogController],
  providers: [PrismaService, CatalogCrmSkuService, CurrentCatalogCrmAdminGuard],
})
export class CatalogModule {}
