import { BadRequestException } from "@nestjs/common";

export interface UpdateCatalogCrmSkuBody {
  crmSku: string | null;
  expectedRevision: number;
}

/** Trim only; CRM identifiers are case-sensitive and are never slugified. */
export function normalizeCrmSku(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new BadRequestException("SKU do CRM deve ser texto ou null.");
  }
  const sku = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(sku)) {
    throw new BadRequestException(
      "SKU do CRM deve ter 1 a 160 caracteres ASCII, começar com letra ou número e conter apenas letras, números, ponto, _ ou -.",
    );
  }
  return sku;
}

export function parseUpdateCatalogCrmSkuBody(
  value: unknown,
): UpdateCatalogCrmSkuBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException("Informe crmSku e expectedRevision.");
  }
  const body = value as Record<string, unknown>;
  const keys = Object.keys(body);
  if (
    keys.length !== 2 ||
    !Object.prototype.hasOwnProperty.call(body, "crmSku") ||
    !Object.prototype.hasOwnProperty.call(body, "expectedRevision")
  ) {
    throw new BadRequestException(
      "Corpo deve conter somente crmSku e expectedRevision.",
    );
  }
  if (
    !Number.isSafeInteger(body.expectedRevision) ||
    (body.expectedRevision as number) < 0
  ) {
    throw new BadRequestException(
      "expectedRevision deve ser inteiro >= 0 válido.",
    );
  }
  return {
    crmSku: normalizeCrmSku(body.crmSku),
    expectedRevision: body.expectedRevision as number,
  };
}

export function catalogCrmSkuResponse(variant: {
  id: string;
  crmSku: string | null;
  crmSkuRevision: number;
}) {
  return {
    id: variant.id,
    crmSku: variant.crmSku,
    crmSkuRevision: variant.crmSkuRevision,
    crmMappingStatus:
      variant.crmSku === null ? ("pending" as const) : ("configured" as const),
  };
}

/** Whitelist: internal crmProductId must never be serialized to the browser. */
export const CATALOG_ADMIN_VARIANT_SELECT = {
  id: true,
  productGroupId: true,
  storage: true,
  color: true,
  originalPrice: true,
  installmentPrice: true,
  pixPrice: true,
  isActive: true,
  crmSku: true,
  crmSkuRevision: true,
  createdAt: true,
  updatedAt: true,
} as const;
