import type { StoredSheet as Sale, SellerIdentity } from "../sale-sheet.types";
import {
  buildContractDocument as buildLegacyContractDocument,
  contractTemplateVersion as legacyDemonstrationVersion,
  commercialContractTemplateVersion as legacyCommercialVersion,
} from "./template-legacy";

export const contractTemplateVersion = "modelo-comprefi-v1-campos-20261105";
export const commercialContractTemplateVersion =
  "modelo-comprefi-v1-comercial-campos-20261105";
export const isLegacyContractVersion = (version: string) =>
  version === legacyDemonstrationVersion || version === legacyCommercialVersion;
export const isDemonstrationContractVersion = (version: string) =>
  version === contractTemplateVersion || version === legacyDemonstrationVersion;
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
const total = (sale: Sale) =>
  (Math.round(sale.pix * 100) + Math.round(sale.card * 100)) / 100;
const cardFee = (sale: Sale) =>
  sale.payment === "pix"
    ? 0
    : (Math.round(sale.card * 100) -
        Math.round(sale.base * 100) +
        Math.round(sale.pix * 100)) /
      100;
export type ContractBlock = {
  kind: "paragraph" | "section" | "clause";
  text: string;
};
export type ContractDocument = {
  title: string;
  reference: string;
  templateVersion: string;
  issuedAt: string;
  buyerName: string;
  sellerName: string;
  placeDate: string;
  blocks: ContractBlock[];
};
const stateNames: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};
const contractDate = (iso: string) => {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()))
    throw new Error("Data da versão contratual inválida.");
  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
const deadlineDate = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso))
    throw new Error("Data máxima de entrega inválida.");
  const d = new Date(`${iso}T12:00:00-03:00`);
  if (!Number.isFinite(d.getTime()))
    throw new Error("Data máxima de entrega inválida.");
  return `${iso.split("-").reverse().join("/")} (${d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" })})`;
};
const isUsed = (condition: string) => /seminovo|usado/i.test(condition);
const conditionLabel = (condition: string) =>
  isUsed(condition)
    ? "seminovo"
    : /lacrado/i.test(condition)
      ? "novo e lacrado"
      : condition;

