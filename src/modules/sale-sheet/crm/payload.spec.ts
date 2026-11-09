import { demoSeller } from "../contract/seller";
import { ConflictException } from "@nestjs/common";
import { buildCrmPayload, CRM_PAYLOAD_VERSION } from "./payload";
import { fictitiousSheet, fictitiousSkuSheet } from "../contract/fixtures";
import { buildContractDocument } from "../contract/template";

describe("Payload CRM compacto por SKU — sem transporte externo", () => {
  it("envia somente SKU e quantidade nos itens, sem 20 slots ou descrições repetidas", () => {
    const sheet = fictitiousSkuSheet(),
      p = buildCrmPayload(sheet);
    expect(p.versaoPayload).toBe(CRM_PAYLOAD_VERSION);
    expect(p.produtos).toEqual([
      { sku: "iphone-18-pro-1tb-bordo", quantidade: 1 },
      { sku: "iphone-18-pro-max-1tb-bordo", quantidade: 2 },
    ]);
    expect(p.quantidadeItens).toBe(2);
    expect(p.quantidadeUnidades).toBe(3);
    expect(Object.keys(p).filter((k) => /^produto\d/.test(k))).toEqual([]);
    expect(p).not.toHaveProperty("resumoProdutos");
    expect(JSON.stringify(p)).not.toContain("cmuy7o");
    expect(JSON.stringify(p)).not.toContain(sheet.items[0].crmProductId!);
  });
  it("mantém WhatsApp do atendimento separado do celular e não abate a troca novamente", () => {
    const sheet = fictitiousSkuSheet();
    sheet.whatsapp = "00911111111";
    const p = buildCrmPayload(sheet);
    expect(p.whatsapp).toBe("00911111111");
    expect(p.celularCadastro).toBe(sheet.customer!.phone);
    expect(p.totalFinanceiro).toBe(19300);
    expect(p.valorVoltaBase).toBe(18700);
    expect(p.creditoTroca).toBe(9500);
    expect(p.acrescimoCartao).toBe(600);
    expect(p.valorParcelaCartao).toBe(1550);
  });
  it("SKU mantém exatamente capitalização e hífens cadastrados, sem recalcular pelo nome", () => {
    const sheet = fictitiousSkuSheet();
    sheet.items[0].crmSku = "iPhone-Pro-256G-Prata-256g";
    expect(
      (buildCrmPayload(sheet).produtos as Array<{ sku: string }>)[0].sku,
    ).toBe("iPhone-Pro-256G-Prata-256g");
  });
  it("bloqueia apenas a preparação CRM quando há item manual, antigo ou mapeamento incompleto", () => {
    for (const fields of [
      { crmSku: undefined },
      { crmSku: "SKU com espaços" },
      { crmMappingStatus: undefined },
      { crmMappingStatus: "pending" as const },
      { crmMappingStatus: "manual" as const },
    ]) {
      const sheet = fictitiousSkuSheet();
      Object.assign(sheet.items[1], fields);
      expect(() => buildCrmPayload(sheet)).toThrow(ConflictException);
      try {
        buildCrmPayload(sheet);
      } catch (e) {
        const response = (e as ConflictException).getResponse();
        expect(response).toMatchObject({
          code: "CRM_PRODUCT_MAPPING_PENDING",
          pendingItemNumbers: [2],
        });
      }
      expect(
        buildContractDocument(sheet, demoSeller).blocks.some((b) =>
          b.text.includes("iPhone 18 Pro Max"),
        ),
      ).toBe(true);
    }
    expect(() => buildCrmPayload(fictitiousSheet())).toThrow(ConflictException);
  });
  it("usa o SKU central configurado mesmo sem ID interno do DataCrazy", () => {
    const sheet = fictitiousSkuSheet();
    delete sheet.items[0].crmProductId;
    expect(buildCrmPayload(sheet).produtos).toEqual([
      { sku: "iphone-18-pro-1tb-bordo", quantidade: 1 },
      { sku: "iphone-18-pro-max-1tb-bordo", quantidade: 2 },
    ]);
  });
  it("não depende do status do PDF nem insere arquivo, token ou dados do vendedor no payload", () => {
    const sheet = fictitiousSkuSheet();
    sheet.pdf = { status: "failed", attempts: 1 };
    const p = buildCrmPayload(sheet),
      text = JSON.stringify(p);
    expect(p.contratoStatus).toBe("failed");
    expect(p.contratoAssinado).toBe(false);
    expect(text).not.toContain(sheet.tokenHash);
    for (const k of [
      "sellerSnapshot",
      "contractFile",
      "contractSha256",
      "tokenHash",
      "urlPdf",
      "assinatura",
    ])
      expect(p).not.toHaveProperty(k);
  });
  it("falha do preparo não muda a ficha nem reduz os detalhes usados pelo contrato", () => {
    const sheet = fictitiousSkuSheet(),
      before = JSON.stringify(sheet);
    buildCrmPayload(sheet);
    expect(JSON.stringify(sheet)).toBe(before);
    const contract = buildContractDocument(sheet, demoSeller)
      .blocks.map((b) => b.text)
      .join("\n");
    expect(contract).toContain("iPhone 18 Pro Max");
    expect(contract).toContain("Bordô");
    expect(contract).toContain("1TB");
    expect(contract).toContain("2 unidade(s)");
  });
});
