import {
  buildContractDocument,
  contractTemplateVersion,
  commercialContractTemplateVersion,
  isDemonstrationContractVersion,
} from "./template";
import {
  buildContractDocument as buildLegacy,
  contractTemplateVersion as legacyVersion,
  commercialContractTemplateVersion as legacyCommercialVersion,
} from "./template-legacy";
import { fictitiousSheet } from "./fixtures";
import { demoSeller } from "./seller";

const document = () => buildContractDocument(fictitiousSheet(), demoSeller);
const clause = (n: number) =>
  document().blocks.find((b) => b.text.startsWith(`Cláusula ${n}ª.`))!.text;

describe("Contrato — texto-base parametrizado e regras já definidas", () => {
  it.each([
    [
      4,
      "Cláusula 4ª. O VENDEDOR, nos casos em que a compra for de produto lacrado, oferecerá garantia de 1 (um) ano, devendo o conserto ser realizado diretamente na empresa fabricante/autorizada.",
    ],
    [
      5,
      "Cláusula 5ª. Poderá o COMPRADOR, estando ciente o VENDEDOR, que a compra do produto poderá ser cancelada em até 7 (sete) dias após a confirmação da compra.",
    ],
    [
      6,
      "Cláusula 6ª. O VENDEDOR também se responsabilizará pela troca do equipamento que apresentar defeito de fabricação dentro do prazo de 7 (sete) dias após a compra do produto, devendo este ser identificado por técnico autorizado pelo mesmo.",
    ],
    [
      9,
      "Cláusula 9ª. O COMPRADOR se compromete a realizar o pagamento em até 24 horas após a assinatura do contrato em caso de compras realizadas mediante o pagamento em cartão de crédito ou pix.",
    ],
    [
      10,
      "Cláusula 10ª. O descumprimento de qualquer Cláusula deste Contrato implicará na rescisão imediata do mesmo.",
    ],
    [
      11,
      "Cláusula 11ª. O VENDEDOR não se responsabilizará pelos danos causados no equipamento por negligência do COMPRADOR, e por problemas decorrentes do não uso conforme as normas técnicas constantes de manual que acompanha o produto.",
    ],
    [
      12,
      "Cláusula 12ª. O presente contrato passa a valer a partir da assinatura pelas partes.",
    ],
    [
      13,
      "Cláusula 13ª. Para dirimir quaisquer controvérsias oriundas do CONTRATO, as partes elegem o foro da comarca de Araguari (MG).",
    ],
  ])("preserva integralmente o texto-base da cláusula %s", (n, expected) => {
    expect(clause(Number(n))).toBe(expected);
  });
  it("garantia de seminovo é seis meses, não 120 dias", () => {
    const text = document()
      .blocks.map((b) => b.text)
      .join("\n");
    expect(text).toContain("6 (seis) meses de garantia CompreFi");
    expect(text).not.toContain("120 dias");
  });
  it("não cria disponibilidade de cobrança, início no cadastro ou novo termo obrigatório", () => {
    const text = document()
      .blocks.map((b) => b.text)
      .join("\n");
    for (const removed of [
      "disponibilização da cobrança",
      "conclusão das assinaturas necessárias",
      "termo de recebimento",
      "Não há cobrança automática por este documento",
    ]) {
      expect(text).not.toContain(removed);
    }
    expect(clause(9)).toContain("após a assinatura do contrato");
  });
  it("produto único lacrado mantém redação original de conservação", () => {
    const s = fictitiousSheet();
    s.items = [s.items[0]];
    const d = buildContractDocument(s, demoSeller);
    expect(
      d.blocks.find((b) => b.text.startsWith("Cláusula 1ª."))!.text,
    ).toContain("o seguinte equipamento de informática");
    expect(d.blocks.find((b) => b.text.startsWith("Cláusula 3ª."))!.text).toBe(
      "Cláusula 3ª. O VENDEDOR se responsabilizará pelo envio do produto descrito na cláusula primeira ao endereço do COMPRADOR, em perfeito estado de conservação, novo e lacrado, garantindo ainda que este se encontra livre de defeitos.",
    );
  });
  it("não declara lacrado o item seminovo ou a compra mista", () => {
    const mixed = clause(3);
    expect(mixed).toContain("condições registradas para cada item");
    expect(mixed).not.toContain("novos e lacrados");
    const s = fictitiousSheet();
    s.items = [{ ...s.items[1], quantity: 1 }];
    const text = buildContractDocument(s, demoSeller).blocks.find((b) =>
      b.text.startsWith("Cláusula 3ª."),
    )!.text;
    expect(text).toContain(
      "estado de conservação registrado para o item seminovo",
    );
    expect(text).not.toContain("novo e lacrado");
  });
  it("mantém troca e restituição combinadas sem reabater o crédito", () => {
    const text = document()
      .blocks.map((b) => b.text)
      .join("\n");
    expect(clause(7)).toContain(
      "R$ 19.300,00 + iPhone de Troca — Exemplo 256 GB",
    );
    expect(text).toContain("junto com a entrega dos produtos");
    expect(text).toContain("se o seminovo já tiver sido vendido");
    expect(text).toContain(
      "além da restituição dos valores financeiros devidos",
    );
    expect(text).toContain("não será descontado novamente");
  });
  it.each([legacyVersion, legacyCommercialVersion])(
    "não reinterpreta o modelo anterior %s",
    (version) => {
      const s = { ...fictitiousSheet(), contractTemplateVersion: version };
      expect(buildContractDocument(s, demoSeller)).toEqual(
        buildLegacy(s, demoSeller),
      );
    },
  );
  it("marca como demonstração versões novas e antigas sem confundir comerciais", () => {
    expect(isDemonstrationContractVersion(contractTemplateVersion)).toBe(true);
    expect(isDemonstrationContractVersion(legacyVersion)).toBe(true);
    expect(
      isDemonstrationContractVersion(commercialContractTemplateVersion),
    ).toBe(false);
    expect(isDemonstrationContractVersion(legacyCommercialVersion)).toBe(false);
  });
});
