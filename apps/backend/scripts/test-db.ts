import "dotenv/config";
import { pool } from "../src/config/database.js";

async function main() {
  const result = await pool.query(`SELECT id FROM "Usuario" LIMIT 1`);
  console.log("OK - PostgreSQL conectado. Registros de teste:", result.rowCount ?? 0);
  await pool.end();
}

main().catch((err) => {
  console.error("FALHA:", err instanceof Error ? err.message : err);
  process.exit(1);
});
