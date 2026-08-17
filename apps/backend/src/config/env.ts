import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

/** Produção: NODE_ENV ou ambiente Railway (evita setar NODE_ENV no build — quebra install do TypeScript). */
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.RAILWAY_ENVIRONMENT === "production";

if (isProduction && !process.env.CRON_SECRET) {
  throw new Error("CRON_SECRET é obrigatório em produção");
}

if (isProduction && process.env.RECOVERY_SHOW_CODE === "true") {
  throw new Error("RECOVERY_SHOW_CODE deve ser false em produção");
}

export const env = {
  isProduction,
  port: parseInt(process.env.PORT ?? "3001", 10),
  databaseUrl: required("DATABASE_URL"),
  databaseSsl: process.env.DATABASE_SSL === "true",
  jwtSecret: required("JWT_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  /** Uma origem ou várias separadas por vírgula. */
  corsOrigins: (
    process.env.CORS_ORIGIN ??
    "https://athlonsport.app.br,https://www.athlonsport.app.br,http://localhost:5173"
  )
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
  r2AccountId: process.env.R2_ACCOUNT_ID ?? null,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? null,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? null,
  r2Bucket: process.env.R2_BUCKET ?? "athlon-sport",
  r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? null,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? null,
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:suporte@athlonsport.app.br",
  cronSecret: process.env.CRON_SECRET ?? null,
  resendApiKey: process.env.RESEND_API_KEY ?? null,
  emailFrom: process.env.EMAIL_FROM ?? "ATHLON <noreply@athlonsport.app.br>",
  appUrl: process.env.APP_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173",
  /** Temporário: devolve código/link na API e mostra na tela (sem e-mail). Desligar em produção real. */
  recoveryShowCode: process.env.RECOVERY_SHOW_CODE === "true",
  /** Domínio dos cookies de sessão (ex.: .athlonsport.app.br). Vazio em dev local. */
  cookieDomain:
    process.env.COOKIE_DOMAIN?.trim() ||
    (isProduction ? ".athlonsport.app.br" : undefined),
  /** Desabilita node-cron (útil em testes ou múltiplas instâncias com cron externo). */
  cronEnabled: process.env.CRON_ENABLED !== "false",
};
