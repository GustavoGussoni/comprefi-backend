import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  catalogCrmSkuResponse,
  parseUpdateCatalogCrmSkuBody,
} from "./catalog-crm-sku.contract";

@Injectable()
export class CatalogCrmSkuService {
  constructor(private readonly prisma: PrismaService) {}

  async update(id: string, rawBody: unknown) {
    const body = parseUpdateCatalogCrmSkuBody(rawBody);
    const current = await this.prisma.productVariant.findUnique({
      where: { id },
      select: { id: true, crmSku: true, crmSkuRevision: true },
    });
    if (!current) throw new NotFoundException("Variante não encontrada.");
    if (current.crmSkuRevision !== body.expectedRevision) {
      throw this.revisionConflict();
    }
    // A read is the linearization point of an idempotent request. Do not erase
    // imported CRM product IDs or increment revision when the SKU is unchanged.
    if (current.crmSku === body.crmSku) return catalogCrmSkuResponse(current);

    try {
      const result = await this.prisma.productVariant.updateMany({
        where: { id, crmSkuRevision: body.expectedRevision },
        data: {
          crmSku: body.crmSku,
          crmProductId: null,
          crmSkuRevision: { increment: 1 },
        },
      });
      if (result.count !== 1) throw this.revisionConflict();
      return catalogCrmSkuResponse({
        id,
        crmSku: body.crmSku,
        crmSkuRevision: current.crmSkuRevision + 1,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Este SKU do CRM já está associado a outra variante.",
        );
      }
      throw error;
    }
  }

  private revisionConflict() {
    return new ConflictException(
      "SKU alterado por outra operação. Recarregue o catálogo e tente novamente.",
    );
  }
}
