import { BadRequestException } from "@nestjs/common";
import { Transform, Type, plainToInstance } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsDefined,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  validate,
} from "class-validator";
import type { SheetCustomer } from "../sale-sheet.types";

const TEXT = /^[^\u0000-\u001f\u007f]*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^[A-Za-z0-9._-]{8,128}$/;
const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const digitsOnly = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.replace(/\D/g, "") : value;
const trimmed = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

/** Decorator bundle is deliberately avoided so the allowed API fields stay visible here. */
export class SheetItemDto {
  /** Presentation-only client identifier. A fresh server UUID is always persisted. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  lineId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9._:-]{1,128}$/)
  variantId?: string | null;

  @IsString()
  @MaxLength(120)
  @Matches(TEXT)
  groupSlug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  @Matches(TEXT)
  product!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(TEXT)
  color!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(TEXT)
  storage!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(TEXT)
  condition!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;

  /** Manual rows can never attach a client-selected image. Catalog images are server copied. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;
}

export class SheetTermsDto {
  @Transform(digitsOnly)
  @IsString()
  @Matches(/^\d{11}$/)
  whatsapp!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SheetItemDto)
  items!: SheetItemDto[];

  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(10000000)
  base!: number;

  @IsIn(["pix", "card", "mixed"])
  payment!: "pix" | "card" | "mixed";

  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(10000000)
  pix!: number;

  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(10000000)
  card!: number;

  @IsInt()
  @Min(1)
  @Max(24)
  installments!: number;

  @IsBoolean()
  hasTrade!: boolean;

  @IsString()
  @MaxLength(180)
  @Matches(TEXT)
  tradeModel!: string;

  @IsString()
  @MaxLength(80)
  @Matches(TEXT)
  tradeStorage!: string;

  @IsString()
  @MaxLength(120)
  @Matches(TEXT)
  tradeColor!: string;

  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(10000000)
  credit!: number;

  @IsString()
  @MaxLength(100)
  @Matches(TEXT)
  imei!: string;

  @IsString()
  @MaxLength(1500)
  @Matches(TEXT)
  tradeNotes!: string;

  @IsIn(["standard", "date"])
  delivery!: "standard" | "date";

  @IsString()
  @MaxLength(10)
  @Matches(/^$|^\d{4}-\d{2}-\d{2}$/)
  deadline!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(TEXT)
  deliveryMode!: string;

  @IsString()
  @MaxLength(2000)
  @Matches(TEXT)
  notes!: string;
}

export class SheetRevisionDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  revision!: number;
}

export class UnarchiveSaleSheetDto extends SheetRevisionDto {
  // Match the exact UTC/millisecond timestamp issued by the snapshot; do not trim.
  @IsDefined()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/)
  @IsISO8601({ strict: true, strictSeparator: true })
  archivedAt!: string;
}

export class EditSaleSheetDto extends SheetRevisionDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => SheetTermsDto)
  terms!: SheetTermsDto;
}

export class SheetCustomerDto implements SheetCustomer {
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Matches(TEXT)
  name!: string;

  @Transform(digitsOnly)
  @IsString()
  @Matches(/^\d{11}$/)
  cpf!: string;

  @Transform(digitsOnly)
  @IsString()
  @Matches(/^\d{11}$/)
  phone!: string;

  @Transform(trimmed)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Matches(DATE)
  birth!: string;

  @Transform(digitsOnly)
  @IsString()
  @Matches(/^\d{8}$/)
  cep!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Matches(TEXT)
  street!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(TEXT)
  number!: string;

  @IsString()
  @MaxLength(120)
  @Matches(TEXT)
  complement!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(TEXT)
  district!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(TEXT)
  city!: string;

  @IsIn(BRAZILIAN_STATES)
  state!: string;

  @IsString()
  @MaxLength(120)
  @Matches(TEXT)
  instagram!: string;
}

export class SubmitPublicSheetDto {
  @ValidateNested()
  @Type(() => SheetCustomerDto)
  customer!: SheetCustomerDto;

  @IsBoolean()
  @IsIn([true])
  accepted!: true;
}

function flattenValidationErrors(
  errors: Array<{
    property: string;
    constraints?: object;
    children?: unknown[];
  }>,
  prefix = "",
): string[] {
  return errors.flatMap((error) => {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    const own = error.constraints ? Object.values(error.constraints) : [];
    const children = Array.isArray(error.children)
      ? flattenValidationErrors(
          error.children as Array<{
            property: string;
            constraints?: object;
            children?: unknown[];
          }>,
          path,
        )
      : [];
    return [...own.map((message) => `${path}: ${message}`), ...children];
  });
}

/** Used by the service too: direct method calls cannot bypass HTTP ValidationPipe. */
export async function validateInput<T extends object>(
  type: new () => T,
  body: unknown,
): Promise<T> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Corpo da requisição inválido.");
  }
  const dto = plainToInstance(type, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    validationError: { target: false, value: false },
  });
  if (errors.length)
    throw new BadRequestException(flattenValidationErrors(errors));
  return dto;
}

export function assertCalendarDate(
  value: string,
  field: string,
  allowEmpty = false,
): void {
  if (allowEmpty && value === "") return;
  if (!DATE.test(value))
    throw new BadRequestException(`${field} deve ser uma data válida.`);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${field} deve ser uma data válida.`);
  }
}

/** Calendar-only fields share the same Brazilian day, independently of server TZ. */
function currentBrazilianDate(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function assertCustomerSemantics(customer: SheetCustomer): void {
  assertCalendarDate(customer.birth, "birth");
  if (customer.birth > currentBrazilianDate())
    throw new BadRequestException("birth não pode estar no futuro.");
  const ddd = Number(customer.phone.slice(0, 2));
  if (!(ddd === 0 || (ddd >= 11 && ddd <= 99))) {
    throw new BadRequestException("phone deve conter DDD brasileiro válido.");
  }
  if (!isValidCpf(customer.cpf))
    throw new BadRequestException(
      "cpf deve conter dígitos verificadores válidos.",
    );
}

function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = cpf
      .slice(0, length)
      .split("")
      .reduce(
        (total, value, index) => total + Number(value) * (length + 1 - index),
        0,
      );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function assertDeadlineNotPast(
  value: string,
  message:
    | string
    | {
        code: "delivery_deadline_expired";
        message: string;
      } = "deadline não pode estar no passado no horário de Brasília.",
): void {
  assertCalendarDate(value, "deadline");
  if (value < currentBrazilianDate()) throw new BadRequestException(message);
}

export function assertMoney(value: number, field: string): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 1e-7
  ) {
    throw new BadRequestException(
      `${field} deve ser um valor em reais com no máximo duas casas decimais.`,
    );
  }
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents))
    throw new BadRequestException(`${field} está fora do limite permitido.`);
  return cents;
}

export function assertIdempotencyKey(value: unknown): string {
  if (typeof value !== "string" || !KEY.test(value)) {
    throw new BadRequestException(
      "Idempotency-Key é obrigatório e deve ser uma chave aleatória válida.",
    );
  }
  return value;
}
