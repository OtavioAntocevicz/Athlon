import { createHash, randomInt } from "node:crypto";
import { execute, generateId, now } from "./db.js";
import { env } from "../config/env.js";

export const PROFESSOR_INVITE_TTL_MS = 72 * 60 * 60 * 1000;

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateResetCode(): string {
  return String(randomInt(100000, 1000000));
}

async function invalidateRecuperacoesPendentes(usuarioId: string) {
  const ts = now();
  await execute(
    `UPDATE "RecuperacaoSenha" SET usado_em = $1
     WHERE usuario_id = $2 AND usado_em IS NULL AND expira_em > $1`,
    [ts, usuarioId],
  );
}

export async function createProfessorPasswordInvite(usuarioId: string) {
  const codigo = generateResetCode();
  const token = generateId() + generateId();
  const expiraEm = new Date(Date.now() + PROFESSOR_INVITE_TTL_MS).toISOString();
  const ts = now();

  await invalidateRecuperacoesPendentes(usuarioId);

  await execute(
    `INSERT INTO "RecuperacaoSenha" (id, usuario_id, codigo_hash, token_hash, expira_em, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [generateId(), usuarioId, hashValue(codigo), hashValue(token), expiraEm, ts],
  );

  const link = `${env.appUrl.replace(/\/$/, "")}/login/professor/redefinir-senha/${token}?convite=1`;

  return { codigo, link };
}
