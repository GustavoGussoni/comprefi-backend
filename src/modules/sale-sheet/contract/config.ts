import type { SellerIdentity } from "../sale-sheet.types";
import { demoSeller } from "./seller";

export type ContractMode = "demonstration" | "commercial";
export type ContractConfiguration = {
  mode: ContractMode;
  seller: SellerIdentity;
};
const fields: (keyof SellerIdentity)[] = [
  "company",
  "cnpj",
  "street",
  "number",
  "district",
  "cep",
  "city",
  "state",
  "representative",
  "qualification",
  "rg",
  "cpf",
  "representativeAddress",
];

/** Não lê arquivos .env nem usa dados extraídos de contratos de terceiros. */
export function resolveContractConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): ContractConfiguration {
  const mode = env.FICHA_CONTRACT_MODE || "demonstration";
  if (mode !== "demonstration" && mode !== "commercial") {
    throw new Error("Modo do contrato inválido.");
  }
  if (mode === "demonstration") return { mode, seller: { ...demoSeller } };
  if (env.FICHA_CONTRACT_LEGAL_APPROVED !== "true") {
    throw new Error(
      "Uso comercial requer aprovação explícita do modelo contratual.",
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(env.FICHA_SELLER_IDENTITY_JSON || "");
  } catch {
    throw new Error("Identidade jurídica privada do vendedor não configurada.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Identidade jurídica privada do vendedor inválida.");
  }
  const input = raw as Record<string, unknown>;
  if (
    Object.keys(input).some(
      (key) => !fields.includes(key as keyof SellerIdentity),
    )
  ) {
    throw new Error("Identidade jurídica contém campos não suportados.");
  }
  const seller = {} as SellerIdentity;
  for (const field of fields) {
    const value = input[field];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > 500 ||
      /[\r\n]/.test(value)
    ) {
      throw new Error("Identidade jurídica privada incompleta ou inválida.");
    }
    seller[field] = value.trim();
  }
  const cnpj = seller.cnpj.replace(/\D/g, "");
  const cpf = seller.cpf.replace(/\D/g, "");
  if (
    !/^\d{14}$/.test(cnpj) ||
    /^(\d)\1+$/.test(cnpj) ||
    !/^\d{11}$/.test(cpf) ||
    /^(\d)\1+$/.test(cpf) ||
    /demonstra|fict[íi]ci|exemplo|DOCUMENTO FICTÍCIO/i.test(
      JSON.stringify(seller),
    )
  ) {
    throw new Error("Uso comercial não aceita identificação demonstrativa.");
  }
  // Este gate é estrutural, não prova titularidade ou situação fiscal.
  return { mode, seller };
}
