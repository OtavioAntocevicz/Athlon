import pg from "pg";
import { env } from "./env.js";

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  console.error("[database] Erro inesperado no pool PostgreSQL:", err);
});
