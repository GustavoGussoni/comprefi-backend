import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
import type {
  SheetRepository,
  StoredSheet,
  SheetDocumentWriter,
} from "./sale-sheet.types";

export const MAX_CONTRACT_BYTES = 2 * 1024 * 1024;
// Shared database-wide lock, NOT an in-process mutex. V1 deliberately favors
// small, bounded sheet batches over parallel snapshot mutation. No HTTP/render
// may run in transact. PostgreSQL READ COMMITTED reads AFTER acquiring the lock.
export const SHEET_DATABASE_LOCK = 1946110401;
@Injectable()
export class PostgresSheetRepository implements SheetRepository {
  constructor(private readonly prisma: PrismaService) {}
  async list(): Promise<StoredSheet[]> {
    const rows = await this.prisma.saleSheet.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => row.snapshot as unknown as StoredSheet);
  }
  async get(id: string): Promise<StoredSheet | undefined> {
    const row = await this.prisma.saleSheet.findUnique({ where: { id } });
    return row ? (row.snapshot as unknown as StoredSheet) : undefined;
  }
  async findByTokenHash(tokenHash: string): Promise<StoredSheet | undefined> {
    const row = await this.prisma.saleSheet.findUnique({
      where: { tokenHash },
    });
    return row ? (row.snapshot as unknown as StoredSheet) : undefined;
  }
  async readDocument(
    sheetId: string,
    revision: number,
  ): Promise<Buffer | undefined> {
    const row = await this.prisma.saleSheetDocument.findUnique({
      where: { sheetId_revision: { sheetId, revision } },
    });
    return row ? Buffer.from(row.bytes) : undefined;
  }
  async transact<T>(
    fn: (
      sheets: StoredSheet[],
      documents: SheetDocumentWriter,
    ) => Promise<T> | T,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${SHEET_DATABASE_LOCK}::bigint)::text`;
        const rows = await tx.saleSheet.findMany();
        const before = new Map(
          rows.map((row) => [row.id, JSON.stringify(row.snapshot)]),
        );
        const sheets = rows.map(
          (row) => row.snapshot as unknown as StoredSheet,
        );
        const pendingDocuments: Array<{
          sheetId: string;
          revision: number;
          bytes: Buffer;
          sha256: string;
        }> = [];
        const result = await fn(sheets, {
          create: (sheetId, revision, bytes, sha256) => {
            if (
              !Buffer.isBuffer(bytes) ||
              bytes.length < 1 ||
              bytes.length > MAX_CONTRACT_BYTES
            )
              throw new Error("PDF exceeds private document limit");
            pendingDocuments.push({ sheetId, revision, bytes, sha256 });
          },
        });
        for (const sheet of sheets) {
          const encoded = JSON.stringify(sheet);
          if (before.get(sheet.id) === encoded) continue;
          const data = {
            ownerId: sheet.createdBy.id,
            tokenHash: sheet.tokenHash,
            creationKeyHash: sheet.creationKeyHash,
            creationBodyHash: sheet.creationBodyHash,
            revision: sheet.revision,
            pdfStatus: sheet.pdf.status,
            crmStatus: sheet.crm.status,
            linkExpiresAt: new Date(sheet.linkExpiresAt),
            snapshot: JSON.parse(encoded) as Prisma.InputJsonValue,
          };
          if (before.has(sheet.id))
            await tx.saleSheet.update({ where: { id: sheet.id }, data });
          else
            await tx.saleSheet.create({
              data: {
                id: sheet.id,
                ...data,
                createdAt: new Date(sheet.createdAt),
              },
            });
          await tx.saleSheetEvent.create({
            data: {
              id: randomUUID(),
              sheetId: sheet.id,
              revision: sheet.revision,
              action: before.has(sheet.id)
                ? `state:pdf=${sheet.pdf.status};crm=${sheet.crm.status};revoked=${sheet.revoked}`
                : "created",
            },
          });
        }
        for (const doc of pendingDocuments) {
          // Plain create, never upsert: a READY version is immutable, including
          // when a stale lease finisher resumes after another process recovered it.
          await tx.saleSheetDocument.create({
            data: {
              id: randomUUID(),
              sheetId: doc.sheetId,
              revision: doc.revision,
              sha256: doc.sha256,
              bytes: Uint8Array.from(doc.bytes),
            },
          });
        }
        return result;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 15000,
        timeout: 15000,
      },
    );
  }
}
