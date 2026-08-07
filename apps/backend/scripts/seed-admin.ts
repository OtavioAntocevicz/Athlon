import "dotenv/config";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { pool } from "../src/config/database.js";

const BCRYPT_ROUNDS = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nome = process.env.ADMIN_NOME ?? "Administrador";

  if (!email || !password) {
    console.error("Defina ADMIN_EMAIL e ADMIN_PASSWORD em apps/backend/.env");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("ADMIN_PASSWORD deve ter no mínimo 6 caracteres");
    process.exit(1);
  }

  const existing = await pool.query<{ id: string; perfil: string }>(
    `SELECT id, perfil FROM "Usuario" WHERE email = $1`,
    [email],
  );

  if (existing.rows[0]) {
    if (existing.rows[0].perfil !== "ADM") {
      console.error(`E-mail já cadastrado com perfil ${existing.rows[0].perfil}`);
      process.exit(1);
    }
    console.log("ADM já existe para este e-mail:", email);
    await pool.end();
    process.exit(0);
  }

  const ts = new Date().toISOString();
  const senha_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    await pool.query(
      `INSERT INTO "Usuario" (id, email, nome, senha_hash, perfil, ativo, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, 'ADM', true, $5, $5)`,
      [nanoid(), email, nome, senha_hash, ts],
    );
    console.log("ADM criado com sucesso:", email);
  } catch (err) {
    console.error("Erro ao criar ADM:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
