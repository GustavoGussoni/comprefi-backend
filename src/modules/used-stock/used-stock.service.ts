import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  Prisma,
  UsedStockStatus,
  type UsedStockHistory,
  type UsedStockUnit,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
import {
  ActivateUsedStockDto,
  CreateUsedStockDto,
  EditableUsedStockDto,
  PatchUsedStockDto,
  TransitionUsedStockDto,
} from "./used-stock.dto";
import {
  UsedStockAdminResponseDto,
  UsedStockPublicResponseDto,
  type UsedStockStatusResponse,
} from "./used-stock.responses";

export type UsedStockActor = {
  id: string;
};

type HistoryWithActor = UsedStockHistory & { actor: { id: string; name: string } };
type UnitWithHistory = UsedStockUnit & { history: HistoryWithActor[] };
type EditableInput = Omit<CreateUsedStockDto, "creationKey">;
type PrismaTransaction = Prisma.TransactionClient;

const EDITABLE_FIELDS = [
  "model",
  "storage",
  "color",
  "battery",
  "details",
  "image",
  "imageIsIllustrative",
  "realImages",
  "pixPrice",
  "installments",
  "installmentPrice",
  "imei",
  "internalNotes",
] as const;

const CREATE_FIELDS = ["creationKey", ...EDITABLE_FIELDS] as const;
const PATCH_FIELDS = ["expectedRevision", ...EDITABLE_FIELDS] as const;
const ACTIVATE_FIELDS = ["expectedRevision", "received", "checked"] as const;
const TRANSITION_FIELDS = ["expectedRevision"] as const;

const ADMIN_INCLUDE = {
  history: {
    orderBy: { at: "asc" as const },
    include: { actor: { select: { id: true, name: true } } },
  },
} as const;

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

function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function asStatus(status: UsedStockStatus): UsedStockStatusResponse {
  return status as UsedStockStatusResponse;
}

