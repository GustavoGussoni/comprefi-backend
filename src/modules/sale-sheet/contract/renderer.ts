import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";
import type {
  SellerIdentity,
  SheetRenderer,
  StoredSheet,
} from "../sale-sheet.types";
import {
  buildContractDocument,
  contractTemplateVersion,
  commercialContractTemplateVersion,
  isDemonstrationContractVersion,
  isLegacyContractVersion,
} from "./template";
import type { ContractMode } from "./config";

/** Não utiliza imagens de assinatura, filesystem público ou serviços externos. */
export class ContractPdfRenderer implements SheetRenderer {
  readonly version: string;
  constructor(mode: ContractMode = "demonstration") {
    this.version =
      mode === "commercial"
        ? commercialContractTemplateVersion
        : contractTemplateVersion;
  }
  async render(sheet: StoredSheet, seller: SellerIdentity): Promise<Buffer> {
    const contract = buildContractDocument(sheet, seller);
    // A apresentação depende da versão CONGELADA, nunca da configuração atual.
    const demonstration = isDemonstrationContractVersion(
      contract.templateVersion,
    );
    const warning = demonstration
      ? "DEMONSTRAÇÃO — NÃO ASSINADO — SEM VALIDADE CONTRATUAL"
      : "CONTRATO GERADO — NÃO ASSINADO";
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    pdf.setCreationDate(new Date(contract.issuedAt));
    pdf.setFileId(
      createHash("sha256")
        .update(
          `${sheet.id}:${sheet.revision}:${contract.issuedAt}:${contract.templateVersion}`,
        )
        .digest("hex")
        .slice(0, 32)
        .toUpperCase(),
    );
    pdf.setProperties({
      title: contract.title,
      subject: `${contract.reference} — versão ${sheet.revision} — não assinado`,
      author: demonstration ? "CompreFi — teste isolado" : "CompreFi",
      creator: "CompreFi Backend — gerador de contrato",
    });
    const left = 22,
      width = 166,
      bottom = 272;
    let y = 27;
    const header = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(175, 68, 20);
      pdf.text(warning, 105, 13, { align: "center" });
      pdf.setDrawColor(224, 224, 224);
      pdf.line(left, 17, left + width, 17);
      pdf.setTextColor(28, 28, 28);
    };
    const nextPage = () => {
      pdf.addPage();
      y = 27;
      header();
    };
    const ensure = (height: number) => {
      if (y + height > bottom) nextPage();
    };
    const text = (value: string, size = 10.5, bold = false, gap = 3.2) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(
        value.replace(/\u00a0/g, " "),
        width,
      ) as string[];
      const lineHeight = size * 0.44;
      if (lines.length * lineHeight + gap < 65)
        ensure(lines.length * lineHeight + gap);
      for (const line of lines) {
        if (y + lineHeight > bottom) {
          nextPage();
          pdf.setFont("helvetica", bold ? "bold" : "normal");
          pdf.setFontSize(size);
        }
        pdf.text(line, left, y);
        y += lineHeight;
      }
      y += gap;
    };
    header();
    text(contract.title, 13, true, 5);
    text(
      `Referência: ${contract.reference} | Versão da ficha: ${sheet.revision}\nModelo: ${contract.templateVersion}\nEmissão da versão: ${contract.issuedAt} (não é data de assinatura)`,
      8.5,
      false,
      4,
    );
    text(
      demonstration
        ? isLegacyContractVersion(contract.templateVersion)
          ? "MINUTA DE TESTE COM DADOS FICTÍCIOS. Baseada no modelo fornecido, com ajustes comerciais de produtos, pagamento, troca, garantia de seminovos e entrega. As cláusulas de cancelamento, defeitos, rescisão e foro exigem revisão jurídica antes do uso real. Não comprova identidade, assinatura ou pagamento."
          : "TESTE COM DADOS FICTÍCIOS. Modelo fornecido preenchido automaticamente, com as regras comerciais já definidas. Não comprova identidade, assinatura ou pagamento."
        : "Documento gerado a partir do cadastro e da negociação registrada. Não comprova assinatura, identidade verificada ou pagamento. As assinaturas serão realizadas separadamente, de forma manual.",
      8.5,
      false,
      6,
    );
    for (const block of contract.blocks) {
      if (block.kind === "section") {
        ensure(35);
        y += 2;
        text(block.text, 10.5, true, 5);
      } else text(block.text, 10.5, block.kind === "clause", 3.5);
    }
    ensure(110);
    y += 5;
    text(contract.placeDate, 10.5, false, 5);
    text("ASSINATURAS EM BRANCO — ACOMPANHAMENTO MANUAL", 8.5, true, 6);
    const signature = (label: string, name: string) => {
      pdf.setDrawColor(70, 70, 70);
      pdf.line(left, y + 5, left + width, y + 5);
      y += 11;
      text(`${label}: ${name}`, 9, false, 5);
    };
    signature("Promitente Vendedor", contract.sellerName);
    signature("Promitente Comprador", contract.buyerName);
    signature("Testemunha 1 — nome e CPF", "________________________________");
    signature("Testemunha 2 — nome e CPF", "________________________________");
    const pages = pdf.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      pdf.setPage(page);
      pdf.setDrawColor(224, 224, 224);
      pdf.line(left, 279, left + width, 279);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(120, 70, 35);
      pdf.text(
        `${demonstration ? "DEMONSTRAÇÃO — NÃO ASSINADO" : "NÃO ASSINADO"} | ${contract.reference} | v${sheet.revision} | ${page}/${pages}`,
        left,
        285,
      );
    }
    return Buffer.from(pdf.output("arraybuffer"));
  }
}
