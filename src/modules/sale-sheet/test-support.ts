import type { SheetRepository, StoredSheet } from "./sale-sheet.types";
/** Unit-only fake. Production composition always uses PostgresSheetRepository. */
export class UnitSheetRepository implements SheetRepository {
  rows: StoredSheet[] = [];
  private documents: Record<string, Buffer> = {};
  private gate: Promise<void> = Promise.resolve();
  async list() {
    return structuredClone(this.rows);
  }
  async get(id: string) {
    return structuredClone(this.rows.find((row) => row.id === id));
  }
  async findByTokenHash(hash: string) {
    return structuredClone(this.rows.find((row) => row.tokenHash === hash));
  }
  async readDocument(id: string, revision: number) {
    const doc = this.documents[`${id}:${revision}`];
    return doc ? Buffer.from(doc) : undefined;
  }
  async transact<T>(
    fn: Parameters<SheetRepository["transact"]>[0],
  ): Promise<T> {
    const previous = this.gate;
    let release: () => void;
    this.gate = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    const rows = structuredClone(this.rows);
    const documents = { ...this.documents };
    try {
      const result = await fn(rows, {
        create: (id, revision, bytes) => {
          const key = `${id}:${revision}`;
          if (documents[key]) throw new Error("immutable version");
          documents[key] = Buffer.from(bytes);
        },
      });
      this.rows = rows;
      this.documents = documents;
      return result as T;
    } finally {
      release();
    }
  }
}
