import cron from "node-cron";
import { query, queryMaybeOne } from "../lib/db.js";
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
  const turmas = await query<{ id: string; nome: string; dia_vencimento: number | null }>(
    `SELECT id, nome, dia_vencimento FROM "Turma"`,
  );

  for (const turma of turmas) {
    const matriculas = await query<{ aluno_id: string }>(
      `SELECT aluno_id FROM "MatriculaTurma"
       WHERE turma_id = $1 AND afastado = false`,
      [turma.id],
    );

    for (const m of matriculas) {
      const usuarioId = await usuarioIdDoAluno(m.aluno_id);
      if (!usuarioId) continue;

      const pagamento = await queryMaybeOne<{ id: string }>(
        `SELECT id FROM "Pagamento"
         WHERE aluno_id = $1 AND turma_id = $2
         ORDER BY mes_referencia DESC
         LIMIT 1`,
        [m.aluno_id, turma.id],
      );

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

  for (const p of pagamentos) {
    const usuarioId = await usuarioIdDoAluno(p.aluno_id);
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
  const turmas = await query<{ id: string }>(
    `SELECT id FROM "Turma" WHERE mensalidade_centavos IS NOT NULL`,
  );

  for (const turma of turmas) {
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
