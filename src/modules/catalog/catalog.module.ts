import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [CatalogController],
  providers: [PrismaService],
})
export class CatalogModule {}
