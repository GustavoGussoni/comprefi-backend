type Environment = Record<string, unknown>;

const REQUIRED_ALWAYS = ["DATABASE_URL", "SECRET_KEY"] as const;
const REQUIRED_IN_PRODUCTION = [
  "FRONTEND_URL",
  "DATACRAZY_TRADE_WEBHOOK_URL",
] as const;

function requireNonEmptyString(
  env: Environment,
  key: string,
  errors: string[],
): string | undefined {
  const value = env[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${key} é obrigatória`);
    return undefined;
  }

  return value.trim();
}

function validateUrl(value: string | undefined, key: string, errors: string[]) {
  if (!value) return;

  try {
    new URL(value);
  } catch {
    errors.push(`${key} deve ser uma URL válida`);
  }
}

export function validateEnvironment(config: Environment): Environment {
  const env: Environment = { ...config };
  const errors: string[] = [];
  const nodeEnv =
    typeof env.NODE_ENV === "string" ? env.NODE_ENV.trim() : "development";

  for (const key of REQUIRED_ALWAYS) {
    env[key] = requireNonEmptyString(env, key, errors);
  }

  if (nodeEnv === "production") {
    for (const key of REQUIRED_IN_PRODUCTION) {
      env[key] = requireNonEmptyString(env, key, errors);
    }
  }

  validateUrl(env.FRONTEND_URL as string | undefined, "FRONTEND_URL", errors);
  validateUrl(
    env.DATACRAZY_TRADE_WEBHOOK_URL as string | undefined,
    "DATACRAZY_TRADE_WEBHOOK_URL",
    errors,
  );

  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push("PORT deve ser um número inteiro entre 1 e 65535");
  }
  env.PORT = port;

  const jwtSecret = env.SECRET_KEY;
  if (typeof jwtSecret === "string" && jwtSecret.length < 32) {
    errors.push("SECRET_KEY deve ter pelo menos 32 caracteres");
  }

  if (errors.length > 0) {
    throw new Error(`Configuração de ambiente inválida: ${errors.join("; ")}`);
  }

  env.NODE_ENV = nodeEnv;
  env.EXPIRES_IN =
    typeof env.EXPIRES_IN === "string" && env.EXPIRES_IN.trim()
      ? env.EXPIRES_IN.trim()
      : "24h";

  return env;
}
