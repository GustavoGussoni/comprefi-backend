import { Transform } from "class-transformer";
import {
  Equals,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from "class-validator";

export const USED_STOCK_TEXT = /^[^\u0000-\u001f\u007f]*$/;
const MAX_MONEY = 9_999_999_999.99;

const supplied = (_object: unknown, value: unknown) => value !== undefined;
const suppliedAndNotNull = (_object: unknown, value: unknown) =>
  value !== undefined && value !== null;
const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
const trimImeiToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return normalized || null;
};

function isSafeAssetPath(pathname: string): boolean {
  if (
    !pathname.startsWith("/assets/") ||
    /[?#\\%\u0000-\u001f\u007f]/.test(pathname) ||
    !/^\/assets\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(pathname)
  ) {
    return false;
  }

  return pathname
    .slice("/assets/".length)
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

/** Only canonical CompreFi assets or the local assets namespace are permitted. */
export function isSafeUsedStockImage(value: string): boolean {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f?#\\]/.test(value)) {
    return false;
  }

  if (value.startsWith("/assets/")) return isSafeAssetPath(value);

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "www.comprefi.com" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      !url.search &&
      !url.hash &&
      isSafeAssetPath(url.pathname)
    );
  } catch {
    return false;
  }
}

@ValidatorConstraint({ name: "safeUsedStockImage", async: false })
class SafeUsedStockImageConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [allowEmpty] = args.constraints as [boolean];
    return (
      typeof value === "string" &&
      ((allowEmpty && value === "") || isSafeUsedStockImage(value))
    );
  }

  defaultMessage(): string {
    return "A imagem deve apontar para /assets/... ou https://www.comprefi.com/assets/... sem consulta ou fragmento.";
  }
}

function IsSafeUsedStockImage(
  allowEmpty: boolean,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: "safeUsedStockImage",
      target: object.constructor,
      propertyName: propertyName.toString(),
      constraints: [allowEmpty],
      options: validationOptions,
      validator: SafeUsedStockImageConstraint,
    });
  };
}

@ValidatorConstraint({ name: "imei15Digits", async: false })
class ImeiConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === "string" && /^\d{15}$/.test(value);
  }

  defaultMessage(): string {
    return "O IMEI deve conter exatamente 15 dígitos.";
  }
}

function IsImei(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: "imei15Digits",
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: ImeiConstraint,
    });
  };
}

/** Editable fields only. Lifecycle, actor, creation fingerprint and status are intentionally absent. */
export class EditableUsedStockDto {
  @ValidateIf(supplied)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  @Matches(USED_STOCK_TEXT)
  model?: string;

  @ValidateIf(supplied)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(USED_STOCK_TEXT)
  storage?: string;

  @ValidateIf(supplied)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(USED_STOCK_TEXT)
  color?: string;

  @ValidateIf(suppliedAndNotNull)
  @IsInt()
  @Min(1)
  @Max(100)
  battery?: number | null;

  @ValidateIf(supplied)
  @Transform(trim)
  @IsString()
  @MaxLength(2_000)
  @Matches(USED_STOCK_TEXT)
  details?: string;

  /** Empty is permitted only while a draft is incomplete; activation rejects it. */
  @ValidateIf(supplied)
  @Transform(trim)
  @IsString()
  @MaxLength(2_048)
  @IsSafeUsedStockImage(true)
  image?: string;

  @ValidateIf(supplied)
  @IsBoolean()
  imageIsIllustrative?: boolean;

  @ValidateIf(supplied)
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2_048, { each: true })
  @IsSafeUsedStockImage(false, { each: true })
  realImages?: string[];

  @ValidateIf(supplied)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_MONEY)
  pixPrice?: number;

  @ValidateIf(supplied)
  @IsInt()
  @Min(1)
  @Max(24)
  installments?: number;

  @ValidateIf(supplied)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_MONEY)
  installmentPrice?: number;

  @ValidateIf(suppliedAndNotNull)
  @Transform(trimImeiToNull)
  @IsString()
  @IsImei()
  imei?: string | null;

  @ValidateIf(supplied)
  @Transform(trim)
  @IsString()
  @MaxLength(1_500)
  @Matches(USED_STOCK_TEXT)
  internalNotes?: string;
}

export class CreateUsedStockDto extends EditableUsedStockDto {
  @IsUUID("4")
  creationKey!: string;

  @ValidateIf(() => true)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  @Matches(USED_STOCK_TEXT)
  declare model: string;

  @ValidateIf(() => true)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(USED_STOCK_TEXT)
  declare storage: string;

  @ValidateIf(() => true)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(USED_STOCK_TEXT)
  declare color: string;
}

export class PatchUsedStockDto extends EditableUsedStockDto {
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}

export class TransitionUsedStockDto {
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}

export class ActivateUsedStockDto extends TransitionUsedStockDto {
  @IsBoolean()
  @Equals(true)
  received!: true;

  @IsBoolean()
  @Equals(true)
  checked!: true;
}
