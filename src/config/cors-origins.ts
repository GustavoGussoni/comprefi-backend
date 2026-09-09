const PRODUCTION_ORIGINS = [
  "https://www.comprefi.com",
  "https://comprefi.com",
  "https://comprefi.com.br",
  "https://www.comprefi.com.br",
];

const DEVELOPMENT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
];

export function getCorsOrigins(
  nodeEnv = process.env.NODE_ENV,
  frontendUrl = process.env.FRONTEND_URL,
): string[] {
  const defaultOrigins =
    nodeEnv === "production" ? PRODUCTION_ORIGINS : DEVELOPMENT_ORIGINS;
  const configuredOrigin = frontendUrl?.trim()
    ? new URL(frontendUrl.trim()).origin
    : undefined;

  return Array.from(
    new Set(
      configuredOrigin
        ? [...defaultOrigins, configuredOrigin]
        : defaultOrigins,
    ),
  );
}
