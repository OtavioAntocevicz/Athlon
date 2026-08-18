import pg from "pg";
import { env } from "./env.js";

function databaseHost(): string {
  try {
    return new URL(env.databaseUrl.replace(/^postgres(ql)?:/i, "http:")).hostname;
  } catch {
    return "";
  }
}

/**
 * Rede interna do Railway (*.railway.internal): tráfego não sai à internet;
 * o certificado interno não é de CA pública.
 * Hosts públicos: TLS com verificação de certificado.
 */
function postgresSsl(): { rejectUnauthorized: boolean } | undefined {
  const host = databaseHost();

  if (host.endsWith(".railway.internal")) {
    return env.databaseSsl ? { rejectUnauthorized: false } : undefined;
  }

  if (env.databaseSsl) {
    return { rejectUnauthorized: true };
  }

  return undefined;
}

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: postgresSsl(),
});

pool.on("error", (err) => {
  console.error("[database] Erro inesperado no pool PostgreSQL:", err);
});
