import { createHash, randomBytes } from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { execute, generateId, now, query, queryMaybeOne } from "./db.js";
import { AppError } from "../middleware/error-handler.js";

const MFA_ISSUER = "ATHLON";
const BACKUP_CODE_COUNT = 8;

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeBackupCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

function generateBackupCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export function verifyTotp(secret: string, token: string): boolean {
  const normalized = token.replace(/\s/g, "");
  const result = verifySync({ secret, token: normalized });
  return result.valid;
}

export async function getMfaStatus(usuarioId: string) {
  const row = await queryMaybeOne<{
    mfa_habilitado_em: string | null;
    perfil: string;
  }>(
    `SELECT mfa_habilitado_em, perfil FROM "Usuario" WHERE id = $1`,
    [usuarioId],
  );

  if (!row || row.perfil !== "ADM") {
    throw new AppError(403, "FORBIDDEN", "MFA disponível apenas para administradores");
  }

  const backupRestantes = row.mfa_habilitado_em
    ? (
        await queryMaybeOne<{ total: string }>(
          `SELECT COUNT(*)::text AS total FROM "MfaBackupCode"
           WHERE usuario_id = $1 AND usado_em IS NULL`,
          [usuarioId],
        )
      )?.total ?? "0"
    : "0";

  return {
    habilitado: !!row.mfa_habilitado_em,
    backupCodesRestantes: parseInt(backupRestantes, 10),
  };
}

export async function iniciarMfaSetup(usuarioId: string, email: string) {
  const row = await queryMaybeOne<{ perfil: string; mfa_habilitado_em: string | null }>(
    `SELECT perfil, mfa_habilitado_em FROM "Usuario" WHERE id = $1`,
    [usuarioId],
  );

  if (!row || row.perfil !== "ADM") {
    throw new AppError(403, "FORBIDDEN", "MFA disponível apenas para administradores");
  }

  if (row.mfa_habilitado_em) {
    throw new AppError(400, "MFA_ALREADY_ENABLED", "MFA já está ativo");
  }

  const secret = generateSecret();
  const otpauthUrl = generateURI({ issuer: MFA_ISSUER, label: email, secret });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  await execute(
    `UPDATE "Usuario" SET mfa_secret = $1, atualizado_em = $2 WHERE id = $3`,
    [secret, now(), usuarioId],
  );

  return { secret, otpauthUrl, qrCodeDataUrl };
}

export async function confirmarMfaSetup(usuarioId: string, codigo: string) {
  const row = await queryMaybeOne<{
    perfil: string;
    mfa_secret: string | null;
    mfa_habilitado_em: string | null;
  }>(
    `SELECT perfil, mfa_secret, mfa_habilitado_em FROM "Usuario" WHERE id = $1`,
    [usuarioId],
  );

  if (!row || row.perfil !== "ADM") {
    throw new AppError(403, "FORBIDDEN", "MFA disponível apenas para administradores");
  }

  if (row.mfa_habilitado_em) {
    throw new AppError(400, "MFA_ALREADY_ENABLED", "MFA já está ativo");
  }

  if (!row.mfa_secret) {
    throw new AppError(400, "MFA_NOT_STARTED", "Inicie a configuração do MFA antes de confirmar");
  }

  if (!verifyTotp(row.mfa_secret, codigo)) {
    throw new AppError(400, "INVALID_MFA_CODE", "Código inválido. Tente novamente.");
  }

  const backupCodes: string[] = [];
  const ts = now();

  await execute(`DELETE FROM "MfaBackupCode" WHERE usuario_id = $1`, [usuarioId]);

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCode();
    backupCodes.push(code);
    await execute(
      `INSERT INTO "MfaBackupCode" (id, usuario_id, codigo_hash, criado_em)
       VALUES ($1, $2, $3, $4)`,
      [generateId(), usuarioId, hashValue(normalizeBackupCode(code)), ts],
    );
  }

  await execute(
    `UPDATE "Usuario" SET mfa_habilitado_em = $1, atualizado_em = $1 WHERE id = $2`,
    [ts, usuarioId],
  );

  return { backupCodes };
}

export async function desabilitarMfa(
  usuarioId: string,
  senha: string,
  codigo: string,
  getSenhaHash: () => Promise<string>,
) {
  const row = await queryMaybeOne<{
    perfil: string;
    mfa_habilitado_em: string | null;
    mfa_secret: string | null;
  }>(
    `SELECT perfil, mfa_habilitado_em, mfa_secret FROM "Usuario" WHERE id = $1`,
    [usuarioId],
  );

  if (!row || row.perfil !== "ADM") {
    throw new AppError(403, "FORBIDDEN", "MFA disponível apenas para administradores");
  }

  if (!row.mfa_habilitado_em) {
    throw new AppError(400, "MFA_NOT_ENABLED", "MFA não está ativo");
  }

  const bcrypt = await import("bcryptjs");
  const valid = await bcrypt.compare(senha, await getSenhaHash());
  if (!valid) {
    throw new AppError(401, "INVALID_PASSWORD", "Senha incorreta");
  }

  const mfaOk = await validarMfaCodigo(usuarioId, row.mfa_secret!, codigo);
  if (!mfaOk) {
    throw new AppError(400, "INVALID_MFA_CODE", "Código inválido");
  }

  await execute(
    `UPDATE "Usuario"
     SET mfa_secret = NULL, mfa_habilitado_em = NULL, atualizado_em = $1
     WHERE id = $2`,
    [now(), usuarioId],
  );
  await execute(`DELETE FROM "MfaBackupCode" WHERE usuario_id = $1`, [usuarioId]);

  return { ok: true as const };
}

export async function validarMfaCodigo(
  usuarioId: string,
  secret: string,
  codigo: string,
): Promise<boolean> {
  const normalized = codigo.replace(/\s/g, "");

  if (/^\d{6}$/.test(normalized)) {
    return verifyTotp(secret, normalized);
  }

  const backup = normalizeBackupCode(normalized);
  if (!/^[A-F0-9]{8}$/.test(backup)) {
    return false;
  }

  const row = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "MfaBackupCode"
     WHERE usuario_id = $1 AND codigo_hash = $2 AND usado_em IS NULL`,
    [usuarioId, hashValue(backup)],
  );

  if (!row) return false;

  await execute(`UPDATE "MfaBackupCode" SET usado_em = $1 WHERE id = $2`, [
    now(),
    row.id,
  ]);

  return true;
}

export async function usuarioRequerMfa(usuarioId: string): Promise<boolean> {
  const row = await queryMaybeOne<{ mfa_habilitado_em: string | null; perfil: string }>(
    `SELECT mfa_habilitado_em, perfil FROM "Usuario" WHERE id = $1`,
    [usuarioId],
  );
  return row?.perfil === "ADM" && !!row.mfa_habilitado_em;
}

export async function obterMfaSecret(usuarioId: string): Promise<string | null> {
  const row = await queryMaybeOne<{ mfa_secret: string | null }>(
    `SELECT mfa_secret FROM "Usuario" WHERE id = $1`,
    [usuarioId],
  );
  return row?.mfa_secret ?? null;
}
