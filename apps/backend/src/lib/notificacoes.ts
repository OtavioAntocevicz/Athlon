import { supabase } from "../config/supabase.js";
import { generateId, now, throwOnError } from "./db.js";

export async function criarNotificacao(
  usuarioId: string,
  titulo: string,
  corpo: string,
  tipo: string,
) {
  const result = await supabase.from("Notificacao").insert({
    id: generateId(),
    usuario_id: usuarioId,
    titulo,
    corpo,
    tipo,
    lida: false,
    criado_em: now(),
  });
  throwOnError(result);

  const { enviarPushUsuario } = await import("./push.js");
  await enviarPushUsuario(usuarioId, { title: titulo, body: corpo, url: "/" });
}

const INTERVALO_SEMANAL_MS = 7 * 24 * 60 * 60 * 1000;

export async function notificacaoRecenteExiste(
  usuarioId: string,
  tipo: string,
  intervaloMs = INTERVALO_SEMANAL_MS,
): Promise<boolean> {
  const desde = new Date(Date.now() - intervaloMs).toISOString();
  const { count } = await supabase
    .from("Notificacao")
    .select("*", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("tipo", tipo)
    .gte("criado_em", desde);

  return (count ?? 0) > 0;
}

export async function criarNotificacaoSemanal(
  usuarioId: string,
  titulo: string,
  corpo: string,
  tipo: string,
) {
  const existe = await notificacaoRecenteExiste(usuarioId, tipo);
  if (existe) return;
  await criarNotificacao(usuarioId, titulo, corpo, tipo);
}

export async function usuarioIdDoAluno(alunoId: string): Promise<string | null> {
  const result = await supabase
    .from("Aluno")
    .select("usuario_id")
    .eq("id", alunoId)
    .maybeSingle();
  return result.data?.usuario_id ?? null;
}
