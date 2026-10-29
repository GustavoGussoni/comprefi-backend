export type UsedStockStatusResponse = "draft" | "available" | "sold";

export class UsedStockHistoryResponseDto {
  id!: string;
  action!: string;
  at!: string;
  actorId!: string;
  actorName!: string;
}

/** Authenticated admin whitelist. It intentionally excludes creationKey and fingerprint. */
export class UsedStockAdminResponseDto {
  id!: string;
  revision!: number;
  model!: string;
  storage!: string;
  color!: string;
  battery!: number | null;
  details!: string;
  image!: string;
  imageIsIllustrative!: boolean;
  realImages!: string[];
  pixPrice!: number;
  installments!: number;
  installmentPrice!: number;
  imei!: string | null;
  internalNotes!: string;
  status!: UsedStockStatusResponse;
  createdAt!: string;
  updatedAt!: string;
  receivedAt!: string | null;
  checkedAt!: string | null;
  activatedAt!: string | null;
  soldAt!: string | null;
  createdById!: string;
  history!: UsedStockHistoryResponseDto[];
}

/** Public whitelist. No IMEI, notes, lifecycle, user data, history or creation data. */
export class UsedStockPublicResponseDto {
  id!: string;
  model!: string;
  storage!: string;
  color!: string;
  battery!: number | null;
  details!: string;
  image!: string;
  imageIsIllustrative!: boolean;
  realImages!: string[];
  pixPrice!: number;
  installments!: number;
  installmentPrice!: number;
}
