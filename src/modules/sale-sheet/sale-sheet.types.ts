export type SheetRole = "ADMIN" | "SALES";
export type SheetActor = {
  id: string;
  name: string;
  email: string;
  role: SheetRole;
};
export type SheetItem = {
  lineId: string;
  variantId: string | null;
  groupSlug: string;
  product: string;
  color: string;
  storage: string;
  condition: string;
  quantity: number;
  image: string;
  /** Referências CRM resolvidas no servidor e congeladas na criação da ficha. */
  crmSku?: string;
  crmProductId?: string;
  crmMappingStatus?: "confirmed" | "pending" | "manual";
};
export type SheetCustomer = {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  birth: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  instagram: string;
};
export type SheetTerms = {
  whatsapp: string;
  items: SheetItem[];
  base: number;
  payment: "pix" | "card" | "mixed";
  pix: number;
  card: number;
  installments: number;
  hasTrade: boolean;
  tradeModel: string;
  tradeStorage: string;
  tradeColor: string;
  credit: number;
  imei: string;
  tradeNotes: string;
  delivery: "standard" | "date";
  deadline: string;
  deliveryMode: string;
  notes: string;
};
export type SheetTaskStatus =
  | "waiting"
  | "ready"
  | "disabled"
  | "failed"
  | "sending"
  | "sent"
  | "uncertain";
export type CrmDeliveryMode = "disabled" | "datacrazy";
export type SheetTask = {
  status: SheetTaskStatus;
  attempts: number;
  error?: string;
  /** Private persisted claim, stripped from HTTP projections. */
  leaseId?: string;
  leaseUntil?: string;
  /** Only set for CRM tasks so the local UI can explain delivery behavior. */
  deliveryMode?: CrmDeliveryMode;
};
export type SheetSnapshot = SheetTerms & {
  id: string;
  reference: string;
  createdAt: string;
  createdBy: SheetActor;
  revision: number;
  /** Available only through authenticated, authorized admin endpoints. */
  customer?: SheetCustomer;
  submittedAt?: string;
  contractIssuedAt?: string;
  contractTemplateVersion?: string;
  linkExpiresAt: string;
  revoked: boolean;
  crm: SheetTask;
  pdf: SheetTask;
  crmAttachment: SheetTask;
};
/** Privado: nunca retornado no admin/lista, formulário público ou payload do CRM. */
export type StoredSheet = SheetSnapshot & {
  tokenHash: string;
  creationKeyHash?: string;
  creationBodyHash?: string;
  contractMode?: "demonstration" | "commercial";
  crmPayloadVersion?: string;
  submissionKeyHash?: string;
  submissionBodyHash?: string;
  contractFile?: string;
  contractSha256?: string;
  sellerSnapshot?: SellerIdentity;
  /**
   * Durable but private CRM delivery material. It can contain customer data,
   * so it must never be included in SheetSnapshot/PublicSheet responses.
   */
  crmDelivery?: {
    payloadJson: string;
    payloadHash: string;
    deliveryKey: string;
    attemptedAt?: string;
    responseStatus?: number;
  };
};
export type CatalogItem = Omit<
  SheetItem,
  "lineId" | "quantity" | "variantId"
> & { id: string; category: string; model: string };
export type SellerIdentity = {
  company: string;
  cnpj: string;
  street: string;
  number: string;
  district: string;
  cep: string;
  city: string;
  state: string;
  representative: string;
  qualification: string;
  rg: string;
  cpf: string;
  representativeAddress: string;
};
export type PublicSheet = SheetTerms & {
  id: string;
  reference: string;
  createdAt: string;
  revision: number;
  linkExpiresAt: string;
  revoked: boolean;
  submitted: boolean;
};
export const SHEET_REPOSITORY = Symbol("SHEET_REPOSITORY");
export const SHEET_CATALOG = Symbol("SHEET_CATALOG");
export const SHEET_RENDERER = Symbol("SHEET_RENDERER");
export const SHEET_SELLER = Symbol("SHEET_SELLER");
export const SHEET_CRM_DELIVERY = Symbol("SHEET_CRM_DELIVERY");
export interface SheetRepository {
  list(): Promise<StoredSheet[]>;
  get(id: string): Promise<StoredSheet | undefined>;
  findByTokenHash(hash: string): Promise<StoredSheet | undefined>;
  /** Serialize updates including duplicate submissions; no last-writer-wins contract mutation. */
  transact<T>(
    fn: (
      sheets: StoredSheet[],
      documents: SheetDocumentWriter,
    ) => Promise<T> | T,
  ): Promise<T>;
  readDocument(sheetId: string, revision: number): Promise<Buffer | undefined>;
}
export interface SheetCatalog {
  list(): Promise<CatalogItem[]>;
}
export interface SheetRenderer {
  version: string;
  render(sheet: StoredSheet, seller: SellerIdentity): Promise<Buffer>;
}
export type CrmTransportResponse = { status: number };
export interface CrmDeliveryTransport {
  readonly mode: CrmDeliveryMode;
  send(payloadJson: string, deliveryKey: string): Promise<CrmTransportResponse>;
}

export interface SheetDocumentWriter {
  create(
    sheetId: string,
    revision: number,
    bytes: Buffer,
    sha256: string,
  ): void;
}
