import type { SellerIdentity } from "../sale-sheet.types";

/** Somente teste. Dados reais devem ser configurados uma única vez no servidor privado, antes de qualquer uso comercial. */
export const demoSeller: SellerIdentity = {
  company: "CompreFi — Empresa de Demonstração",
  cnpj: "00.000.000/0000-00",
  street: "Rua de Exemplo",
  number: "100",
  district: "Centro",
  cep: "00000-000",
  city: "Araguari",
  state: "Minas Gerais",
  representative: "Representante de Demonstração",
  qualification: "brasileiro, empresário",
  rg: "DOCUMENTO FICTÍCIO",
  cpf: "000.000.000-00",
  representativeAddress:
    "Rua de Exemplo, nº 100, Centro, Araguari/MG, CEP 00000-000",
};
