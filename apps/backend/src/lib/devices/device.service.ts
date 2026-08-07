import { execute, generateId, now, query, queryMaybeOne } from "../db.js";
import type { RegistrarDispositivoInput } from "@athlon/shared-types";

export type DispositivoRow = {
  id: string;
  usuario_id: string;
  platform: string;
  push_provider: string;
  push_token: string;
  app_version: string | null;
  os_version: string | null;
  device_model: string | null;
  language: string | null;
  timezone: string | null;
  last_seen: string;
  notification_permission: string;
};

export async function registrarDispositivo(
  usuarioId: string,
  input: RegistrarDispositivoInput,
): Promise<{ ok: true }> {
  const ts = now();

  const existing = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Dispositivo" WHERE usuario_id = $1 AND push_token = $2`,
    [usuarioId, input.pushToken],
  );

  if (existing) {
    await execute(
      `UPDATE "Dispositivo"
       SET platform = $1, push_provider = $2, app_version = $3, os_version = $4,
           device_model = $5, language = $6, timezone = $7,
           notification_permission = $8, last_seen = $9, atualizado_em = $9
       WHERE id = $10`,
      [
        input.platform,
        input.pushProvider,
        input.appVersion ?? null,
        input.osVersion ?? null,
        input.deviceModel ?? null,
        input.language ?? null,
        input.timezone ?? null,
        input.notificationPermission ?? "default",
        ts,
        existing.id,
      ],
    );
    return { ok: true };
  }

  await execute(
    `INSERT INTO "Dispositivo" (
       id, usuario_id, platform, push_provider, push_token,
       app_version, os_version, device_model, language, timezone,
       notification_permission, last_seen, criado_em, atualizado_em
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $12)`,
    [
      generateId(),
      usuarioId,
      input.platform,
      input.pushProvider,
      input.pushToken,
      input.appVersion ?? null,
      input.osVersion ?? null,
      input.deviceModel ?? null,
      input.language ?? null,
      input.timezone ?? null,
      input.notificationPermission ?? "default",
      ts,
    ],
  );

  return { ok: true };
}

export async function listarDispositivosDoUsuario(
  usuarioId: string,
): Promise<DispositivoRow[]> {
  return query<DispositivoRow>(
    `SELECT * FROM "Dispositivo" WHERE usuario_id = $1`,
    [usuarioId],
  );
}

export async function invalidarDispositivo(id: string): Promise<void> {
  await execute(`DELETE FROM "Dispositivo" WHERE id = $1`, [id]);
}
