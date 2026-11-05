import { ContractPdfRenderer } from "./renderer";
import {
  buildContractDocument,
  commercialContractTemplateVersion,
} from "./template";
import { fictitiousSheet, fictitiousSkuSheet } from "./fixtures";
import { demoSeller } from "./seller";
import { buildCrmPayload } from "../crm/payload";
import { resolveContractConfiguration } from "./config";

describe("Contrato versionado da ficha — preparação real", () => {
  it("preenche 13 cláusulas, comprador, complemento, itens e volta sem copiar assinatura", () => {
    const d = buildContractDocument(fictitiousSheet(), demoSeller);
    const text = d.blocks.map((b) => b.text).join("\n");
    for (let n = 1; n <= 13; n++) expect(text).toContain(`Cláusula ${n}ª.`);
    for (const value of [
      "Cliente Demonstração",
      "111.444.777-35",
      "Apartamento de Teste",
      "Item 2: 2 unidade(s)",
      "6 (seis) meses",
      "1 (um) a 15 (quinze) dias úteis",
      "totalidade",
      "R$ 19.300,00",
      "R$ 9.500,00",
      "não será descontado novamente",
    ])
      expect(text).toContain(value);
    expect(text).not.toContain("120 dias");
    expect(text).not.toContain("Documento assinado digitalmente");
    expect(d.placeDate).toContain("27 de outubro de 2026");
  });
  it("data manual substitui o prazo padrão", () => {
    const d = buildContractDocument(
      { ...fictitiousSheet(), delivery: "date", deadline: "2026-11-05" },
      demoSeller,
    );
    const text = d.blocks.find((b) => b.text.startsWith("Cláusula 2ª."))!.text;
    expect(text).toContain("05/11/2026");
    expect(text).toContain("quinta-feira");
    expect(text).not.toContain("15 (quinze)");
  });
  it("PIX, cartão e misto não abatem crédito uma segunda vez", () => {
    for (const s of [
      { ...fictitiousSheet(), payment: "pix" as const, pix: 18700, card: 0 },
      { ...fictitiousSheet(), payment: "card" as const, pix: 0, card: 19300 },
      fictitiousSheet(),
    ]) {
      const text = buildContractDocument(s, demoSeller).blocks.find((b) =>
        b.text.startsWith("Cláusula 8ª."),
      )!.text;
      expect(text.includes("PIX:")).toBe(s.pix > 0);
      expect(text.includes("cartão:")).toBe(s.card > 0);
      expect(text).toContain(
        new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(s.pix + s.card),
      );
    }
  });
  it("ajuste de centavos fecha o total financeiro negociado", () => {
    const text = buildContractDocument(
      { ...fictitiousSheet(), card: 9300.01 },
      demoSeller,
    ).blocks.find((b) => b.text.startsWith("Cláusula 8ª."))!.text;
    expect(text).toContain("R$ 1.550,01");
    expect(text).toContain("ajuste de centavos");
  });
  it("mesma versão produz bytes determinísticos", async () => {
    const renderer = new ContractPdfRenderer();
    const sheet = fictitiousSheet();
    const a = await renderer.render(sheet, demoSeller),
      b = await renderer.render(sheet, demoSeller);
    expect(a.subarray(0, 5).toString()).toBe("%PDF-");
    expect(a.equals(b)).toBe(true);
    expect(sheet.contractIssuedAt).toBe("2026-10-27T20:00:00.000Z");
  });
  it("trocar a configuração atual não reinterpreta a versão congelada", async () => {
    const sheet = fictitiousSheet();
    const a = await new ContractPdfRenderer().render(sheet, demoSeller);
    const b = await new ContractPdfRenderer("commercial").render(
      sheet,
      demoSeller,
    );
    expect(a.equals(b)).toBe(true);
    expect(new ContractPdfRenderer("commercial").version).toBe(
      commercialContractTemplateVersion,
    );
  });
  it("rejeita template desconhecido", () => {
    expect(() =>
      buildContractDocument(
        { ...fictitiousSheet(), contractTemplateVersion: "outro-modelo" },
        demoSeller,
      ),
    ).toThrow("Versão");
  });
  it("payload compacto não expõe token nem URL pública de PDF", () => {
    const s = fictitiousSkuSheet(),
      p = buildCrmPayload(s);
    expect(p.produtos).toEqual([
      { sku: "iphone-18-pro-1tb-bordo", quantidade: 1 },
      { sku: "iphone-18-pro-max-1tb-bordo", quantidade: 2 },
    ]);
    expect(p.whatsapp).toBe(s.whatsapp);
    expect(p.celularCadastro).toBe(s.customer!.phone);
    expect(p.totalFinanceiro).toBe(19300);
    expect(p.creditoTroca).toBe(9500);
    expect(p.contratoAssinado).toBe(false);
    const text = JSON.stringify(p);
    for (const value of [
      s.tokenHash,
      "sellerSnapshot",
      "representativeAddress",
      "token=",
    ])
      expect(text).not.toContain(value);
    expect(p).not.toHaveProperty("produto20Modelo");
  });
  it("modo demonstrativo não precisa nem utiliza identidade real", () => {
    expect(
      resolveContractConfiguration({ FICHA_SELLER_IDENTITY_JSON: "not-json" }),
    ).toEqual({ mode: "demonstration", seller: demoSeller });
  });
  it("comercial sem aprovação ou identidade configurada fica bloqueado", () => {
    expect(() =>
      resolveContractConfiguration({ FICHA_CONTRACT_MODE: "commercial" }),
    ).toThrow("aprovação");
    expect(() =>
      resolveContractConfiguration({
        FICHA_CONTRACT_MODE: "commercial",
        FICHA_CONTRACT_LEGAL_APPROVED: "true",
      }),
    ).toThrow("não configurada");
    expect(() =>
      resolveContractConfiguration({
        FICHA_CONTRACT_MODE: "commercial",
        FICHA_CONTRACT_LEGAL_APPROVED: "true",
        FICHA_SELLER_IDENTITY_JSON: JSON.stringify(demoSeller),
      }),
    ).toThrow("demonstrativa");
  });
  it("modo e identidade malformados não expõem valores privados no erro", () => {
    expect(() =>
      resolveContractConfiguration({
        FICHA_CONTRACT_MODE: "invalid-private-input",
      }),
    ).toThrow("Modo do contrato inválido");
    expect(() =>
      resolveContractConfiguration({
        FICHA_CONTRACT_MODE: "commercial",
        FICHA_CONTRACT_LEGAL_APPROVED: "true",
        FICHA_SELLER_IDENTITY_JSON: "[]",
      }),
    ).toThrow("inválida");
  });
});
