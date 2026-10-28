import cron from "node-cron";
import { query } from "../lib/db.js";
import {
  marcarAtrasados,
  gerarMensalidadesParaTurma,
  type NovaMensalidadeGerada,
} from "../modules/mensalidades/mensalidades.service.js";
import { sincronizarBloqueiosInadimplencia } from "../lib/inadimplencia.js";
import {
  criarNotificacaoSemanal,
  criarNotificacaoUnicaPorTipo,
  usuarioIdsPorAlunos,
} from "../lib/notificacoes.js";
import { processarAvisosAgendados } from "../modules/avisos/avisos.service.js";
import {
  CronJobLockId,
  runScheduledJob,
  withCronAdvisoryLock,
} from "../lib/cron-lock.js";

async function notificarNovasMensalidades(criadas: NovaMensalidadeGerada[]) {
  if (criadas.length === 0) return;

  const alunoIds = [...new Set(criadas.map((c) => c.alunoId))];
  const usuarioPorAluno = await usuarioIdsPorAlunos(alunoIds);

  for (const item of criadas) {
    const usuarioId = usuarioPorAluno.get(item.alunoId);
    if (!usuarioId) continue;

    const tipo = `MENSALIDADE_NOVA:${item.turmaId}:${item.mesChave}`;
    await criarNotificacaoUnicaPorTipo(
      usuarioId,
      "Nova mensalidade",
      `Você tem uma nova mensalidade da turma ${item.turmaNome} com vencimento no dia ${item.diaVencimento}.`,
      tipo,
      `/mensalidades/${item.pagamentoId}`,
    );
  }
}

async function notificarAtrasos() {
  const pagamentos = await query<{
    id: string;
    aluno_id: string;
    turma_id: string;
    turma_nome: string;
  }>(
    `SELECT p.id, p.aluno_id, p.turma_id, t.nome AS turma_nome
     FROM "Pagamento" p
     JOIN "Turma" t ON t.id = p.turma_id
     WHERE p.status = 'ATRASADO'`,
  );

  if (pagamentos.length === 0) return;

  const usuarioPorAluno = await usuarioIdsPorAlunos([
    ...new Set(pagamentos.map((p) => p.aluno_id)),
  ]);

  for (const p of pagamentos) {
    const usuarioId = usuarioPorAluno.get(p.aluno_id);
    if (!usuarioId) continue;
    await criarNotificacaoSemanal(
      usuarioId,
      "Mensalidade em atraso",
      `Sua mensalidade da turma ${p.turma_nome} está em atraso. Regularize o quanto antes.`,
      `MENSALIDADE_ATRASADA:${p.turma_id}`,
      `/mensalidades/${p.id}`,
    );
  }
}

export async function runAvisosJob() {
  await withCronAdvisoryLock(CronJobLockId.avisos, async () => {
    await processarAvisosAgendados();
  });
}

export async function runDiarioJob() {
  await withCronAdvisoryLock(CronJobLockId.diario, async () => {
    await processarAvisosAgendados();
    console.log("[cron] Marcando mensalidades atrasadas...");
    await marcarAtrasados();
    await sincronizarBloqueiosInadimplencia();
    await notificarAtrasos();
  });
}

export async function runMensalJob() {
  await withCronAdvisoryLock(CronJobLockId.mensal, async () => {
    console.log("[cron] Gerando mensalidades do mês...");
    const turmas = await query<{ id: string }>(
      `SELECT id FROM "Turma" WHERE mensalidade_centavos IS NOT NULL`,
    );

    const criadas: NovaMensalidadeGerada[] = [];
    for (const turma of turmas) {
      const novas = await gerarMensalidadesParaTurma(turma.id, 1);
      criadas.push(...novas);
    }

    await notificarNovasMensalidades(criadas);
    await sincronizarBloqueiosInadimplencia();
  });
}

export function startCronJobs() {
  cron.schedule("0 * * * *", () => {
    runScheduledJob("avisos", () => runAvisosJob());
  });

  cron.schedule("0 6 * * *", () => {
    runScheduledJob("diario", () => runDiarioJob());
  });

  cron.schedule("0 7 1 * *", () => {
    runScheduledJob("mensal", () => runMensalJob());
  });
}
