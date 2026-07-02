import cron from "node-cron";
import { supabase } from "../config/supabase.js";
import { relOne } from "../lib/db.js";
import {
  marcarAtrasados,
  gerarMensalidadesParaTurma,
} from "../modules/mensalidades/mensalidades.service.js";
import { sincronizarBloqueiosInadimplencia } from "../lib/inadimplencia.js";
import {
  criarNotificacao,
  criarNotificacaoSemanal,
  usuarioIdDoAluno,
} from "../lib/notificacoes.js";
import { processarAvisosAgendados } from "../modules/avisos/avisos.service.js";

async function notificarNovasMensalidades() {
  const { data: turmas } = await supabase
    .from("Turma")
    .select("id, nome, dia_vencimento");

  for (const turma of turmas ?? []) {
    const { data: matriculas } = await supabase
      .from("MatriculaTurma")
      .select("aluno_id")
      .eq("turma_id", turma.id)
      .eq("afastado", false);

    for (const m of matriculas ?? []) {
      const usuarioId = await usuarioIdDoAluno(m.aluno_id);
      if (!usuarioId) continue;

      const { data: pagamento } = await supabase
        .from("Pagamento")
        .select("id")
        .eq("aluno_id", m.aluno_id)
        .eq("turma_id", turma.id)
        .order("mes_referencia", { ascending: false })
        .limit(1)
        .maybeSingle();

      await criarNotificacao(
        usuarioId,
        "Nova mensalidade",
        `Você tem uma nova mensalidade da turma ${turma.nome} com vencimento no dia ${turma.dia_vencimento}.`,
        "MENSALIDADE_NOVA",
        pagamento?.id ? `/mensalidades/${pagamento.id}` : "/mensalidades",
      );
    }
  }
}

async function notificarAtrasos() {
  const { data: pagamentos } = await supabase
    .from("Pagamento")
    .select("id, aluno_id, turma_id, status, mes_referencia, vencimento, Turma(nome)")
    .eq("status", "ATRASADO");

  for (const p of pagamentos ?? []) {
    const usuarioId = await usuarioIdDoAluno(p.aluno_id);
    if (!usuarioId) continue;
    const turma = relOne(p.Turma as { nome: string } | { nome: string }[] | null);
    if (!turma) continue;
    await criarNotificacaoSemanal(
      usuarioId,
      "Mensalidade em atraso",
      `Sua mensalidade da turma ${turma.nome} está em atraso. Regularize o quanto antes.`,
      `MENSALIDADE_ATRASADA:${p.turma_id}`,
      `/mensalidades/${p.id}`,
    );
  }
}

export async function runAvisosJob() {
  await processarAvisosAgendados();
}

export async function runDiarioJob() {
  await runAvisosJob();
  console.log("[cron] Marcando mensalidades atrasadas...");
  await marcarAtrasados();
  await sincronizarBloqueiosInadimplencia();
  await notificarAtrasos();
}

export async function runMensalJob() {
  console.log("[cron] Gerando mensalidades do mês...");
  const { data: turmas } = await supabase
    .from("Turma")
    .select("id")
    .not("mensalidade_centavos", "is", null);

  for (const turma of turmas ?? []) {
    await gerarMensalidadesParaTurma(turma.id, 1);
  }
  await notificarNovasMensalidades();
  await sincronizarBloqueiosInadimplencia();
}

export function startCronJobs() {
  cron.schedule("0 * * * *", () => {
    void runAvisosJob();
  });

  cron.schedule("0 6 * * *", () => {
    void runDiarioJob();
  });

  cron.schedule("0 7 1 * *", () => {
    void runMensalJob();
  });
}
