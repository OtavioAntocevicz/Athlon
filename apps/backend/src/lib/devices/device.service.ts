import { supabase } from "../../config/supabase.js";
import { generateId, now, throwOnError } from "../db.js";
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

  const existing = await supabase
    .from("Dispositivo")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("push_token", input.pushToken)
    .maybeSingle();

  if (existing.data) {
    throwOnError(
      await supabase
        .from("Dispositivo")
        .update({
          platform: input.platform,
          push_provider: input.pushProvider,
          app_version: input.appVersion ?? null,
          os_version: input.osVersion ?? null,
          device_model: input.deviceModel ?? null,
          language: input.language ?? null,
          timezone: input.timezone ?? null,
          notification_permission: input.notificationPermission ?? "default",
          last_seen: ts,
          atualizado_em: ts,
        })
        .eq("id", existing.data.id),
    );
    return { ok: true };
  }

  throwOnError(
    await supabase.from("Dispositivo").insert({
      id: generateId(),
      usuario_id: usuarioId,
      platform: input.platform,
      push_provider: input.pushProvider,
      push_token: input.pushToken,
      app_version: input.appVersion ?? null,
      os_version: input.osVersion ?? null,
      device_model: input.deviceModel ?? null,
      language: input.language ?? null,
      timezone: input.timezone ?? null,
      notification_permission: input.notificationPermission ?? "default",
      last_seen: ts,
      criado_em: ts,
      atualizado_em: ts,
    }),
  );

  return { ok: true };
}

export async function listarDispositivosDoUsuario(
  usuarioId: string,
): Promise<DispositivoRow[]> {
  const { data, error } = await supabase
    .from("Dispositivo")
    .select("*")
    .eq("usuario_id", usuarioId);

  if (error) throw error;
  return (data ?? []) as DispositivoRow[];
}

export async function invalidarDispositivo(id: string): Promise<void> {
  await supabase.from("Dispositivo").delete().eq("id", id);
}
