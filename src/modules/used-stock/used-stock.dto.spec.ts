import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  ActivateUsedStockDto,
  CreateUsedStockDto,
  PatchUsedStockDto,
  isKnownUsedStockIllustration,
  isSafeUsedStockImage,
} from "./used-stock.dto";

async function valid(dto: object) {
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe("used-stock DTO", () => {
  const required = {
    creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
    catalogVariantId: "variant-seminovo-1",
  };

  it("aceita somente os dois namespaces aprovados para imagens", () => {
    expect(isSafeUsedStockImage("/assets/test-fixtures/used-stock-fictional-photo.jpg")).toBe(true);
    expect(
      isSafeUsedStockImage("https://www.comprefi.com/assets/test-fixtures/used-stock-fictional-photo.jpg"),
    ).toBe(true);
    for (const image of [
      "/assets/../private.jpg",
      "/assets/test-fixtures/a.jpg?x=1",
      "https://www.comprefi.com/assets/a.jpg#fragment",
      "http://www.comprefi.com/assets/a.jpg",
      "https://evil.example/assets/device.jpg",
      "javascript:alert(1)",
    ]) {
      expect(isSafeUsedStockImage(image)).toBe(false);
    }
  });

  it("bloqueia os três renders históricos em caminhos locais e canônicos", () => {
    expect(isKnownUsedStockIllustration("/assets/used-stock/iphone16-pro-max-natural.jpg")).toBe(true);
    expect(
      isKnownUsedStockIllustration(
        "https://www.comprefi.com/assets/used-stock/iphone12-pro-max-azul.jpg",
      ),
    ).toBe(true);
    expect(isKnownUsedStockIllustration("/assets/test-fixtures/used-stock-fictional-photo.jpg")).toBe(false);
  });

  it("exige somente a variante no create, limita dinheiro e bloqueia controles/identidade injetada", async () => {
    expect(await valid(plainToInstance(CreateUsedStockDto, required))).toHaveLength(0);
    expect(
      await valid(plainToInstance(CreateUsedStockDto, { ...required, catalogVariantId: "" })),
    ).not.toHaveLength(0);
    expect(
      await valid(plainToInstance(CreateUsedStockDto, { ...required, pixPrice: 1.999 })),
    ).not.toHaveLength(0);
    for (const field of ["status", "model", "storage", "color"] as const) {
      expect(
        await valid(plainToInstance(CreateUsedStockDto, { ...required, [field]: "injetado" })),
      ).not.toHaveLength(0);
    }
  });

  it("recusa null em campos não anuláveis, mas permite limpar bateria e IMEI do rascunho", async () => {
    for (const field of [
      "catalogVariantId",
      "details",
      "image",
      "realImages",
      "pixPrice",
      "installments",
      "installmentPrice",
      "imageIsIllustrative",
      "internalNotes",
    ]) {
      expect(
        await valid(plainToInstance(PatchUsedStockDto, { expectedRevision: 1, [field]: null })),
      ).not.toHaveLength(0);
    }
    expect(
      await valid(plainToInstance(PatchUsedStockDto, { expectedRevision: 1, battery: null, imei: null })),
    ).toHaveLength(0);
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

  it("valida fotos reais pela política segura e bloqueia render conhecido", async () => {
    expect(
      await valid(
        plainToInstance(PatchUsedStockDto, {
          expectedRevision: 1,
          realImages: ["/assets/test-fixtures/used-stock-fictional-photo.jpg"],
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
    expect(
      await valid(
        plainToInstance(PatchUsedStockDto, {
          expectedRevision: 1,
          image: "/assets/used-stock/iphone16-pro-max-preto.jpg",
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