/** Texto-base do anexo, parametrizado; regras comerciais já definidas pelo usuário. */
export function buildContractDocument(
  sale: Sale,
  seller: SellerIdentity,
): ContractDocument {
  // Não reinterpreta versões anteriores ou documentos já emitidos.
  if (
    sale.contractTemplateVersion &&
    isLegacyContractVersion(sale.contractTemplateVersion)
  ) {
    return buildLegacyContractDocument(sale, seller);
  }
  const buyer = sale.customer;
  if (!buyer || !sale.contractIssuedAt) {
    throw new Error(
      "O cadastro deve estar concluído antes da geração do contrato.",
    );
  }
  if (
    sale.contractTemplateVersion !== contractTemplateVersion &&
    sale.contractTemplateVersion !== commercialContractTemplateVersion
  ) {
    throw new Error(
      "Versão do modelo não suportada; não alterar contratos antigos silenciosamente.",
    );
  }
  if (!sale.items.length)
    throw new Error("A ficha deve ter produtos identificados.");
  const blocks: ContractBlock[] = [];
  const paragraph = (text: string) => blocks.push({ kind: "paragraph", text });
  const section = (text: string) => blocks.push({ kind: "section", text });
  const clause = (text: string) => blocks.push({ kind: "clause", text });
  const multiple = sale.items.length > 1 || sale.items[0].quantity > 1;
  paragraph(
    `VENDEDOR: ${seller.company}, com sede em ${seller.city}, na ${seller.street}, nº ${seller.number}, bairro ${seller.district}, CEP ${seller.cep}, no Estado de ${seller.state}, inscrito no C.N.P.J. sob o nº ${seller.cnpj}, neste ato representado por ${seller.representative}, ${seller.qualification}, Carteira de Identidade nº ${seller.rg}, C.P.F. nº ${seller.cpf}, residente e domiciliado em ${seller.representativeAddress}.`,
  );
  paragraph(
    `COMPRADOR: ${buyer.name}, C.P.F. nº ${buyer.cpf}, residente e domiciliado na ${buyer.street}, nº ${buyer.number}${buyer.complement ? `, ${buyer.complement}` : ""}, bairro ${buyer.district}, CEP ${buyer.cep}, Cidade de ${buyer.city}, no Estado de ${stateNames[buyer.state] || buyer.state}.`,
  );
  paragraph(
    "As partes acima identificadas têm, entre si, justo e acertado o presente contrato de promessa de compra e venda de produto eletrônico a Prazo, que se regerá pelas cláusulas e condições a seguir expostas:",
  );
  section("1. DO OBJETO DO CONTRATO");
  clause(
    `Cláusula 1ª. O presente contrato tem como OBJETO, ${multiple ? "os seguintes equipamentos" : "o seguinte equipamento"} de informática:`,
  );
  sale.items.forEach((item, index) =>
    paragraph(
      `Item ${index + 1}: ${item.quantity} unidade(s) de ${item.product}, armazenamento ${item.storage}, cor ${item.color}, condição ${conditionLabel(item.condition)}.`,
    ),
  );
  section("2. DO PRAZO");
  clause(
    sale.delivery === "date"
      ? `Cláusula 2ª. O VENDEDOR se compromete, a realizar a entrega no prazo máximo ${deadlineDate(sale.deadline)}.`
      : "Cláusula 2ª. O VENDEDOR se compromete, a realizar a entrega no prazo de 1 (um) a 15 (quinze) dias úteis após a confirmação da totalidade do pagamento, incluindo PIX e cartão quando o pagamento for misto.",
  );
  paragraph(`Modalidade de entrega combinada: ${sale.deliveryMode}.`);
  paragraph(
    `Parágrafo único: Caso o COMPRADOR não receba ${multiple ? "os produtos" : "o produto"} no prazo estipulado no caput, o mesmo terá o seu dinheiro devolvido e o contrato será cancelado.`,
  );
  section("3. DAS OBRIGAÇÕES");
  const usedItems = sale.items.filter((item) => isUsed(item.condition));
  const allNewAndSealed = sale.items.every(
    (item) => /lacrado/i.test(item.condition) && !isUsed(item.condition),
  );
  const conservation = allNewAndSealed
    ? `em perfeito estado de conservação, ${multiple ? "novos e lacrados" : "novo e lacrado"}, garantindo ainda que ${multiple ? "estes se encontram livres" : "este se encontra livre"} de defeitos`
    : usedItems.length === sale.items.length
      ? `no estado de conservação registrado para ${multiple ? "os itens seminovos" : "o item seminovo"}`
      : "nas condições registradas para cada item na cláusula primeira";
  clause(
    `Cláusula 3ª. O VENDEDOR se responsabilizará pelo envio ${multiple ? "dos produtos descritos" : "do produto descrito"} na cláusula primeira ao endereço do COMPRADOR, ${conservation}.`,
  );
  clause(
    "Cláusula 4ª. O VENDEDOR, nos casos em que a compra for de produto lacrado, oferecerá garantia de 1 (um) ano, devendo o conserto ser realizado diretamente na empresa fabricante/autorizada.",
  );
  paragraph(
    "Parágrafo primeiro: O VENDEDOR, nos casos em que a compra for de produto seminovo, oferecerá 6 (seis) meses de garantia CompreFi, em se tratando de problemas de sistema ou defeitos não relacionados ao mau uso do produto.",
  );
  clause(
    "Cláusula 5ª. Poderá o COMPRADOR, estando ciente o VENDEDOR, que a compra do produto poderá ser cancelada em até 7 (sete) dias após a confirmação da compra.",
  );
  clause(
    "Cláusula 6ª. O VENDEDOR também se responsabilizará pela troca do equipamento que apresentar defeito de fabricação dentro do prazo de 7 (sete) dias após a compra do produto, devendo este ser identificado por técnico autorizado pelo mesmo.",
  );
  section("4. DO PREÇO E FORMAS DE PAGAMENTO");
  clause(
    `Cláusula 7ª. O COMPRADOR pagará ao VENDEDOR, pela compra ${multiple ? "dos equipamentos" : "do equipamento"} objeto deste contrato, a quantia de ${money(total(sale))}${sale.hasTrade ? ` + ${sale.tradeModel} ${sale.tradeStorage}, cor ${sale.tradeColor}, seminovo` : ""}.`,
  );
  if (sale.hasTrade) {
    paragraph(
      `Parágrafo primeiro: O crédito atribuído ao seminovo é de ${money(sale.credit)}. A volta base de ${money(sale.base)} já considera esse crédito, que não será descontado novamente do valor financeiro contratado. O aparelho será recebido junto com a entrega ${multiple ? "dos produtos" : "do produto"}.${sale.imei ? ` IMEI/serial: ${sale.imei}.` : ""}${sale.tradeNotes ? ` Estado e acessórios registrados: ${sale.tradeNotes}.` : ""}`,
    );
    paragraph(
      `Parágrafo segundo: Em caso de cancelamento com restituição aplicável, se o seminovo já tiver sido vendido, será devolvido o crédito de ${money(sale.credit)} atribuído ao aparelho, além da restituição dos valores financeiros devidos.`,
    );
  }
  const parts: string[] = [];
  if (sale.pix > 0) parts.push(`PIX: ${money(sale.pix)}`);
  if (sale.card > 0) {
    const cents = Math.round(sale.card * 100);
    const regular = Math.floor(cents / sale.installments);
    const last = cents - regular * (sale.installments - 1);
    const installmentText =
      sale.installments === 1
        ? "1 parcela"
        : regular === last
          ? `${sale.installments} parcelas de ${money(regular / 100)}`
          : `${sale.installments - 1} parcela(s) de ${money(regular / 100)} e uma última parcela de ${money(last / 100)}, com ajuste de centavos`;
    parts.push(
      `cartão: ${money(sale.card)}, em ${installmentText}; acréscimo de parcelamento já incluído: ${money(cardFee(sale))}`,
    );
  }
  clause(
    `Cláusula 8ª. O pagamento ${multiple ? "dos produtos" : "do produto"} será feito mediante ${parts.join("; ")}, sendo responsabilidade do COMPRADOR o envio do comprovante de pagamento. Total financeiro contratado: ${money(total(sale))}.`,
  );
  clause(
    "Cláusula 9ª. O COMPRADOR se compromete a realizar o pagamento em até 24 horas após a assinatura do contrato em caso de compras realizadas mediante o pagamento em cartão de crédito ou pix.",
  );
  section("5. DA RESCISÃO CONTRATUAL E DA MULTA CONTRATUAL");
  clause(
    "Cláusula 10ª. O descumprimento de qualquer Cláusula deste Contrato implicará na rescisão imediata do mesmo.",
  );
  section("6. CONDIÇÕES GERAIS");
  clause(
    "Cláusula 11ª. O VENDEDOR não se responsabilizará pelos danos causados no equipamento por negligência do COMPRADOR, e por problemas decorrentes do não uso conforme as normas técnicas constantes de manual que acompanha o produto.",
  );
  clause(
    "Cláusula 12ª. O presente contrato passa a valer a partir da assinatura pelas partes.",
  );
  if (sale.notes.trim())
    paragraph(
      `Condição específica registrada na negociação: ${sale.notes.trim()}`,
    );
  section("7. DO FORO");
  clause(
    "Cláusula 13ª. Para dirimir quaisquer controvérsias oriundas do CONTRATO, as partes elegem o foro da comarca de Araguari (MG).",
  );
  paragraph(
    "Por estarem assim justos e contratados, firmam o presente instrumento, em duas vias de igual teor, juntamente com 2 (duas) testemunhas.",
  );
  return {
    title: "CONTRATO DE PROMESSA DE COMPRA E VENDA DE PRODUTO ELETRÔNICO",
    reference: sale.reference,
    templateVersion: sale.contractTemplateVersion,
    issuedAt: sale.contractIssuedAt,
    buyerName: buyer.name,
    sellerName: seller.representative,
    placeDate: `Araguari (MG), ${contractDate(sale.contractIssuedAt)}.`,
    blocks,
  };
}
