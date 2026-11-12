import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type {
  CatalogItem,
  CrmDeliveryMode,
  PublicSheet,
  SellerIdentity,
  SheetActor,
  SheetCatalog,
  SheetCustomer,
  CrmDeliveryTransport,
  SheetItem,
  SheetRenderer,
  SheetRepository,
  SheetSnapshot,
  SheetTask,
  SheetTerms,
  StoredSheet,
} from "./sale-sheet.types";
import {
  SHEET_CATALOG,
  SHEET_CRM_DELIVERY,
  SHEET_RENDERER,
  SHEET_REPOSITORY,
  SHEET_SELLER,
} from "./sale-sheet.types";
import {
  assertCustomerSemantics,
  assertDeadlineNotPast,
  assertIdempotencyKey,
  assertMoney,
  EditSaleSheetDto,
  FinalizeSaleSheetDto,
  ReopenSaleSheetDto,
  SheetCustomerDto,
  SheetRevisionDto,
  SheetTermsDto,
  SubmitPublicSheetDto,
  UnarchiveSaleSheetDto,
  validateInput,
} from "./dto/sale-sheet.dto";
import { MAX_CONTRACT_BYTES } from "./postgres.repository";
import { commercialContractTemplateVersion } from "./contract/template";
import { buildCrmPayload, CRM_PAYLOAD_VERSION } from "./crm/payload";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_CRM_DISABLED =
  "CRM desativado nesta preparação isolada; nenhum envio externo foi realizado.";
const LOCAL_ATTACHMENT_DISABLED =
  "Anexo CRM desativado nesta preparação isolada; nenhum envio externo foi realizado.";
const CRM_PREPARATION_FAILED =
  "Entrega CRM não pôde ser preparada; revise os vínculos de produto antes de tentar novamente.";
const CRM_UNCERTAIN =
  "Entrega CRM sem confirmação técnica; não houve reenvio automático.";

