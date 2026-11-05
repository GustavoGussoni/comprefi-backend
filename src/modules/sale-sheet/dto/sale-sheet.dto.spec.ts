import { BadRequestException } from "@nestjs/common";
import { fictitiousCustomer } from "../contract/fixtures";
import {
  assertCustomerSemantics,
  SheetCustomerDto,
  validateInput,
} from "./sale-sheet.dto";

describe("Validação cadastral da ficha isolada", () => {
  describe("data de nascimento pelo dia civil em America/Sao_Paulo", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-11-05T01:30:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("recusa nascimento amanhã às 22h30 de Brasília mesmo com UTC já no dia seguinte", async () => {
      const customer = await validateInput(SheetCustomerDto, {
        ...fictitiousCustomer,
        birth: "2026-11-05",
      });

      expect(() => assertCustomerSemantics(customer)).toThrow(
        BadRequestException,
      );
      expect(() => assertCustomerSemantics(customer)).toThrow(
        "birth não pode estar no futuro.",
      );
    });

    it.each([
      ["2026-11-05T02:59:59.999Z", "2026-11-04"],
      ["2026-11-05T03:00:00.000Z", "2026-11-05"],
    ])(
      "aceita nascimento hoje em Brasília na virada local: instante %s, nascimento %s",
      async (now, birth) => {
        jest.setSystemTime(new Date(now));
        const customer = await validateInput(SheetCustomerDto, {
          ...fictitiousCustomer,
          birth,
        });

        expect(customer.birth).toBe(birth);
        expect(() => assertCustomerSemantics(customer)).not.toThrow();
      },
    );

    it("continua aceitando nascimento passado, inclusive dia bissexto válido", async () => {
      const customer = await validateInput(SheetCustomerDto, {
        ...fictitiousCustomer,
        birth: "2024-02-29",
      });

      expect(() => assertCustomerSemantics(customer)).not.toThrow();
    });

    it("recusa datas inexistentes no calendário mesmo quando têm formato YYYY-MM-DD", async () => {
      for (const birth of ["2025-02-29", "2024-02-30", "2025-13-01"]) {
        const customer = await validateInput(SheetCustomerDto, {
          ...fictitiousCustomer,
          birth,
        });

        expect(() => assertCustomerSemantics(customer)).toThrow(
          BadRequestException,
        );
        expect(() => assertCustomerSemantics(customer)).toThrow(
          "birth deve ser uma data válida.",
        );
      }
    });
  });

  it("normaliza espaços externos do e-mail, CPF e CEP antes da conferência final", async () => {
    const customer = await validateInput(SheetCustomerDto, {
      ...fictitiousCustomer,
      email: "  Cliente+teste@Example.com  ",
    });
    expect(customer.email).toBe("Cliente+teste@Example.com");
    expect(customer.cpf).toBe("11144477735");
    expect(customer.cep).toBe("00000000");
    expect(() => assertCustomerSemantics(customer)).not.toThrow();
  });

  it.each([
    "clienteexample.com",
    "cliente@@example.com",
    "cliente @example.com",
    "cliente@ example.com",
    "cliente@example",
    "cliente@.example.com",
    "cliente@example..com",
    "",
  ])(
    "recusa e-mail sintaticamente inválido %s mesmo sem frontend",
    async (email) => {
      await expect(
        validateInput(SheetCustomerDto, { ...fictitiousCustomer, email }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each(["11111111111", "11144477734", "00000000000"])(
    "recusa CPF com dígitos inválidos %s mesmo sem frontend",
    async (cpf) => {
      const customer = await validateInput(SheetCustomerDto, {
        ...fictitiousCustomer,
        cpf,
      });
      expect(() => assertCustomerSemantics(customer)).toThrow(
        BadRequestException,
      );
    },
  );

  it("recusa CPF e CEP incompletos no DTO", async () => {
    for (const changed of [{ cpf: "1114447773" }, { cep: "0100100" }]) {
      await expect(
        validateInput(SheetCustomerDto, { ...fictitiousCustomer, ...changed }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it("preserva número S/N e complemento informados pelo cliente", async () => {
    const customer = await validateInput(SheetCustomerDto, {
      ...fictitiousCustomer,
      cep: "01001-000",
      number: "S/N",
      complement: "Apartamento de Teste",
    });
    expect(customer.number).toBe("S/N");
    expect(customer.complement).toBe("Apartamento de Teste");
    expect(customer.cep).toBe("01001000");
  });

  it("continua aceitando complemento opcional vazio", async () => {
    const customer = await validateInput(SheetCustomerDto, {
      ...fictitiousCustomer,
      complement: "",
    });
    expect(customer.complement).toBe("");
  });
});
