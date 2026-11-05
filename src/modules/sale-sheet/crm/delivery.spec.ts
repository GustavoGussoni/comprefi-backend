import { createHash } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createCrmDeliveryTransport, resolveDeliveryConfig } from "./delivery";
const pinned = (url: string): NodeJS.ProcessEnv => ({
  FICHA_CRM_MODE: "datacrazy",
  FICHA_CRM_DEDICATED_URL: url,
  FICHA_CRM_DEDICATED_URL_SHA256: createHash("sha256")
    .update(url)
    .digest("hex"),
});
describe("Dedicated CRM config and transport", () => {
  it("disabled default does not require URL or perform HTTP", async () => {
    expect(resolveDeliveryConfig({})).toBeUndefined();
    const transport = createCrmDeliveryTransport({});
    expect(transport.mode).toBe("disabled");
    await expect(transport.send("{}", "key")).rejects.toThrow();
  });
  it("requires exact URL pin/allowlist and refuses pin reused for another path/host", () => {
    const env = pinned("https://dedicated.example.test/ficha-venda-only");
    expect(resolveDeliveryConfig(env)?.url).toBe(env.FICHA_CRM_DEDICATED_URL);
    expect(() =>
      resolveDeliveryConfig({
        ...env,
        FICHA_CRM_DEDICATED_URL: "https://dedicated.example.test/other",
      }),
    ).toThrow();
    expect(() =>
      resolveDeliveryConfig({
        ...env,
        FICHA_CRM_DEDICATED_URL_SHA256: undefined,
      }),
    ).toThrow();
    expect(
      resolveDeliveryConfig({
        ...env,
        FICHA_CRM_DEDICATED_URL_SHA256: undefined,
        FICHA_CRM_ALLOWED_URLS_JSON: JSON.stringify([
          env.FICHA_CRM_DEDICATED_URL,
        ]),
      }),
    ).toBeDefined();
  });
  it.each([
    "http://example.test/dedicated",
    "https://localhost/dedicated",
    "https://127.0.0.1/dedicated",
    "https://name:secret@example.test/dedicated",
    "https://example.test/",
    "https://example.test/dedicated?secret=x",
    "https://example.test/dedicated#x",
  ])("rejects invalid/unsafe destination %s", (url) => {
    expect(() => resolveDeliveryConfig(pinned(url))).toThrow();
  });
  it("cannot reuse funnel URL and rejects invalid mode/timeout", () => {
    const env = pinned("https://dedicated.example.test/sheet");
    expect(() =>
      resolveDeliveryConfig({
        ...env,
        DATACRAZY_TRADE_WEBHOOK_URL: env.FICHA_CRM_DEDICATED_URL,
      }),
    ).toThrow();
    expect(() =>
      resolveDeliveryConfig({ ...env, FICHA_CRM_TIMEOUT_MS: "0" }),
    ).toThrow();
    expect(() =>
      resolveDeliveryConfig({ FICHA_CRM_MODE: "local-mock" }),
    ).toThrow();
  });
  it("test mock requires NODE_ENV=test plus numeric loopback and explicit URL allowlist", () => {
    const env = {
      ...pinned("http://127.0.0.1:1234/mock"),
      FICHA_CRM_TEST_LOOPBACK: "true",
      NODE_ENV: "test",
    };
    expect(resolveDeliveryConfig(env)).toMatchObject({
      testOnlyLoopback: true,
    });
    expect(() =>
      resolveDeliveryConfig({ ...env, NODE_ENV: "development" }),
    ).toThrow();
    expect(() =>
      resolveDeliveryConfig({
        ...pinned("http://example.test/mock"),
        FICHA_CRM_TEST_LOOPBACK: "true",
        NODE_ENV: "test",
      }),
    ).toThrow();
  });
  it("local mock sends once, preserves receiver key, returns redirect without following it", async () => {
    const paths: string[] = [];
    let body = "";
    let key = "";
    const server = createServer((request, response) => {
      paths.push(request.url!);
      key = String(request.headers["idempotency-key"]);
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        response.writeHead(302, { Location: "/must-not-follow" });
        response.end("mock");
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mock`;
      const transport = createCrmDeliveryTransport({
        ...pinned(url),
        FICHA_CRM_TEST_LOOPBACK: "true",
        NODE_ENV: "test",
      });
      expect(await transport.send('{"fictitious":true}', "sheet:2")).toEqual({
        status: 302,
      });
      expect(paths).toEqual(["/mock"]);
      expect(body).toBe('{"fictitious":true}');
      expect(key).toBe("sheet:2");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