export type SubmissionResult = {
  reference: string;
  revision: number;
  submitted: true;
  pdfStatus: SheetTask["status"];
  crmStatus: SheetTask["status"];
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function publicTask(status: SheetTask["status"]): SheetTask["status"] {
  return status;
}

@Injectable()
export class SaleSheetService implements OnModuleInit {
  private readonly leaseMs = 120_000;

  constructor(
    @Inject(SHEET_REPOSITORY) private readonly repository: SheetRepository,
    @Inject(SHEET_CATALOG) private readonly catalog: SheetCatalog,
    @Inject(SHEET_RENDERER) private readonly renderer: SheetRenderer,
    @Inject(SHEET_SELLER) private readonly seller: SellerIdentity,
    @Inject(SHEET_CRM_DELIVERY)
    private readonly crmDelivery: CrmDeliveryTransport,
  ) {}

  /** Startup never sends CRM and never steals another replica's live claim. */
  async onModuleInit(): Promise<void> {
    const pdfIds = await this.repository.transact((sheets) => {
      const pending: string[] = [];
      for (const sheet of sheets) {
        if (sheet.crm.status === "sending" && this.expired(sheet.crm)) {
          sheet.crm = {
            ...sheet.crm,
            status: "uncertain",
            error: CRM_UNCERTAIN,
          };
          delete sheet.crm.leaseId;
          delete sheet.crm.leaseUntil;
        }
        if (!sheet.submittedAt || sheet.pdf.status === "ready") continue;
        if (sheet.pdf.status === "sending" && this.expired(sheet.pdf)) {
          sheet.pdf = { status: "waiting", attempts: sheet.pdf.attempts };
        }
        if (sheet.pdf.status === "waiting") pending.push(sheet.id);
      }
      return pending;
    });
    for (const id of pdfIds) await this.renderPendingContract(id);
  }

  private expired(task: SheetTask): boolean {
    return !task.leaseUntil || Date.parse(task.leaseUntil) <= Date.now();
  }

  async listCatalog(): Promise<CatalogItem[]> {
    return this.catalog.list();
  }

  getDeliveryMode(): CrmDeliveryMode {
    return this.crmDelivery.mode;
  }

  async listAdmin(actor: SheetActor): Promise<SheetSnapshot[]> {
    const sheets = await this.repository.list();
    return sheets
      .filter(
        (sheet) => actor.role === "ADMIN" || sheet.createdBy.id === actor.id,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((sheet) => this.toSnapshot(sheet));
  }

  async create(
    actor: SheetActor,
    body: unknown,
    idempotencyKeyHeader: unknown,
  ): Promise<{ sheet: SheetSnapshot; token?: string; replayed: boolean }> {
    const key = assertIdempotencyKey(idempotencyKeyHeader);
    const terms = await validateInput(SheetTermsDto, body);
    const creationKeyHash = sha256(key);
    const creationBodyHash = sha256(
      stableJson({
        ...terms,
        items: terms.items.map(({ lineId: _ignored, ...item }) => item),
      }),
    );
    const previous = (await this.repository.list()).find(
      (entry) =>
        entry.createdBy.id === actor.id &&
        entry.creationKeyHash === creationKeyHash,
    );
    if (previous) {
      if (previous.creationBodyHash !== creationBodyHash)
        throw new ConflictException(
          "Chave de criação reutilizada com dados diferentes.",
        );
      return { sheet: this.toSnapshot(previous), replayed: true };
    }
    const normalized = await this.normalizeTerms(terms);
    const now = new Date();
    const token = randomBytes(32).toString("base64url");
    const row: StoredSheet = {
      ...normalized,
      creationKeyHash,
      creationBodyHash,
      id: randomUUID(),
      reference: this.reference(now),
      createdAt: now.toISOString(),
      createdBy: clone(actor),
      revision: 1,
      linkExpiresAt: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
      revoked: false,
      crm:
        this.crmDelivery.mode === "disabled"
          ? {
              status: "disabled",
              attempts: 0,
              error: LOCAL_CRM_DISABLED,
              deliveryMode: "disabled",
            }
          : {
              status: "waiting",
              attempts: 0,
              deliveryMode: this.crmDelivery.mode,
            },
      pdf: { status: "waiting", attempts: 0 },
      crmAttachment: {
        status: "disabled",
        attempts: 0,
        error: LOCAL_ATTACHMENT_DISABLED,
      },
      tokenHash: sha256(token),
    };
    return this.repository.transact((sheets) => {
      const existing = sheets.find(
        (entry) =>
          entry.createdBy.id === actor.id &&
          entry.creationKeyHash === creationKeyHash,
      );
      if (existing) {
        if (existing.creationBodyHash !== creationBodyHash)
          throw new ConflictException(
            "Chave de criação reutilizada com dados diferentes.",
          );
        return { sheet: this.toSnapshot(existing), replayed: true };
      }
      sheets.push(row);
      return { sheet: this.toSnapshot(row), token, replayed: false };
    });
  }

  async getAdmin(actor: SheetActor, id: string): Promise<SheetSnapshot> {
    return this.toSnapshot(await this.findOwned(actor, id));
  }

  async edit(
    actor: SheetActor,
    id: string,
    body: unknown,
    idempotencyKeyHeader: unknown,
  ): Promise<{ sheet: SheetSnapshot; token?: string; replayed: boolean }> {
    this.assertSheetActor(actor);
    const keyHash = sha256(assertIdempotencyKey(idempotencyKeyHeader));
    const dto = await this.validateMutation(EditSaleSheetDto, body);
    const bodyHash = sha256(stableJson(dto));
    const replay = (sheet: StoredSheet) => {
      const operation = sheet.editOperations?.find(
        (entry) => entry.actorId === actor.id && entry.keyHash === keyHash,
      );
      if (!operation) return undefined;
      if (operation.bodyHash !== bodyHash)
        throw new ConflictException(
          "Chave de edição reutilizada com dados diferentes.",
        );
      // Return the latest authorized snapshot, not an obsolete contractual version.
      // Neither the raw token nor a historical customer snapshot is stored here.
      return { sheet: this.toSnapshot(sheet), replayed: true };
    };
    const current = await this.findOwned(actor, id);
    const previous = replay(current);
    if (previous) return previous;
    this.assertRevision(current, dto.revision);
    this.assertEditable(current);
    // Catalog normalization is the same as creation; no CRM or renderer runs here.
    let normalized: SheetTerms;
    try {
      normalized = await this.normalizeTerms(dto.terms);
    } catch (error) {
      if (error instanceof BadRequestException)
        throw new BadRequestException(
          "Revise os itens, valores, pagamento, troca e prazo de entrega.",
        );
      throw error;
    }
    return this.repository.transact((sheets) => {
      const sheet = this.findOwnedIn(sheets, actor, id);
      const duplicate = replay(sheet);
      if (duplicate) return duplicate;
      this.assertRevision(sheet, dto.revision);
      this.assertEditable(sheet);
      if (normalized.delivery === "date")
        assertDeadlineNotPast(
          normalized.deadline,
          "O prazo de entrega venceu.",
        );
      const token = randomBytes(32).toString("base64url");
      Object.assign(sheet, normalized);
      sheet.tokenHash = sha256(token);
      sheet.linkExpiresAt = new Date(Date.now() + 7 * DAY_MS).toISOString();
      sheet.revision += 1;
      (sheet.editOperations ||= []).push({
        actorId: actor.id,
        keyHash,
        bodyHash,
        resultVersion: sheet.revision,
      });
      return { sheet: this.toSnapshot(sheet), token, replayed: false };
    });
  }

  async cancel(
    actor: SheetActor,
    id: string,
    body: unknown,
  ): Promise<SheetSnapshot> {
    this.assertSheetActor(actor);
    const dto = await this.validateMutation(SheetRevisionDto, body);
    return this.repository.transact((sheets) => {
      const sheet = this.findOwnedIn(sheets, actor, id);
      if (sheet.submittedAt)
        throw new ConflictException(
          "Esta ficha já recebeu o cadastro e não pode ser cancelada.",
        );
      // A lost cancellation response may be retried with its original revision.
      // Unrelated stale revisions still conflict, including after an intervening edit.
      if (
        sheet.revoked &&
        (dto.revision === sheet.revision ||
          (sheet.cancelOperation?.expectedRevision === dto.revision &&
            sheet.cancelOperation.resultVersion === sheet.revision))
      )
        return this.toSnapshot(sheet);
      this.assertRevision(sheet, dto.revision);
      this.assertEditable(sheet);
      sheet.revoked = true;
      sheet.revision += 1;
      sheet.cancelOperation = {
        actorId: actor.id,
        expectedRevision: dto.revision,
        resultVersion: sheet.revision,
      };
      return this.toSnapshot(sheet);
    });
  }

  async finalize(
    actor: SheetActor,
    id: string,
    body: unknown,
  ): Promise<SheetSnapshot> {
    this.assertSheetActor(actor);
    const dto = await this.validateMutation(
      FinalizeSaleSheetDto,
      body,
      "Dados inválidos. Confira a versão do pedido.",
    );
    return this.repository.transact((sheets) => {
      const sheet = this.findOwnedIn(sheets, actor, id);
      if (!sheet.submittedAt || sheet.revoked || sheet.archivedAt)
        throw new ConflictException(
          "Só é possível finalizar pedidos respondidos, não cancelados e não arquivados.",
        );
      const currentVersion = this.adminVersion(sheet);
      const last =
        sheet.operationalHistory?.[sheet.operationalHistory.length - 1];
      if (
        sheet.finalizedAt &&
        (dto.expectedVersion === currentVersion ||
          (last?.action === "finalize" &&
            last.expectedVersion === dto.expectedVersion &&
            last.resultVersion === currentVersion &&
            last.finalizedAt === sheet.finalizedAt))
      )
        return this.toSnapshot(sheet);
      this.assertRevision(sheet, dto.expectedVersion);
      const resultVersion = this.nextOperationalVersion(sheet);
      // Unique monotonic timestamp also disambiguates cycles within one millisecond.
      const at = new Date(
        Math.max(Date.now(), last ? Date.parse(last.at) + 1 : 0),
      ).toISOString();
      sheet.finalizedAt = at;
      sheet.finalizedById = actor.id;
      sheet.finalizedByName = actor.name;
      sheet.operationalVersion = resultVersion;
      (sheet.operationalHistory ||= []).push({
        action: "finalize",
        at,
        actorId: actor.id,
        actorName: actor.name,
        expectedVersion: dto.expectedVersion,
        resultVersion,
        finalizedAt: at,
      });
      return this.toSnapshot(sheet);
    });
  }

  async reopen(
    actor: SheetActor,
    id: string,
    body: unknown,
  ): Promise<SheetSnapshot> {
    this.assertSheetActor(actor);
    const dto = await this.validateMutation(
      ReopenSaleSheetDto,
      body,
      "Dados inválidos. Confira a versão e a data de finalização do pedido.",
    );
    return this.repository.transact((sheets) => {
      const sheet = this.findOwnedIn(sheets, actor, id);
      const last =
        sheet.operationalHistory?.[sheet.operationalHistory.length - 1];
      if (
        !sheet.finalizedAt &&
        last?.action === "reopen" &&
        last.expectedVersion === dto.expectedVersion &&
        last.resultVersion === this.adminVersion(sheet) &&
        last.finalizedAt === dto.expectedFinalizedAt
      )
        return this.toSnapshot(sheet);
      this.assertRevision(sheet, dto.expectedVersion);
      if (!sheet.finalizedAt || sheet.finalizedAt !== dto.expectedFinalizedAt)
        throw new ConflictException(
          "A finalização do pedido mudou. Recarregue antes de reabrir.",
        );
      const resultVersion = this.nextOperationalVersion(sheet);
      const at = new Date(
        Math.max(Date.now(), last ? Date.parse(last.at) + 1 : 0),
      ).toISOString();
      delete sheet.finalizedAt;
      delete sheet.finalizedById;
      delete sheet.finalizedByName;
      sheet.operationalVersion = resultVersion;
      (sheet.operationalHistory ||= []).push({
        action: "reopen",
        at,
        actorId: actor.id,
        actorName: actor.name,
        expectedVersion: dto.expectedVersion,
        resultVersion,
        finalizedAt: dto.expectedFinalizedAt,
      });
      // Metadata only: never unarchive, un-revoke, unsubmit, render or send CRM.
      return this.toSnapshot(sheet);
    });
  }

  async archive(
    actor: SheetActor,
    id: string,
    body: unknown,
  ): Promise<SheetSnapshot> {
    this.assertSheetActor(actor);
    const dto = await this.validateMutation(SheetRevisionDto, body);
    return this.repository.transact((sheets) => {
      const sheet = this.findOwnedIn(sheets, actor, id);
      this.assertRevision(sheet, dto.revision);
      if (sheet.archivedAt) return this.toSnapshot(sheet);
      if (!sheet.submittedAt && !sheet.revoked)
        throw new ConflictException(
          "Só é possível arquivar fichas recebidas ou canceladas.",
        );
      // Metadata only: keep the submitted revision/document and frozen CRM payload.
      sheet.archivedAt = new Date().toISOString();
      sheet.archivedBy = actor.id;
      return this.toSnapshot(sheet);
    });
  }

  async unarchive(
    actor: SheetActor,
    id: string,
    body: unknown,
  ): Promise<SheetSnapshot> {
    this.assertSheetActor(actor);
    const dto = await this.validateMutation(
      UnarchiveSaleSheetDto,
      body,
      "Dados inválidos. Confira a revisão e a data de arquivamento do pedido.",
    );
    return this.repository.transact((sheets) => {
      const sheet = this.findOwnedIn(sheets, actor, id);
      if (this.adminVersion(sheet) !== dto.revision)
        throw new ConflictException(
          "O pedido foi atualizado. Recarregue antes de continuar.",
        );
      // A lost response can be replayed, but must never clear a later archive cycle.
      if (!sheet.archivedAt) return this.toSnapshot(sheet);
      if (sheet.archivedAt !== dto.archivedAt)
        throw new ConflictException(
          "O arquivamento do pedido mudou. Recarregue antes de desarquivar.",
        );
      // Metadata only: never reactivate links or normalize/render/retry frozen work.
      delete sheet.archivedAt;
      delete sheet.archivedBy;
      return this.toSnapshot(sheet);
    });
  }

  async rotateLink(
    actor: SheetActor,
    id: string,
  ): Promise<{ sheet: SheetSnapshot; token: string }> {
    const token = randomBytes(32).toString("base64url");
    const output = await this.repository.transact((sheets) => {
      const sheet = this.findOwnedIn(sheets, actor, id);
      this.assertPending(sheet);
      if (sheet.revoked)
        throw new ConflictException(
          "A ficha está revogada; não é possível rotacionar o link.",
        );
      sheet.tokenHash = sha256(token);
      sheet.linkExpiresAt = new Date(Date.now() + 7 * DAY_MS).toISOString();
      sheet.revision += 1;
      return this.toSnapshot(sheet);
    });
    return { sheet: output, token };
  }

  async revokeLink(actor: SheetActor, id: string): Promise<SheetSnapshot> {
    return this.repository.transact((sheets) => {
      const sheet = this.findOwnedIn(sheets, actor, id);
      this.assertPending(sheet);
      if (!sheet.revoked) {
        sheet.revoked = true;
        sheet.revision += 1;
      }
      return this.toSnapshot(sheet);
    });
  }

  async getPublic(token: string): Promise<PublicSheet> {
    const sheet = await this.findPublic(token);
    return this.toPublic(sheet);
  }

  async submitPublic(
    token: string,
    idempotencyKeyHeader: unknown,
    body: unknown,
  ): Promise<SubmissionResult> {
    const key = assertIdempotencyKey(idempotencyKeyHeader);
    const dto = await validateInput(SubmitPublicSheetDto, body);
    const customer = this.normalizeCustomer(
      await validateInput(SheetCustomerDto, dto.customer),
    );
    assertCustomerSemantics(customer);
    const tokenHash = sha256(token);
    const keyHash = sha256(key);
    const bodyHash = sha256(stableJson({ customer, accepted: true }));

    const frozen = await this.repository.transact((sheets) => {
      const sheet = sheets.find((entry) => entry.tokenHash === tokenHash);
      if (!sheet) throw new NotFoundException("Ficha pública não encontrada.");
      this.assertPublicAvailable(sheet);
      if (sheet.submittedAt) {
        if (
          sheet.submissionKeyHash === keyHash &&
          sheet.submissionBodyHash === bodyHash
        ) {
          return {
            sheetId: sheet.id,
            needsRender: sheet.pdf.status === "waiting",
            needsCrmDelivery:
              sheet.crm.deliveryMode === this.crmDelivery.mode &&
              sheet.crm.status === "waiting" &&
              Boolean(sheet.crmDelivery),
          };
        }
        if (sheet.submissionKeyHash === keyHash) {
          throw new ConflictException(
            "A mesma chave de idempotência foi usada com dados diferentes.",
          );
        }
        throw new ConflictException(
          "Esta ficha já foi enviada e não pode ser substituída.",
        );
      }

      // Recheck only the first submission, under the repository transaction.
      // Existing snapshots, idempotent replays and PDF recovery keep their deadline.
      if (sheet.delivery === "date") {
        assertDeadlineNotPast(sheet.deadline, {
          code: "delivery_deadline_expired",
          message:
            "O prazo máximo de entrega desta ficha venceu. Entre em contato com a CompreFi para revisar a negociação e receber uma nova ficha.",
        });
      }

      const issuedAt = new Date().toISOString();
      sheet.customer = clone(customer);
      sheet.submittedAt = issuedAt;
      sheet.contractIssuedAt = issuedAt;
      sheet.contractTemplateVersion = this.renderer.version;
      sheet.contractMode =
        this.renderer.version === commercialContractTemplateVersion
          ? "commercial"
          : "demonstration";
      sheet.crmPayloadVersion = CRM_PAYLOAD_VERSION;
      sheet.sellerSnapshot = clone(this.seller);
      sheet.submissionKeyHash = keyHash;
      sheet.submissionBodyHash = bodyHash;
      sheet.revision += 1;
      // The repository commits this state before any renderer is called.
      const needsCrmDelivery = this.freezeCrmDelivery(sheet);
      return { sheetId: sheet.id, needsRender: true, needsCrmDelivery };
    });
    await Promise.allSettled([
      ...(frozen.needsRender
        ? [this.renderPendingContract(frozen.sheetId)]
        : []),
      ...(frozen.needsCrmDelivery
        ? [this.dispatchPendingCrmDelivery(frozen.sheetId)]
        : []),
    ]);
    const persisted = await this.repository.get(frozen.sheetId);
    if (!persisted)
      throw new InternalServerErrorException(
        "Ficha persistida indisponível após o cadastro.",
      );
    return this.submissionResult(persisted);
  }

  async getContract(
    actor: SheetActor,
    id: string,
  ): Promise<{ filename: string; buffer: Buffer }> {
    const sheet = await this.findOwned(actor, id);
    if (!sheet.submittedAt || !sheet.customer)
      throw new ConflictException(
        "O cadastro público ainda não foi concluído.",
      );
    if (sheet.pdf.status !== "ready" || !sheet.contractSha256) {
      throw new InternalServerErrorException("Documento privado indisponível.");
    }
    let buffer: Buffer;
    try {
      buffer = await this.repository.readDocument(sheet.id, sheet.revision);
      if (!buffer) throw new Error("missing document");
    } catch {
      throw new InternalServerErrorException("Documento privado indisponível.");
    }
    const expected = Buffer.from(sheet.contractSha256, "hex");
    const actual = Buffer.from(sha256(buffer), "hex");
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new InternalServerErrorException("Documento privado indisponível.");
    }
    return { filename: `${sheet.reference}.pdf`, buffer };
  }

  async retryContract(actor: SheetActor, id: string): Promise<SheetSnapshot> {
    const scheduled = await this.repository.transact((sheets) => {
      const sheet = this.findOwnedIn(sheets, actor, id);
      if (
        !sheet.submittedAt ||
        !sheet.customer ||
        !sheet.sellerSnapshot ||
        !sheet.contractIssuedAt ||
        !sheet.contractTemplateVersion
      ) {
        throw new ConflictException(
          "O cadastro público ainda não foi concluído.",
        );
      }
      if (sheet.pdf.status === "ready")
        throw new ConflictException(
          "PDF pronto é imutável e não pode ser regenerado.",
        );
      if (sheet.pdf.status === "sending" && !this.expired(sheet.pdf))
        throw new ConflictException(
          "O PDF está sendo preparado por uma instância ativa.",
        );
      sheet.pdf = { status: "waiting", attempts: sheet.pdf.attempts };
      return sheet.id;
    });
    await this.renderPendingContract(scheduled);
    const sheet = await this.repository.get(scheduled);
    if (!sheet)
      throw new InternalServerErrorException(
        "Ficha persistida indisponível durante a regeneração.",
      );
    return this.toSnapshot(sheet);
  }

  async crmPayload(actor: SheetActor, id: string): Promise<unknown> {
    this.assertAdmin(actor);
    const sheet = await this.findOwned(actor, id);
    if (!sheet.submittedAt || !sheet.customer)
      throw new ConflictException(
        "O cadastro público ainda não foi concluído.",
      );
    if (sheet.crmDelivery?.payloadJson) {
      return JSON.parse(sheet.crmDelivery.payloadJson) as unknown;
    }
    return buildCrmPayload(sheet);
  }

  async retryCrm(actor: SheetActor, id: string): Promise<SheetSnapshot> {
    this.assertAdmin(actor);
    const retry = await this.repository.transact((sheets) => {
      const sheet = this.findOwnedIn(sheets, actor, id);
      if (!sheet.submittedAt)
        throw new ConflictException(
          "O cadastro público ainda não foi concluído.",
        );
      if (sheet.crm.status === "sending" && this.expired(sheet.crm)) {
        sheet.crm = { ...sheet.crm, status: "uncertain", error: CRM_UNCERTAIN };
        delete sheet.crm.leaseId;
        delete sheet.crm.leaseUntil;
        return { needsDelivery: false };
      }
      if (sheet.crm.status === "disabled") return { needsDelivery: false };
      if (sheet.crm.deliveryMode !== this.crmDelivery.mode) {
        return { needsDelivery: false };
      }
      if (
        sheet.crm.status === "sent" ||
        sheet.crm.status === "sending" ||
        sheet.crm.status === "uncertain"
      ) {
        throw new ConflictException(
          "Esta entrega CRM já possui resultado técnico e não pode ser reenviada automaticamente.",
        );
      }
      if (sheet.crm.status === "waiting") {
        return { needsDelivery: Boolean(sheet.crmDelivery) };
      }
      // `failed` is exclusively a preparation failure: no network attempt was
      // made, so the frozen payload may be prepared again by an ADMIN.
      const needsDelivery = this.freezeCrmDelivery(sheet);
      return { needsDelivery };
    });
    if (retry.needsDelivery) {
      await Promise.allSettled([this.dispatchPendingCrmDelivery(id)]);
    }
    const sheet = await this.repository.get(id);
    if (!sheet)
      throw new InternalServerErrorException(
        "Ficha persistida indisponível durante a preparação CRM.",
      );
    return this.toSnapshot(sheet);
  }

  private async normalizeTerms(terms: SheetTermsDto): Promise<SheetTerms> {
    if (!terms.items.length)
      throw new BadRequestException("A ficha deve conter ao menos um item.");
    const catalog = await this.catalog.list();
    const variants = new Map(catalog.map((item) => [item.id, item]));
    const items: SheetItem[] = terms.items.map((item) => {
      const variant = item.variantId ? variants.get(item.variantId) : undefined;
      if (item.variantId && !variant)
        throw new BadRequestException("Variante de catálogo inválida.");
      if (variant) {
        const condition =
          variant.condition || this.declaredCatalogCondition(item.condition);
        return this.catalogItemToSheetItem(variant, item.quantity, condition);
      }
      if (item.image)
        throw new BadRequestException(
          "Itens manuais não podem informar imagem.",
        );
      const product = this.requiredText(item.product, "items.product");
      const color = this.requiredText(item.color, "items.color");
      const storage = this.requiredText(item.storage, "items.storage");
      const condition = this.requiredText(item.condition, "items.condition");
      return {
        lineId: randomUUID(),
        variantId: null,
        groupSlug: item.groupSlug.trim(),
        product,
        color,
        storage,
        condition,
        quantity: item.quantity,
        image: "",
        crmMappingStatus: "manual",
      };
    });

    const base = assertMoney(terms.base, "base");
    const pix = assertMoney(terms.pix, "pix");
    const card = assertMoney(terms.card, "card");
    this.assertPayment(terms.payment, base, pix, card);
    this.assertTrade(terms);
    if (terms.delivery === "date") {
      assertDeadlineNotPast(terms.deadline);
    } else if (terms.deadline !== "") {
      throw new BadRequestException(
        "deadline deve estar vazia para entrega padrão.",
      );
    }
    return {
      whatsapp: this.requiredText(terms.whatsapp, "whatsapp"),
      items,
      base: base / 100,
      payment: terms.payment,
      pix: pix / 100,
      card: card / 100,
      installments: terms.installments,
      hasTrade: terms.hasTrade,
      tradeModel: terms.tradeModel.trim(),
      tradeStorage: terms.tradeStorage.trim(),
      tradeColor: terms.tradeColor.trim(),
      credit: assertMoney(terms.credit, "credit") / 100,
      imei: terms.imei.trim(),
      tradeNotes: terms.tradeNotes.trim(),
      delivery: terms.delivery,
      deadline: terms.deadline,
      deliveryMode: this.requiredText(terms.deliveryMode, "deliveryMode"),
      notes: terms.notes.trim(),
    };
  }

  private catalogItemToSheetItem(
    item: CatalogItem,
    quantity: number,
    condition = item.condition,
  ): SheetItem {
    const isDeclaredSeminovo =
      !item.condition.trim() && condition === "Seminovo";
    const mapping =
      !isDeclaredSeminovo &&
      item.crmMappingStatus === "confirmed" &&
      item.crmSku
        ? {
            crmMappingStatus: "confirmed" as const,
            crmSku: item.crmSku,
            ...(item.crmProductId ? { crmProductId: item.crmProductId } : {}),
          }
        : { crmMappingStatus: "pending" as const };
    return {
      lineId: randomUUID(),
      variantId: item.id,
      groupSlug: item.groupSlug,
      product: item.product,
      color: item.color,
      storage: item.storage,
      condition,
      quantity,
      image: item.image,
      ...mapping,
    };
  }

  private declaredCatalogCondition(value: string): string {
    const normalized = value.trim();
    if (normalized !== "Novo e lacrado" && normalized !== "Seminovo") {
      throw new BadRequestException(
        "A variante sem condição de catálogo exige condição declarada: Novo e lacrado ou Seminovo.",
      );
    }
    return normalized;
  }

  private assertPayment(
    payment: SheetTerms["payment"],
    base: number,
    pix: number,
    card: number,
  ): void {
    if (payment === "pix" && (pix !== base || card !== 0)) {
      throw new BadRequestException(
        "Pagamento PIX exige PIX igual ao valor base e cartão igual a zero.",
      );
    }
    if (payment === "card" && (pix !== 0 || card < base)) {
      throw new BadRequestException(
        "Pagamento no cartão exige PIX igual a zero e cartão ao menos igual ao valor base.",
      );
    }
    if (payment === "mixed" && !(pix > 0 && pix < base && card >= base - pix)) {
      throw new BadRequestException(
        "Pagamento misto exige PIX entre zero e o valor base e cartão suficiente para o saldo.",
      );
    }
  }

  private assertTrade(terms: SheetTermsDto): void {
    const tradeDetails = [
      terms.tradeModel,
      terms.tradeStorage,
      terms.tradeColor,
      terms.imei,
      terms.tradeNotes,
    ].some((value) => value.trim() !== "");
    const credit = assertMoney(terms.credit, "credit");
    if (!terms.hasTrade && (tradeDetails || credit !== 0)) {
      throw new BadRequestException(
        "Dados e crédito de troca só podem existir quando hasTrade é verdadeiro.",
      );
    }
    if (
      terms.hasTrade &&
      (![terms.tradeModel, terms.tradeStorage, terms.tradeColor].every(
        (value) => value.trim(),
      ) ||
        credit <= 0)
    ) {
      throw new BadRequestException(
        "Troca exige modelo, armazenamento, cor e crédito maior que zero.",
      );
    }
    // base is already the negotiated financial amount. Credit is recorded separately and is never applied again here.
  }

  private async renderPersistedContract(
    sheet: StoredSheet,
  ): Promise<{ buffer?: Buffer; error?: string }> {
    try {
      if (
        !sheet.sellerSnapshot ||
        !sheet.customer ||
        !sheet.contractIssuedAt ||
        !sheet.contractTemplateVersion
      ) {
        throw new Error("snapshot contractual ausente");
      }
      const buffer = await this.renderer.render(sheet, sheet.sellerSnapshot);
      if (
        !Buffer.isBuffer(buffer) ||
        buffer.length === 0 ||
        buffer.length > MAX_CONTRACT_BYTES
      )
        throw new Error("renderer retornou documento vazio");
      return { buffer };
    } catch {
      return {
        error: "Falha ao gerar o PDF privado. Use a tentativa de regeneração.",
      };
    }
  }

  /** Claim and CAS completion are both serialized across all PostgreSQL replicas. */
  private async renderPendingContract(sheetId: string): Promise<void> {
    const claim = await this.repository.transact((sheets) => {
      const sheet = sheets.find((entry) => entry.id === sheetId);
      if (!sheet?.submittedAt || sheet.pdf.status === "ready") return undefined;
      if (sheet.pdf.status === "sending" && !this.expired(sheet.pdf))
        return undefined;
      if (sheet.pdf.status !== "waiting" && sheet.pdf.status !== "sending")
        return undefined;
      const leaseId = randomUUID();
      sheet.pdf = {
        status: "sending",
        attempts: sheet.pdf.attempts + 1,
        leaseId,
        leaseUntil: new Date(Date.now() + this.leaseMs).toISOString(),
      };
      return { sheet: clone(sheet), leaseId };
    });
    if (!claim) return;
    // Rendering is deliberately OUTSIDE the database transaction.
    const rendered = await this.renderPersistedContract(claim.sheet);
    await this.repository.transact((sheets, documents) => {
      const sheet = sheets.find((entry) => entry.id === sheetId);
      if (
        !sheet ||
        sheet.pdf.status !== "sending" ||
        sheet.pdf.leaseId !== claim.leaseId
      )
        return;
      if (rendered.buffer) {
        const checksum = sha256(rendered.buffer);
        documents.create(sheet.id, sheet.revision, rendered.buffer, checksum);
        sheet.contractSha256 = checksum;
        sheet.pdf = { status: "ready", attempts: sheet.pdf.attempts };
      } else {
        sheet.pdf = {
          status: "failed",
          attempts: sheet.pdf.attempts,
          error: rendered.error || "Falha ao gerar PDF privado.",
        };
      }
    });
  }

  /**
   * Builds the CRM JSON exactly once from the submitted snapshot. Mapping or
   * serialization failures happen before any HTTP request and are the only
   * state classified as `failed`.
   */
  private freezeCrmDelivery(sheet: StoredSheet): boolean {
    const enabled =
      this.crmDelivery.mode !== "disabled" &&
      sheet.crm.deliveryMode === this.crmDelivery.mode;
    if (sheet.crmDelivery) return enabled && sheet.crm.status === "waiting";
    try {
      const payloadJson = stableJson(buildCrmPayload(sheet));
      sheet.crmDelivery = {
        payloadJson,
        payloadHash: sha256(payloadJson),
        // A deterministic receiver key is necessary but does not establish
        // exactly-once delivery across a crash at the network boundary.
        deliveryKey: `${sheet.id}:${sheet.revision}`,
      };
      sheet.crm = {
        status: enabled ? "waiting" : "disabled",
        attempts: sheet.crm.attempts,
        deliveryMode: this.crmDelivery.mode,
      };
      return enabled;
    } catch {
      delete sheet.crmDelivery;
      sheet.crm = {
        status: enabled ? "failed" : "disabled",
        attempts: sheet.crm.attempts,
        deliveryMode: this.crmDelivery.mode,
        error: CRM_PREPARATION_FAILED,
      };
      return false;
    }
  }

  /** One durable attempt BEFORE HTTP; never retry an uncertain remote effect. */
  private async dispatchPendingCrmDelivery(sheetId: string): Promise<void> {
    const claim = await this.repository.transact((sheets) => {
      const sheet = sheets.find((entry) => entry.id === sheetId);
      if (
        !sheet ||
        this.crmDelivery.mode === "disabled" ||
        sheet.crm.deliveryMode !== this.crmDelivery.mode ||
        sheet.crm.status !== "waiting" ||
        !sheet.crmDelivery
      )
        return undefined;
      const leaseId = randomUUID();
      sheet.crm = {
        status: "sending",
        attempts: sheet.crm.attempts + 1,
        deliveryMode: this.crmDelivery.mode,
        leaseId,
        leaseUntil: new Date(Date.now() + this.leaseMs).toISOString(),
      };
      sheet.crmDelivery.attemptedAt = new Date().toISOString();
      return { delivery: clone(sheet.crmDelivery), leaseId };
    });
    if (!claim) return;
    let status: number | undefined;
    try {
      const response = await this.crmDelivery.send(
        claim.delivery.payloadJson,
        claim.delivery.deliveryKey,
      );
      status = Number.isInteger(response.status) ? response.status : undefined;
    } catch {
      /* Once claimed, even timeout/reset/non2xx is uncertain. */
    }
    await this.repository.transact((sheets) => {
      const sheet = sheets.find((entry) => entry.id === sheetId);
      if (
        !sheet ||
        sheet.crm.status !== "sending" ||
        sheet.crm.leaseId !== claim.leaseId ||
        sheet.crmDelivery?.payloadHash !== claim.delivery.payloadHash
      )
        return;
      if (status !== undefined) sheet.crmDelivery.responseStatus = status;
      sheet.crm =
        status !== undefined && status >= 200 && status < 300
          ? {
              status: "sent",
              attempts: sheet.crm.attempts,
              deliveryMode: this.crmDelivery.mode,
            }
          : {
              status: "uncertain",
              attempts: sheet.crm.attempts,
              deliveryMode: this.crmDelivery.mode,
              error: CRM_UNCERTAIN,
            };
    });
  }

  private normalizeCustomer(customer: SheetCustomerDto): SheetCustomer {
    return {
      name: this.requiredText(customer.name, "customer.name"),
      cpf: customer.cpf,
      phone: customer.phone,
      email: this.requiredText(customer.email, "customer.email"),
      birth: customer.birth,
      cep: customer.cep,
      street: this.requiredText(customer.street, "customer.street"),
      number: this.requiredText(customer.number, "customer.number"),
      complement: customer.complement.trim(),
      district: this.requiredText(customer.district, "customer.district"),
      city: this.requiredText(customer.city, "customer.city"),
      state: customer.state,
      instagram: customer.instagram.trim(),
    };
  }

  private requiredText(value: string, field: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`${field} é obrigatório.`);
    return normalized;
  }

  private async findPublic(token: string): Promise<StoredSheet> {
    if (!token || token.length > 256)
      throw new NotFoundException("Ficha pública não encontrada.");
    const sheet = await this.repository.findByTokenHash(sha256(token));
    if (!sheet) throw new NotFoundException("Ficha pública não encontrada.");
    this.assertPublicAvailable(sheet);
    return sheet;
  }

  private assertPublicAvailable(sheet: StoredSheet): void {
    if (sheet.revoked || Date.parse(sheet.linkExpiresAt) <= Date.now()) {
      throw new GoneException("Este link não está mais disponível.");
    }
  }

  private async findOwned(actor: SheetActor, id: string): Promise<StoredSheet> {
    const sheet = await this.repository.get(id);
    if (!sheet || (actor.role !== "ADMIN" && sheet.createdBy.id !== actor.id)) {
      throw new NotFoundException("Ficha não encontrada.");
    }
    return sheet;
  }

  private findOwnedIn(
    sheets: StoredSheet[],
    actor: SheetActor,
    id: string,
  ): StoredSheet {
    const sheet = sheets.find((entry) => entry.id === id);
    if (!sheet || (actor.role !== "ADMIN" && sheet.createdBy.id !== actor.id)) {
      throw new NotFoundException("Ficha não encontrada.");
    }
    return sheet;
  }

  private assertPending(sheet: StoredSheet): void {
    if (sheet.submittedAt)
      throw new ConflictException(
        "A ficha já foi enviada e não pode ter o link alterado.",
      );
    if (sheet.archivedAt)
      throw new ConflictException(
        "Esta ficha está arquivada e não pode ser alterada.",
      );
  }

  private assertEditable(sheet: StoredSheet): void {
    if (sheet.submittedAt)
      throw new ConflictException(
        "Esta ficha já recebeu o cadastro e não pode ser editada.",
      );
    if (sheet.revoked)
      throw new ConflictException(
        "Esta ficha está cancelada e não pode ser alterada.",
      );
    if (sheet.archivedAt)
      throw new ConflictException(
        "Esta ficha está arquivada e não pode ser alterada.",
      );
  }

  private adminVersion(sheet: StoredSheet): number {
    return Math.max(sheet.revision, sheet.operationalVersion || 0);
  }

  private nextOperationalVersion(sheet: StoredSheet): number {
    const current = this.adminVersion(sheet);
    if (current >= 2147483647)
      throw new ConflictException("Limite de versões operacionais atingido.");
    return current + 1;
  }

  private assertRevision(sheet: StoredSheet, expected: number): void {
    if (this.adminVersion(sheet) !== expected)
      throw new ConflictException(
        "A ficha foi atualizada. Recarregue antes de continuar.",
      );
  }

  private assertSheetActor(actor: SheetActor): void {
    if (!actor || !["ADMIN", "SALES"].includes(actor.role))
      throw new ForbiddenException("Seu perfil não permite esta ação.");
  }

  private async validateMutation<T extends object>(
    type: new () => T,
    body: unknown,
    message = "Dados inválidos. Confira a revisão e os dados informados.",
  ): Promise<T> {
    try {
      return await validateInput(type, body);
    } catch (error) {
      if (error instanceof BadRequestException)
        throw new BadRequestException(message);
      throw error;
    }
  }

  private assertAdmin(actor: SheetActor): void {
    if (actor.role !== "ADMIN")
      throw new ForbiddenException("Ação permitida somente para ADMIN.");
  }

  private toSnapshot(sheet: StoredSheet): SheetSnapshot {
    const {
      tokenHash: _token,
      creationKeyHash: _creationKey,
      creationBodyHash: _creationBody,
      editOperations: _edits,
      cancelOperation: _cancel,
      operationalVersion: _operationalVersion,
      operationalHistory: _operationalHistory,
      submissionKeyHash: _key,
      submissionBodyHash: _body,
      contractFile: _file,
      contractSha256: _checksum,
      sellerSnapshot: _seller,
      crmDelivery: _delivery,
      contractMode: _mode,
      crmPayloadVersion: _payloadVersion,
      ...snapshot
    } = sheet;
    const task = ({
      leaseId: _id,
      leaseUntil: _until,
      ...rest
    }: SheetTask): SheetTask => rest;
    return clone({
      ...snapshot,
      revision: this.adminVersion(sheet),
      finalizedAt: snapshot.finalizedAt || null,
      finalizedById: snapshot.finalizedAt
        ? snapshot.finalizedById || null
        : null,
      finalizedByName: snapshot.finalizedAt
        ? snapshot.finalizedByName || null
        : null,
      pdf: task(snapshot.pdf),
      crm: task(snapshot.crm),
      crmAttachment: task(snapshot.crmAttachment),
    });
  }

  private toPublic(sheet: StoredSheet): PublicSheet {
    const {
      id,
      reference,
      createdAt,
      revision,
      linkExpiresAt,
      revoked,
      submittedAt,
      whatsapp,
      items,
      base,
      payment,
      pix,
      card,
      installments,
      hasTrade,
      tradeModel,
      tradeStorage,
      tradeColor,
      credit,
      imei: _imei,
      tradeNotes: _tradeNotes,
      delivery,
      deadline,
      deliveryMode,
      notes: _notes,
    } = sheet;
    const publicItems = items.map(
      ({
        crmProductId: _crmProductId,
        crmSku: _sku,
        crmMappingStatus: _mapping,
        ...item
      }) => item,
    );
    return clone({
      id,
      reference,
      createdAt,
      revision,
      linkExpiresAt,
      revoked,
      submitted: Boolean(submittedAt),
      whatsapp,
      items: publicItems,
      base,
      payment,
      pix,
      card,
      installments,
      hasTrade,
      tradeModel,
      tradeStorage,
      tradeColor,
      credit,
      imei: "",
      tradeNotes: "",
      delivery,
      deadline,
      deliveryMode,
      notes: "",
    });
  }

  private submissionResult(sheet: StoredSheet): SubmissionResult {
    return {
      reference: sheet.reference,
      revision: sheet.revision,
      submitted: true,
      pdfStatus: publicTask(sheet.pdf.status),
      crmStatus: publicTask(sheet.crm.status),
    };
  }

  private reference(now: Date): string {
    const date = now.toISOString().slice(0, 10).replaceAll("-", "");
    return `FV-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
  }
}
