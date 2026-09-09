import { getCorsOrigins } from "./cors-origins";

describe("getCorsOrigins", () => {
  it("keeps localhost origins for development without an external frontend", () => {
    expect(getCorsOrigins("development")).toEqual([
      "http://localhost:5173",
      "http://localhost:5174",
    ]);
  });

  it("adds the configured frontend origin in staging", () => {
    expect(
      getCorsOrigins(
        "staging",
        "https://comprefi-frontend-staging.up.railway.app/admin",
      ),
    ).toEqual([
      "http://localhost:5173",
      "http://localhost:5174",
      "https://comprefi-frontend-staging.up.railway.app",
    ]);
  });

  it("keeps production origins and adds the configured frontend origin", () => {
    expect(
      getCorsOrigins("production", "https://preview.comprefi.com.br/"),
    ).toEqual([
      "https://www.comprefi.com",
      "https://comprefi.com",
      "https://comprefi.com.br",
      "https://www.comprefi.com.br",
      "https://preview.comprefi.com.br",
    ]);
  });

  it("does not duplicate a configured origin that is already allowed", () => {
    expect(
      getCorsOrigins("production", "https://comprefi.com/"),
    ).toEqual([
      "https://www.comprefi.com",
      "https://comprefi.com",
      "https://comprefi.com.br",
      "https://www.comprefi.com.br",
    ]);
  });
});
