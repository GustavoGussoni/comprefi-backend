import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { PrismaService } from "../../database/prisma.service";
import { AdminIdentityGuard } from "../auth/admin-identity.guard";

@Module({
  controllers: [CatalogController],
  providers: [PrismaService, AdminIdentityGuard],
})
export class CatalogModule {}
