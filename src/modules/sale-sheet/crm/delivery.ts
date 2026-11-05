import { createHash } from "node:crypto";
import * as https from "node:https";
import * as http from "node:http";
import { isIP } from "node:net";
import type {
  CrmDeliveryTransport,
  CrmTransportResponse,
} from "../sale-sheet.types";

export class DisabledCrmDeliveryTransport implements CrmDeliveryTransport {
  readonly mode = "disabled" as const;
  async send(): Promise<CrmTransportResponse> {
    throw new Error("CRM disabled: no network transport configured");
  }
}
export type DeliveryConfig = {
  url: string;
  timeoutMs: number;
  testOnlyLoopback: boolean;
};
export function resolveDeliveryConfig(
  env: NodeJS.ProcessEnv,
): DeliveryConfig | undefined {
  const mode = env.FICHA_CRM_MODE || "disabled";
  if (mode === "disabled") return undefined;
  if (mode !== "datacrazy")
    throw new Error("FICHA_CRM_MODE must be disabled or datacrazy");
  const raw = env.FICHA_CRM_DEDICATED_URL || "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Dedicated CRM URL is required");
  }
  if (
    url.href !== raw ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    url.pathname === "/"
  )
    throw new Error(
      "CRM URL must be an exact dedicated destination without credentials/query/fragment",
    );
  const loopback = ["127.0.0.1", "[::1]"].includes(url.hostname);
  const testOnlyLoopback = env.FICHA_CRM_TEST_LOOPBACK === "true";
  if (
    testOnlyLoopback &&
    (env.NODE_ENV !== "test" || !loopback || url.protocol !== "http:")
  )
    throw new Error(
      "Mock transport is allowed only on numeric loopback in NODE_ENV=test",
    );
  if (
    !testOnlyLoopback &&
    (url.protocol !== "https:" ||
      isIP(url.hostname) !== 0 ||
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost"))
  )
    throw new Error(
      "Dedicated CRM destination must use public hostname and HTTPS",
    );
  const exactHash = createHash("sha256").update(raw).digest("hex");
  let allowlist: unknown = [];
  try {
    allowlist = JSON.parse(env.FICHA_CRM_ALLOWED_URLS_JSON || "[]");
  } catch {
    throw new Error("Invalid operator CRM allowlist");
  }
  const approved =
    env.FICHA_CRM_DEDICATED_URL_SHA256 === exactHash ||
    (Array.isArray(allowlist) &&
      allowlist.every((v) => typeof v === "string") &&
      allowlist.includes(raw));
  if (!approved)
    throw new Error(
      "Dedicated CRM URL requires exact operator URL allowlist or SHA256 pin",
    );
  for (const key of [
    "DATACRAZY_TRADE_WEBHOOK_URL",
    "DATACRAZY_QUIZ_WEBHOOK_URL",
    "DATACRAZY_ECONOMY_WEBHOOK_URL",
  ]) {
    if (env[key] && env[key] === raw)
      throw new Error(
        "Existing funnel webhook cannot be reused for sale sheets",
      );
  }
  const timeoutMs = Number(env.FICHA_CRM_TIMEOUT_MS || 5000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000)
    throw new Error("CRM timeout must be 100-30000 ms");
  return { url: raw, timeoutMs, testOnlyLoopback };
}
export class DedicatedCrmDeliveryTransport implements CrmDeliveryTransport {
  readonly mode = "datacrazy" as const;
  constructor(private readonly config: DeliveryConfig) {}
  async send(
    payloadJson: string,
    deliveryKey: string,
  ): Promise<CrmTransportResponse> {
    const url = new URL(this.config.url);
    return new Promise((resolve, reject) => {
      // Native request never follows redirects; all non-2xx remain uncertain.
      const transport = this.config.testOnlyLoopback ? http : https;
      const request = transport.request(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payloadJson),
            "Idempotency-Key": deliveryKey,
          },
        },
        (response) => {
          const status = response.statusCode;
          response.resume();
          response.on("error", reject);
          response.on("end", () => resolve({ status: status || 0 }));
        },
      );
      const timeout = setTimeout(
        () => request.destroy(new Error("CRM deadline exceeded")),
        this.config.timeoutMs,
      );
      request.on("close", () => clearTimeout(timeout));
      request.on("error", reject);
      request.end(payloadJson);
    });
  }
}
export function createCrmDeliveryTransport(
  env: NodeJS.ProcessEnv = process.env,
): CrmDeliveryTransport {
  const config = resolveDeliveryConfig(env);
  return config
    ? new DedicatedCrmDeliveryTransport(config)
    : new DisabledCrmDeliveryTransport();
}
