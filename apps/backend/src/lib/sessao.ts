import { createHash, randomBytes } from "node:crypto";
import { execute, generateId, now, queryMaybeOne } from "./db.js";
import { AppError } from "../middleware/error-handler.js";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

type SessaoRow = {
  id: string;
  usuario_id: string;
  revogada_em: string | null;
  expira_em: string;
};

export async function criarSessao(usuarioId: string): Promise<string> {
  const token = generateRefreshToken();
  const id = generateId();
  const ts = now();
  const expiraEm = new Date(Date.now() + REFRESH_TTL_MS).toISOString();

  await execute(
    `INSERT INTO "Sessao" (id, usuario_id, token_hash, expira_em, criado_em)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, usuarioId, hashToken(token), expiraEm, ts],
  );

  return token;
}

export async function revogarTodasSessoes(usuarioId: string): Promise<void> {
  const ts = now();
  await execute(
    `UPDATE "Sessao" SET revogada_em = $1
     WHERE usuario_id = $2 AND revogada_em IS NULL`,
    [ts, usuarioId],
  );
}

export async function revogarSessaoPorToken(refreshToken: string): Promise<void> {
  const ts = now();
  await execute(
    `UPDATE "Sessao" SET revogada_em = $1
     WHERE token_hash = $2 AND revogada_em IS NULL`,
    [ts, hashToken(refreshToken)],
  );
}

/** Rota refresh: invalida o token atual e emite um novo (detecta reutilização). */
export async function rotacionarSessao(
  refreshToken: string,
): Promise<{ usuarioId: string; newRefreshToken: string }> {
  const hash = hashToken(refreshToken);
  const ts = now();

  const sessao = await queryMaybeOne<SessaoRow>(
    `SELECT id, usuario_id, revogada_em, expira_em FROM "Sessao" WHERE token_hash = $1`,
    [hash],
  );

  if (!sessao) {
    throw new AppError(401, "INVALID_TOKEN", "Sessão inválida. Faça login novamente.");
  }

  if (sessao.revogada_em) {
    await revogarTodasSessoes(sessao.usuario_id);
    throw new AppError(401, "SESSION_REUSE", "Sessão inválida. Faça login novamente.");
  }

  if (new Date(sessao.expira_em).getTime() <= Date.now()) {
    await execute(`UPDATE "Sessao" SET revogada_em = $1 WHERE id = $2`, [ts, sessao.id]);
    throw new AppError(401, "INVALID_TOKEN", "Sessão expirada. Faça login novamente.");
  }

  await execute(
    `UPDATE "Sessao" SET revogada_em = $1, ultimo_uso_em = $1 WHERE id = $2`,
    [ts, sessao.id],
  );

  const newRefreshToken = await criarSessao(sessao.usuario_id);
  return { usuarioId: sessao.usuario_id, newRefreshToken };
}
