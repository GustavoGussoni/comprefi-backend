import { ConflictException } from "@nestjs/common";
import type { StoredSheet } from "../sale-sheet.types";

const cents = (value: number) => Math.round(value * 100);
const deliveryDescription = (s: StoredSheet) =>
  s.delivery === "date"
    ? `Até ${s.deadline.split("-").reverse().join("/")} — data máxima combinada`
    : "De 1 a 15 dias úteis após a confirmação da totalidade do pagamento financeiro";

export type CrmProductLine = { sku: string; quantidade: number };
export const CRM_PAYLOAD_VERSION = "ficha-venda.v2-sku";

/**
 * Only frozen, server-resolved references may leave the sheet. No fallback by
 * model/color or guessed SKU: old sheets, manual rows and unresolved mappings
 * need explicit review. This guard affects CRM preparation, never cadastro/PDF.
 */
export function crmProductLines(sheet: StoredSheet): CrmProductLine[] {
  const pending = sheet.items.flatMap((item, index) =>
    item.crmMappingStatus === "confirmed" &&
    typeof item.crmSku === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(item.crmSku)
      ? []
      : [index + 1],
  );
  if (!sheet.items.length || pending.length) {
    throw new ConflictException({
      statusCode: 409,
      error: "Conflict",
      code: "CRM_PRODUCT_MAPPING_PENDING",
      message:
        "Existem itens sem vínculo SKU confirmado no CRM. O cadastro e o contrato permanecem disponíveis; revise o vínculo antes de preparar o envio.",
      pendingItemNumbers: pending,
    });
  }
  return sheet.items.map((item) => ({
    sku: item.crmSku!,
    quantidade: item.quantity,
  }));
}

/**
 * Proposed contract for the dedicated workflow. Receiving this JSON does not by
 * itself link products to a deal: SKU resolution/list handling must be mapped
 * and tested in DataCrazy. This function never performs a request.
 */
export function buildCrmPayload(sheet: StoredSheet): Record<string, unknown> {
  if (!sheet.customer || !sheet.submittedAt)
    throw new ConflictException(
      "Cadastre o cliente antes de preparar o payload.",
    );
  const products = crmProductLines(sheet);
  const c = sheet.customer;
  return {
    versaoPayload: CRM_PAYLOAD_VERSION,
    fonte: "ficha-venda",
    evento: "cadastro_recebido",
    fichaId: sheet.id,
    referenciaFicha: sheet.reference,
    versaoFicha: sheet.revision,
    dataEnvio: sheet.submittedAt,
    responsavelFicha: sheet.createdBy.name,
    whatsapp: sheet.whatsapp,
    celularCadastro: c.phone,
    nome: c.name,
    cpf: c.cpf,
    email: c.email,
    dataNascimento: c.birth,
    cep: c.cep,
    endereco: c.street,
    numero: c.number,
    complemento: c.complement,
    bairro: c.district,
    cidade: c.city,
    estado: c.state,
    instagram: c.instagram,
    formaPagamento: { pix: "PIX", card: "Cartão", mixed: "PIX + cartão" }[
      sheet.payment
    ],
    valorVoltaBase: sheet.base,
    valorPix: sheet.pix,
    valorCartao: sheet.card,
    totalFinanceiro: (cents(sheet.pix) + cents(sheet.card)) / 100,
    parcelasCartao: sheet.card > 0 ? sheet.installments : 0,
    valorParcelaCartao:
      sheet.card > 0
        ? Math.floor(cents(sheet.card) / sheet.installments) / 100
        : 0,
    valorUltimaParcelaCartao:
      sheet.card > 0
        ? (cents(sheet.card) -
            Math.floor(cents(sheet.card) / sheet.installments) *
              (sheet.installments - 1)) /
          100
        : 0,
    acrescimoCartao:
      sheet.card > 0
        ? (cents(sheet.card) - cents(sheet.base) + cents(sheet.pix)) / 100
        : 0,
    temTroca: sheet.hasTrade,
    modeloTroca: sheet.hasTrade ? sheet.tradeModel : "",
    capacidadeTroca: sheet.hasTrade ? sheet.tradeStorage : "",
    corTroca: sheet.hasTrade ? sheet.tradeColor : "",
    creditoTroca: sheet.hasTrade ? sheet.credit : 0,
    imeiTroca: sheet.hasTrade ? sheet.imei : "",
    estadoTroca: sheet.hasTrade ? sheet.tradeNotes : "",
    prazoEntregaTipo: sheet.delivery,
    prazoEntregaDescricao: deliveryDescription(sheet),
    dataMaximaEntrega: sheet.delivery === "date" ? sheet.deadline : "",
    modalidadeEntrega: sheet.deliveryMode,
    observacoesNegociacao: sheet.notes,
    quantidadeItens: sheet.items.length,
    quantidadeUnidades: sheet.items.reduce((sum, i) => sum + i.quantity, 0),
    produtos: products,
    contratoStatus: sheet.pdf.status,
    contratoAssinado: false,
    contratoVersaoModelo: sheet.contractTemplateVersion || "",
    contratoDataEmissao: sheet.contractIssuedAt || "",
    contratoAnexoStatus: sheet.crmAttachment.status,
  };
}
