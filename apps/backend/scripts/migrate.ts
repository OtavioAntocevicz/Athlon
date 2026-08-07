import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "_schema_migrations" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ name: string }>(
    `SELECT name FROM "_schema_migrations" ORDER BY id`,
  );
  return new Set(result.rows.map((r) => r.name));
}

async function main() {
  await ensureMigrationsTable();
  const applied = await appliedMigrations();
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("Nenhuma migration encontrada.");
    process.exit(0);
  }

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[skip] ${file}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO "_schema_migrations" (name) VALUES ($1)`, [file]);
      await client.query("COMMIT");
      console.log(`[ok] ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[fail] ${file}:`, err);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log("Migrations concluídas.");
  await pool.end();
}

main();
