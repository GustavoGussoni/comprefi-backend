import type { CatalogItem, SheetCatalog } from "../sale-sheet.types";

/** Narrow read port: the adapter never writes catalog data or calls the CRM. */
export type CentralCatalogVariant = {
  id: string;
  storage: string;
  color: string;
  isActive: boolean;
  crmSku: string | null;
  crmProductId: string | null;
  productGroup: {
    slug: string;
    model: string;
    category: string;
    isActive: boolean;
  };
};

export const CENTRAL_CATALOG_QUERY = {
  where: { isActive: true, productGroup: { is: { isActive: true } } },
  select: {
    id: true,
    storage: true,
    color: true,
    isActive: true,
    crmSku: true,
    crmProductId: true,
    productGroup: {
      select: { slug: true, model: true, category: true, isActive: true },
    },
  },
  orderBy: [{ productGroup: { sortOrder: "asc" } }, { id: "asc" }],
} as const;

export interface CentralCatalogReader {
  productVariant: {
    findMany(
      query: typeof CENTRAL_CATALOG_QUERY,
    ): Promise<CentralCatalogVariant[]>;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  "iphones-novos": "iPhones Novos",
  "iphones-seminovos": "iPhones Seminovos",
  macbooks: "MacBooks",
  ipads: "iPads",
  "apple-watch": "Apple Watch",
  acessorios: "Acessórios",
};

/**
 * Reads current SKU on EVERY list/create. A selected item is copied by
 * SaleSheetService into the sheet snapshot; later catalog edits cannot rewrite it.
 * Optional visual hints supply only images for already-known exact variant IDs.
 * This adapter deliberately has no fallback to product-mapping.snapshot.json.
 */
export class CentralSheetCatalog implements SheetCatalog {
  private readonly images: ReadonlyMap<string, string>;

  constructor(
    private readonly reader: CentralCatalogReader,
    visuals: ReadonlyArray<Pick<CatalogItem, "id" | "image">> = [],
  ) {
    this.images = new Map(visuals.map((item) => [item.id, item.image]));
  }

  async list(): Promise<CatalogItem[]> {
    const variants = await this.reader.productVariant.findMany(
      CENTRAL_CATALOG_QUERY,
    );
    return variants
      .filter((variant) => variant.isActive && variant.productGroup.isActive)
      .map((variant) => {
        const group = variant.productGroup;
        const sku = variant.crmSku;
        // Invalid/unconfigured DB data is pending; never invent a SKU from a slug.
        const configured =
          typeof sku === "string" &&
          /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(sku);
        return {
          id: variant.id,
          groupSlug: group.slug,
          model: group.model,
          product: group.model,
          storage: variant.storage,
          color: variant.color,
          category: CATEGORY_LABELS[group.category] || group.category,
          condition:
            group.category === "iphones-seminovos"
              ? "Seminovo"
              : group.category === "iphones-novos"
                ? "Novo e lacrado"
                : "",
          // A unit's real photograph is not supplied by a generic variant image.
          image:
            group.category === "iphones-seminovos"
              ? ""
              : this.images.get(variant.id) || "",
          crmMappingStatus: configured
            ? ("confirmed" as const)
            : ("pending" as const),
          ...(configured
            ? {
                crmSku: sku,
                ...(variant.crmProductId
                  ? { crmProductId: variant.crmProductId }
                  : {}),
              }
            : {}),
        };
      });
  }
}