function own<T extends object>(object: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/**
 * Persistent inventory for individual physical used devices, deliberately
 * isolated from all legacy flows and external transports.
 */
@Injectable()
export class UsedStockService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(): Promise<UsedStockPublicResponseDto[]> {
    const units = await this.prisma.usedStockUnit.findMany({
      where: { status: UsedStockStatus.available },
      orderBy: [{ activatedAt: "desc" }, { createdAt: "desc" }],
    });
    return units.map((unit) => this.publicResponse(unit));
  }

  async getPublic(id: string): Promise<UsedStockPublicResponseDto> {
    const unit = await this.prisma.usedStockUnit.findFirst({
      where: { id, status: UsedStockStatus.available },
    });
    if (!unit) throw new NotFoundException("Unidade de seminovo não encontrada.");
    return this.publicResponse(unit);
  }

  async listAdmin(): Promise<UsedStockAdminResponseDto[]> {
    const units = await this.prisma.usedStockUnit.findMany({
      orderBy: { createdAt: "desc" },
      include: ADMIN_INCLUDE,
    });
    return units.map((unit) => this.adminResponse(unit));
  }

  async getAdmin(id: string): Promise<UsedStockAdminResponseDto> {
    const unit = await this.findAdmin(this.prisma, id);
    if (!unit) throw new NotFoundException("Unidade de seminovo não encontrada.");
    return this.adminResponse(unit);
  }

  async create(
    actor: UsedStockActor,
    body: unknown,
  ): Promise<UsedStockAdminResponseDto> {
    const dto = await this.dto(CreateUsedStockDto, body, CREATE_FIELDS);
    const editable = this.editable(dto);
    const creationFingerprint = fingerprint(editable);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.usedStockUnit.findUnique({
          where: {
            createdById_creationKey: {
              createdById: actor.id,
              creationKey: dto.creationKey,
            },
          },
          include: ADMIN_INCLUDE,
        });
        if (existing) return this.existingCreation(existing, creationFingerprint);

        const created = await tx.usedStockUnit.create({
          data: {
            creationKey: dto.creationKey,
            creationFingerprint,
            model: editable.model,
            storage: editable.storage,
            color: editable.color,
            battery: editable.battery ?? null,
            details: editable.details ?? "",
            image: editable.image ?? "",
            imageIsIllustrative: editable.imageIsIllustrative ?? true,
            realImages: editable.realImages ?? [],
            pixPrice: new Prisma.Decimal(editable.pixPrice ?? 0),
            installments: editable.installments ?? 12,
            installmentPrice: new Prisma.Decimal(editable.installmentPrice ?? 0),
            imei: this.normalizedImei(editable.imei),
            internalNotes: editable.internalNotes ?? "",
            status: UsedStockStatus.draft,
            createdById: actor.id,
          },
        });
        await tx.usedStockHistory.create({
          data: {
            unitId: created.id,
            actorId: actor.id,
            action: "created",
          },
        });
        const response = await this.findAdmin(tx, created.id);
        if (!response) throw new NotFoundException("Unidade de seminovo não encontrada.");
        return this.adminResponse(response);
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      return this.resolveConcurrentCreate(actor, dto.creationKey, creationFingerprint);
    }
  }

  async patch(
    actor: UsedStockActor,
    id: string,
    body: unknown,
  ): Promise<UsedStockAdminResponseDto> {
    const dto = await this.dto(PatchUsedStockDto, body, PATCH_FIELDS);
    const editable = this.editable(dto);
    if (Object.keys(editable).length === 0) {
      throw new BadRequestException("Informe ao menos um campo editável.");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.usedStockUnit.findUnique({ where: { id } });
        if (!current) throw new NotFoundException("Unidade de seminovo não encontrada.");
        if (current.status !== UsedStockStatus.draft) {
          throw new ConflictException(
            current.status === UsedStockStatus.sold
              ? "Unidade vendida é terminal e não pode ser alterada."
              : "Desative a unidade disponível antes de editá-la.",
          );
        }

        const data: Prisma.UsedStockUnitUpdateManyMutationInput = {
          revision: { increment: 1 },
        };
        for (const field of EDITABLE_FIELDS) {
          if (!own(editable, field)) continue;
          const value = editable[field];
          if (field === "pixPrice" || field === "installmentPrice") {
            data[field] = new Prisma.Decimal(value as number);
          } else if (field === "imei") {
            data.imei = this.normalizedImei(value as string | null | undefined);
          } else {
            data[field] = value as never;
          }
        }

        const updated = await tx.usedStockUnit.updateMany({
          where: {
            id,
            revision: dto.expectedRevision,
            status: UsedStockStatus.draft,
          },
          data,
        });
        if (updated.count !== 1) this.throwStaleOrStatus(current, dto.expectedRevision);

        await tx.usedStockHistory.create({
          data: { unitId: id, actorId: actor.id, action: "updated" },
        });
        const response = await this.findAdmin(tx, id);
        if (!response) throw new NotFoundException("Unidade de seminovo não encontrada.");
        return this.adminResponse(response);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("Já existe uma unidade com este IMEI.");
      }
      throw error;
    }
  }

  async activate(
    actor: UsedStockActor,
    id: string,
    body: unknown,
  ): Promise<UsedStockAdminResponseDto> {
    const dto = await this.dto(ActivateUsedStockDto, body, ACTIVATE_FIELDS);
    if (dto.received !== true || dto.checked !== true) {
      throw new BadRequestException("Recebimento e conferência devem ser confirmados.");
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.usedStockUnit.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("Unidade de seminovo não encontrada.");
      if (current.status !== UsedStockStatus.draft) {
        throw new ConflictException(
          current.status === UsedStockStatus.sold
            ? "Unidade vendida não pode ser ativada."
            : "A unidade já está disponível.",
        );
      }
      this.assertPublishable(current);

      const now = new Date();
      const updated = await tx.usedStockUnit.updateMany({
        where: { id, revision: dto.expectedRevision, status: UsedStockStatus.draft },
        data: {
          status: UsedStockStatus.available,
          revision: { increment: 1 },
          receivedAt: current.receivedAt ?? now,
          checkedAt: now,
          activatedAt: now,
        },
      });
      if (updated.count !== 1) this.throwStaleOrStatus(current, dto.expectedRevision);

      await tx.usedStockHistory.create({
        data: { unitId: id, actorId: actor.id, action: "activated" },
      });
      const response = await this.findAdmin(tx, id);
      if (!response) throw new NotFoundException("Unidade de seminovo não encontrada.");
      return this.adminResponse(response);
    });
  }

  async deactivate(
    actor: UsedStockActor,
    id: string,
    body: unknown,
  ): Promise<UsedStockAdminResponseDto> {
    const dto = await this.dto(TransitionUsedStockDto, body, TRANSITION_FIELDS);
    return this.transition(actor, id, dto.expectedRevision, UsedStockStatus.available, {
      status: UsedStockStatus.draft,
    }, "deactivated");
  }

  async sold(
    actor: UsedStockActor,
    id: string,
    body: unknown,
  ): Promise<UsedStockAdminResponseDto> {
    const dto = await this.dto(TransitionUsedStockDto, body, TRANSITION_FIELDS);
    return this.transition(actor, id, dto.expectedRevision, UsedStockStatus.available, {
      status: UsedStockStatus.sold,
      soldAt: new Date(),
    }, "sold");
  }

  private async transition(
    actor: UsedStockActor,
    id: string,
    expectedRevision: number,
    requiredStatus: UsedStockStatus,
    change: Prisma.UsedStockUnitUpdateManyMutationInput,
    action: "deactivated" | "sold",
  ): Promise<UsedStockAdminResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.usedStockUnit.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("Unidade de seminovo não encontrada.");
      if (current.status !== requiredStatus) {
        throw new ConflictException(
          current.status === UsedStockStatus.sold
            ? "Unidade vendida é terminal."
            : "A transição não é permitida para o status atual.",
        );
      }

      const updated = await tx.usedStockUnit.updateMany({
        where: { id, revision: expectedRevision, status: requiredStatus },
        data: { ...change, revision: { increment: 1 } },
      });
      if (updated.count !== 1) this.throwStaleOrStatus(current, expectedRevision);

      await tx.usedStockHistory.create({ data: { unitId: id, actorId: actor.id, action } });
      const response = await this.findAdmin(tx, id);
      if (!response) throw new NotFoundException("Unidade de seminovo não encontrada.");
      return this.adminResponse(response);
    });
  }

  private async resolveConcurrentCreate(
    actor: UsedStockActor,
    creationKey: string,
    expectedFingerprint: string,
  ): Promise<UsedStockAdminResponseDto> {
    const existing = await this.findAdmin(this.prisma, undefined, actor.id, creationKey);
    if (!existing) throw new ConflictException("Já existe uma unidade com este IMEI.");
    return this.existingCreation(existing, expectedFingerprint);
  }

  private existingCreation(
    existing: UnitWithHistory,
    expectedFingerprint: string,
  ): UsedStockAdminResponseDto {
    if (existing.creationFingerprint !== expectedFingerprint) {
      throw new ConflictException("A mesma creationKey foi usada com dados diferentes.");
    }
    return this.adminResponse(existing);
  }

  private async findAdmin(
    client: PrismaService | PrismaTransaction,
    id?: string,
    createdById?: string,
    creationKey?: string,
  ): Promise<UnitWithHistory | null> {
    if (id) {
      return client.usedStockUnit.findUnique({ where: { id }, include: ADMIN_INCLUDE });
    }
    if (createdById && creationKey) {
      return client.usedStockUnit.findUnique({
        where: { createdById_creationKey: { createdById, creationKey } },
        include: ADMIN_INCLUDE,
      });
    }
    return null;
  }

  private editable(dto: EditableUsedStockDto): Partial<EditableInput> {
    const output: Partial<EditableInput> = {};
    for (const field of EDITABLE_FIELDS) {
      if (own(dto, field)) output[field] = dto[field] as never;
    }
    return output;
  }

  private normalizedImei(value: string | null | undefined): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private assertPublishable(unit: UsedStockUnit): void {
    if (
      !unit.model.trim() ||
      !unit.storage.trim() ||
      !unit.color.trim() ||
      !unit.battery ||
      !unit.details.trim() ||
      !unit.image.trim() ||
      Number(unit.pixPrice) <= 0 ||
      unit.installments < 1 ||
      unit.installments > 24 ||
      Number(unit.installmentPrice) <= 0
    ) {
      throw new BadRequestException(
        "Para ativar, informe modelo, capacidade, cor, bateria, estado, imagem e valores positivos.",
      );
    }
  }

  private throwStaleOrStatus(current: UsedStockUnit, expectedRevision: number): never {
    if (current.revision !== expectedRevision) {
      throw new ConflictException("A revisão informada está desatualizada.");
    }
    throw new ConflictException("A unidade mudou de status durante a operação.");
  }

  private async dto<T extends object>(
    Type: new () => T,
    body: unknown,
    allowedFields: readonly string[],
  ): Promise<T> {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new BadRequestException("O corpo da requisição deve ser um objeto.");
    }
    for (const key of Object.keys(body)) {
      if (!allowedFields.includes(key)) {
        throw new BadRequestException(`O campo ${key} não é permitido nesta operação.`);
      }
    }
    const dto = plainToInstance(Type, body);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false, value: false },
    });
    if (errors.length) throw new BadRequestException("Dados de seminovo inválidos.");
    return dto;
  }

  private adminResponse(unit: UnitWithHistory): UsedStockAdminResponseDto {
    return {
      id: unit.id,
      revision: unit.revision,
      model: unit.model,
      storage: unit.storage,
      color: unit.color,
      battery: unit.battery,
      details: unit.details,
      image: unit.image,
      imageIsIllustrative: unit.imageIsIllustrative,
      realImages: [...unit.realImages],
      pixPrice: Number(unit.pixPrice),
      installments: unit.installments,
      installmentPrice: Number(unit.installmentPrice),
      imei: unit.imei,
      internalNotes: unit.internalNotes,
      status: asStatus(unit.status),
      createdAt: unit.createdAt.toISOString(),
      updatedAt: unit.updatedAt.toISOString(),
      receivedAt: unit.receivedAt?.toISOString() ?? null,
      checkedAt: unit.checkedAt?.toISOString() ?? null,
      activatedAt: unit.activatedAt?.toISOString() ?? null,
      soldAt: unit.soldAt?.toISOString() ?? null,
      createdById: unit.createdById,
      history: unit.history.map((entry) => ({
        id: entry.id,
        action: entry.action,
        at: entry.at.toISOString(),
        actorId: entry.actorId,
        actorName: entry.actor.name,
      })),
    };
  }

  private publicResponse(unit: UsedStockUnit): UsedStockPublicResponseDto {
    return {
      id: unit.id,
      model: unit.model,
      storage: unit.storage,
      color: unit.color,
      battery: unit.battery,
      details: unit.details,
      image: unit.image,
      imageIsIllustrative: unit.imageIsIllustrative,
      realImages: [...unit.realImages],
      pixPrice: Number(unit.pixPrice),
      installments: unit.installments,
      installmentPrice: Number(unit.installmentPrice),
    };
  }
}
