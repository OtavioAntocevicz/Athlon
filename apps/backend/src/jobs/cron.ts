import cron from "node-cron";
import { supabase } from "../config/supabase.js";
import { relOne } from "../lib/db.js";
import { marcarAtrasados, gerarMensalidadesParaTurma } from "../modules/mensalidades/mensalidades.service.js";
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
      await criarNotificacao(
        usuarioId,
        "Nova mensalidade",
        `Você tem uma nova mensalidade da turma ${turma.nome} com vencimento no dia ${turma.dia_vencimento}.`,
        "MENSALIDADE_NOVA",
      );
    }
  }
}

async function notificarAtrasos() {
  const hoje = new Date();
  const { data: pagamentos } = await supabase
    .from("Pagamento")
    .select("aluno_id, turma_id, status, mes_referencia, vencimento, Turma(nome)")
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
    );
  }
}

export function startCronJobs() {
  cron.schedule("0 * * * *", async () => {
    await processarAvisosAgendados();
  });

  cron.schedule("0 6 * * *", async () => {
    console.log("[cron] Marcando mensalidades atrasadas...");
    await marcarAtrasados();
    await sincronizarBloqueiosInadimplencia();
    await notificarAtrasos();
  });

  cron.schedule("0 7 1 * *", async () => {
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
  });
}
