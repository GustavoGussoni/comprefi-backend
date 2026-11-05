import {
  CentralSheetCatalog,
  CENTRAL_CATALOG_QUERY,
  type CentralCatalogVariant,
} from "./central-catalog";
import { type SheetActor } from "../sale-sheet.types";
import { SaleSheetService } from "../sale-sheet.service";
import { UnitSheetRepository } from "../test-support";
import { DisabledCrmDeliveryTransport } from "../crm/delivery";
import { fictitiousSheet } from "../contract/fixtures";
import { demoSeller } from "../contract/seller";
function row(): CentralCatalogVariant {
  return {
    id: "variante-central-ficticia",
    storage: "256GB",
    color: "Prata",
    isActive: true,
    crmSku: "SKU-Central-256-Prata",
    crmProductId: null,
    productGroup: {
      slug: "iphone-central",
      model: "iPhone Central Fictício",
      category: "iphones-novos",
      isActive: true,
    },
  };
}
const actor: SheetActor = {
  id: "iago-ficticio",
  name: "Vendedor Fictício",
  email: "vendedor@example.test",
  role: "ADMIN",
};

function terms() {
  const fixture = fictitiousSheet();
  return {
    whatsapp: "00900000000",
    items: [
      {
        variantId: "variante-central-ficticia",
        groupSlug: "falso",
        product: "Forjado",
        storage: "128GB",
        color: "Azul",
        condition: "Novo e lacrado",
        quantity: 2,
      },
    ],
    base: fixture.base,
    payment: fixture.payment,
    pix: fixture.pix,
    card: fixture.card,
    installments: fixture.installments,
    hasTrade: fixture.hasTrade,
    tradeModel: fixture.tradeModel,
    tradeStorage: fixture.tradeStorage,
    tradeColor: fixture.tradeColor,
    credit: fixture.credit,
    imei: fixture.imei,
    tradeNotes: fixture.tradeNotes,
    delivery: "standard",
    deadline: "",
    deliveryMode: fixture.deliveryMode,
    notes: fixture.notes,
  };
}

describe("SKU central para nova ficha — sem banco existente ou transporte externo", () => {
  it("lê a referência central em cada consulta e não reaproveita o snapshot CRM antigo", async () => {
    const current = row();
    const findMany = jest.fn(async () => [structuredClone(current)]);
    const adapter = new CentralSheetCatalog({ productVariant: { findMany } }, [
      { id: current.id, image: "/assets/ficticio.jpg" },
    ]);
    expect((await adapter.list())[0]).toMatchObject({
      crmSku: "SKU-Central-256-Prata",
      crmMappingStatus: "confirmed",
      image: "/assets/ficticio.jpg",
    });
    current.crmSku = "SKU-Atualizado";
    expect((await adapter.list())[0].crmSku).toBe("SKU-Atualizado");
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenCalledWith(CENTRAL_CATALOG_QUERY);
    const text = JSON.stringify(await adapter.list());
    for (const field of ["pixPrice", "cost", "internalNotes", "imei"])
      expect(text).not.toContain(field);
  });

  it("campo vazio/inválido é pendente, inativos não entram e seminovo não usa foto genérica como real", async () => {
    const missing = { ...row(), crmSku: null };
    const invalid = { ...row(), id: "invalida", crmSku: "SKU inválido" };
    const inactive = { ...row(), id: "inativa", isActive: false };
    const groupInactive = {
      ...row(),
      id: "grupo-inativo",
      productGroup: { ...row().productGroup, isActive: false },
    };
    const used = {
      ...row(),
      id: "usado",
      productGroup: { ...row().productGroup, category: "iphones-seminovos" },
    };
    const adapter = new CentralSheetCatalog(
      {
        productVariant: {
          findMany: async () => [
            missing,
            invalid,
            inactive,
            groupInactive,
            used,
          ],
        },
      },
      [{ id: "usado", image: "/assets/foto-outro-aparelho.jpg" }],
    );
    const list = await adapter.list();
    expect(list).toHaveLength(3);
    expect(list[0]).toMatchObject({ crmMappingStatus: "pending" });
    expect(list[0]).not.toHaveProperty("crmSku");
    expect(list[1]).not.toHaveProperty("crmSku");
    expect(list[2]).toMatchObject({
      condition: "Seminovo",
      image: "",
      crmSku: row().crmSku,
    });
  });

  it("alterar SKU só afeta fichas novas, não payload/PDF/revisão de ficha criada ou submetida", async () => {
    const current = row();
    const catalog = new CentralSheetCatalog({
      productVariant: { findMany: async () => [structuredClone(current)] },
    });
    const repository = new UnitSheetRepository();
    const renderer = {
      version: "teste-central-v1",
      render: jest.fn(async () => Buffer.from("%PDF-ficticio-estavel")),
    };
    const service = new SaleSheetService(
      repository,
      catalog,
      renderer,
      demoSeller,
      new DisabledCrmDeliveryTransport(),
    );
    const first = await service.create(actor, terms(), "chave-create-00001");
    expect(first.sheet.items[0]).toMatchObject({
      product: current.productGroup.model,
      color: "Prata",
      storage: "256GB",
      crmSku: current.crmSku,
    });
    expect(first.sheet.items[0]).not.toHaveProperty("crmProductId");
    current.crmSku = "SKU-Central-NOVO";
    const fixture = fictitiousSheet();
    await service.submitPublic(first.token, "chave-central-catalogo-00001", {
      customer: fixture.customer!,
      accepted: true,
    });
    expect(
      (
        (await service.crmPayload(actor, first.sheet.id)) as {
          produtos: unknown;
        }
      ).produtos,
    ).toEqual([{ sku: "SKU-Central-256-Prata", quantidade: 2 }]);
    const snapshot = await service.getAdmin(actor, first.sheet.id);
    const pdf = await service.getContract(actor, first.sheet.id);
    const second = await service.create(actor, terms(), "chave-create-00002");
    expect(second.sheet.items[0].crmSku).toBe("SKU-Central-NOVO");
    current.crmSku = null;
    const pending = await service.create(actor, terms(), "chave-create-00003");
    expect(pending.sheet.items[0].crmMappingStatus).toBe("pending");
    expect(await service.getAdmin(actor, first.sheet.id)).toEqual(snapshot);
    expect((await service.getContract(actor, first.sheet.id)).buffer).toEqual(
      pdf.buffer,
    );
    expect((await repository.get(first.sheet.id))?.crm.attempts).toBe(0);
    expect(renderer.render).toHaveBeenCalledTimes(1);
  });
});
