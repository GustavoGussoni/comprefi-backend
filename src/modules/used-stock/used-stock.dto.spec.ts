import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  ActivateUsedStockDto,
  CreateUsedStockDto,
  PatchUsedStockDto,
  isSafeUsedStockImage,
} from "./used-stock.dto";

async function valid(dto: object) {
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe("used-stock DTO", () => {
  const required = {
    creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
    model: "iPhone 15",
    storage: "128GB",
    color: "Preto",
  };

  it("aceita somente os dois namespaces aprovados para imagens", () => {
    expect(isSafeUsedStockImage("/assets/used-stock/iphone-15.jpg")).toBe(true);
    expect(isSafeUsedStockImage("https://www.comprefi.com/assets/used-stock/iphone-15.jpg")).toBe(true);
    for (const image of [
      "/assets/../private.jpg",
      "/assets/used-stock/a.jpg?x=1",
      "https://www.comprefi.com/assets/a.jpg#fragment",
      "http://www.comprefi.com/assets/a.jpg",
      "https://evil.example/assets/a.jpg",
      "javascript:alert(1)",
    ]) {
      expect(isSafeUsedStockImage(image)).toBe(false);
    }
  });

  it("exige strings identificadoras no create, limita dinheiro a duas casas e bloqueia controles", async () => {
    expect(await valid(plainToInstance(CreateUsedStockDto, required))).toHaveLength(0);
    expect(await valid(plainToInstance(CreateUsedStockDto, { ...required, model: "" }))).not.toHaveLength(0);
    expect(
      await valid(plainToInstance(CreateUsedStockDto, { ...required, pixPrice: 1.999 })),
    ).not.toHaveLength(0);
    expect(
      await valid(plainToInstance(CreateUsedStockDto, { ...required, status: "available" })),
    ).not.toHaveLength(0);
  });

  it("não herda a opcionalidade do patch para campos obrigatórios do create", async () => {
    for (const field of ["model", "storage", "color"] as const) {
      const absent: Partial<typeof required> = { ...required };
      delete absent[field];
      expect(await valid(plainToInstance(CreateUsedStockDto, absent))).not.toHaveLength(0);
      expect(await valid(plainToInstance(CreateUsedStockDto, { ...required, [field]: null }))).not.toHaveLength(0);
    }
  });

  it("recusa null em campos não anuláveis, mas permite limpar bateria e IMEI do rascunho", async () => {
    for (const field of ["model", "storage", "color", "details", "image", "realImages", "pixPrice", "installments", "installmentPrice", "imageIsIllustrative", "internalNotes"]) {
      expect(await valid(plainToInstance(PatchUsedStockDto, { expectedRevision: 1, [field]: null }))).not.toHaveLength(0);
    }
    expect(await valid(plainToInstance(PatchUsedStockDto, { expectedRevision: 1, battery: null, imei: null }))).toHaveLength(0);
  });

  it("converte IMEI em branco para null e restringe IMEI preenchido a 15 dígitos", async () => {
    const blank = plainToInstance(PatchUsedStockDto, { expectedRevision: 1, imei: "  " });
    expect(await valid(blank)).toHaveLength(0);
    expect(blank.imei).toBeNull();
    expect(
      await valid(plainToInstance(PatchUsedStockDto, { expectedRevision: 1, imei: "123" })),
    ).not.toHaveLength(0);
    expect(
      await valid(
        plainToInstance(PatchUsedStockDto, { expectedRevision: 1, imei: "123456789012345" }),
      ),
    ).toHaveLength(0);
  });

  it("valida cada URL de realImages pela mesma política segura", async () => {
    expect(
      await valid(
        plainToInstance(PatchUsedStockDto, {
          expectedRevision: 1,
          realImages: ["/assets/used-stock/iphone-15-real.jpg"],
        }),
      ),
    ).toHaveLength(0);
    expect(
      await valid(
        plainToInstance(PatchUsedStockDto, {
          expectedRevision: 1,
          realImages: ["https://evil.example/assets/device.jpg"],
        }),
      ),
    ).not.toHaveLength(0);
  });

  it("requer received e checked literalmente true para ativar", async () => {
    expect(
      await valid(
        plainToInstance(ActivateUsedStockDto, {
          expectedRevision: 1,
          received: true,
          checked: true,
        }),
      ),
    ).toHaveLength(0);
    expect(
      await valid(
        plainToInstance(ActivateUsedStockDto, {
          expectedRevision: 1,
          received: false,
          checked: true,
        }),
      ),
    ).not.toHaveLength(0);
  });
});
