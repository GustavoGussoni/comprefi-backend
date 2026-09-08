export interface DataCrazyTradePayload {
  cep: string;
  nome: string;
  email: string;
  fonte: string;
  corAtual: string;
  defeitos: string[];
  whatsapp: string;
  dataEnvio: string;
  ondeOuviu: string;
  valorBase: number;
  quaisPecas: string;
  valorFinal: number;
  valorTotal: number;
  modeloAtual: string;
  bateriaAtual: number;
  cupomDesconto: string;
  pecasTrocadas: boolean;
  tempoPensando: string;
  urgenciaTroca: string;
  valorAparelho: number;
  modeloDesejado: string;
  precisaCotacao: boolean;
  capacidadeAtual: string;
  mensagemFollowUp: string;
  valorComDesconto: number;
  depreciacaoBateria: number;
  depreciacaoDefeitos: number;
  questionarioId: string;
  offerExpiresAt: string;
  ofertaExpirada: boolean;
  valorAPagar: number;
}

export type DataCrazyCaptureKind = "quiz" | "economia";

export interface DataCrazyQuizPayload {
  nome: string;
  whatsapp: string;
  email: string;
  category: "iphone" | "mac" | "ipad";
  usage: string;
  storage: string;
  screenSize?: string;
  recomendacao: string;
  fonte: "quiz-teste-infalivel";
  dataEnvio: string;
}

export interface DataCrazyEconomyPayload {
  nome: string;
  whatsapp: string;
  produto: string;
  fonte: "economia-captura-suave";
  dataEnvio: string;
}

export type DataCrazyCapturePayload =
  | DataCrazyQuizPayload
  | DataCrazyEconomyPayload;

export interface DataCrazyDeliveryReceipt {
  externalId?: string;
  externalUrl?: string;
}
