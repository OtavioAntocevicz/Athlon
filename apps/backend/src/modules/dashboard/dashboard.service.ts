import { query, turmaIdsDoProfessor } from "../../lib/db.js";
import {
  contarMensalidadesAtrasadas,
  contarMensalidadesEmAberto,
  selecionarMensalidadeEmFoco,
  statusEfetivo,
} from "../../lib/mensalidade-focus.js";
import { chaveMesCalendario, chaveMesFromIso, isMesFuturo } from "../../lib/utils.js";
import { proximoEventoDoAluno } from "../eventos/eventos.service.js";

const EMPTY_PROFESSOR_DASH = {
  totalTurmas: 0,
  totalAlunos: 0,
  recebidoMesCentavos: 0,
  pendenteCentavos: 0,
  comprovantesAguardando: 0,
  inadimplentes: 0,
  mensalidadesEmAberto: 0,
  atividadesRecentes: [] as {
    id: string;
    tipo: string;
    titulo: string;
    descricao: string;
    criadoEm: string;
  }[],
};

type PagamentoRow = {
  id: string;
  aluno_id: string;
  mes_referencia: string;
  vencimento: string | null;
  valor_centavos: number;
  status: string;
};

export async function dashboardProfessor(professorId: string) {
  const turmaIds = await turmaIdsDoProfessor(professorId);
  if (turmaIds.length === 0) {
    return EMPTY_PROFESSOR_DASH;
  }

  const hoje = new Date();
  const mesAtualChave = chaveMesCalendario(hoje);

  const [pagamentos, comprovantes, matriculas] = await Promise.all([
    query<PagamentoRow>(
      `SELECT id, aluno_id, mes_referencia, vencimento, valor_centavos, status
       FROM "Pagamento"
       WHERE turma_id = ANY($1::text[])`,
      [turmaIds],
    ),
    query<{
      id: string;
      enviado_em: string;
      turma_id: string;
      mes_referencia: string;
      aluno_nome: string;
      turma_nome: string;
    }>(
      `SELECT c.id, c.enviado_em,
              p.turma_id, p.mes_referencia,
              a.nome AS aluno_nome, t.nome AS turma_nome
       FROM "Comprovante" c
       JOIN "Pagamento" p ON p.id = c.pagamento_id
       JOIN "Aluno" a ON a.id = p.aluno_id
       JOIN "Turma" t ON t.id = p.turma_id
       WHERE c.ativo = true
       ORDER BY c.enviado_em DESC
       LIMIT 20`,
    ),
    query<{ aluno_id: string }>(
      `SELECT aluno_id FROM "MatriculaTurma"
       WHERE turma_id = ANY($1::text[]) AND afastado = false`,
      [turmaIds],
    ),
  ]);

  const totalAlunos = new Set(matriculas.map((m) => m.aluno_id)).size;

  const pagamentosFiltrados = pagamentos.filter(
    (p) => !isMesFuturo(p.mes_referencia, hoje),
  );

  let recebidoMesCentavos = 0;
  let pendenteCentavos = 0;
  let comprovantesAguardando = 0;
  let mensalidadesEmAberto = 0;
  const alunosInadimplentes = new Set<string>();

  for (const p of pagamentosFiltrados) {
    const mesChave = chaveMesFromIso(p.mes_referencia);
    const efetivo = statusEfetivo(p, hoje);

    if (p.status === "PAGO" && mesChave === mesAtualChave) {
      recebidoMesCentavos += p.valor_centavos;
    }

    if (p.status === "EM_ANALISE") {
      comprovantesAguardando += 1;
    }

    if (p.status !== "PAGO" && p.status !== "EM_ANALISE") {
      pendenteCentavos += p.valor_centavos;
      mensalidadesEmAberto += 1;
    }

    if (efetivo === "ATRASADO") {
      alunosInadimplentes.add(p.aluno_id);
    }
  }

  const comprovantesFiltrados = comprovantes
    .filter((c) => turmaIds.includes(c.turma_id))
    .slice(0, 5);

  const atividadesRecentes = comprovantesFiltrados.map((c) => {
    const mesLabel = new Date(
      chaveMesFromIso(c.mes_referencia) + "-01T12:00:00Z",
    ).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

    return {
      id: c.id,
      tipo: "COMPROVANTE",
      titulo: `${c.aluno_nome} enviou comprovante`,
      descricao: `${c.turma_nome} - ${mesLabel}`,
      criadoEm: new Date(c.enviado_em).toISOString(),
    };
  });

  return {
    totalTurmas: turmaIds.length,
    totalAlunos,
    recebidoMesCentavos,
    pendenteCentavos,
    comprovantesAguardando,
    inadimplentes: alunosInadimplentes.size,
    mensalidadesEmAberto,
    atividadesRecentes,
  };
}

export async function dashboardAluno(alunoId: string) {
  const { sincronizarBloqueioAluno } = await import("../../lib/inadimplencia.js");
  await sincronizarBloqueioAluno(alunoId);

  const hoje = new Date();

  const [pagamentos, matriculas] = await Promise.all([
    query<{
      id: string;
      mes_referencia: string;
      vencimento: string | null;
      valor_centavos: number;
      status: string;
      chave_pix: string | null;
      turma_nome: string;
    }>(
      `SELECT p.id, p.mes_referencia, p.vencimento, p.valor_centavos, p.status,
              t.chave_pix, t.nome AS turma_nome
       FROM "Pagamento" p
       JOIN "Turma" t ON t.id = p.turma_id
       WHERE p.aluno_id = $1
       ORDER BY p.mes_referencia ASC`,
      [alunoId],
    ),
    query<{
      id: string;
      nome: string;
      modalidade: string | null;
      horario_inicio: string | null;
      local: string | null;
    }>(
      `SELECT t.id, t.nome, t.modalidade, t.horario_inicio, t.local
       FROM "MatriculaTurma" mt
       JOIN "Turma" t ON t.id = mt.turma_id
       WHERE mt.aluno_id = $1 AND mt.afastado = false`,
      [alunoId],
    ),
  ]);

  const pagamentosFiltrados = pagamentos.filter(
    (p) => !isMesFuturo(p.mes_referencia, hoje),
  );
  const emFoco = selecionarMensalidadeEmFoco(
    pagamentosFiltrados.map((p) => ({
      id: p.id,
      mes_referencia: p.mes_referencia,
      vencimento: p.vencimento,
      valor_centavos: p.valor_centavos,
      status: p.status,
      Turma: { chave_pix: p.chave_pix, nome: p.turma_nome },
    })),
    hoje,
  );
  const turmaFoco = emFoco
    ? (emFoco.Turma as { chave_pix: string | null; nome: string })
    : undefined;

  const totalAtrasadas = contarMensalidadesAtrasadas(pagamentosFiltrados, hoje);
  const totalEmAberto = contarMensalidadesEmAberto(pagamentosFiltrados);
  const proximoEvento = await proximoEventoDoAluno(alunoId);

  return {
    situacaoFinanceira: {
      pagamentoId: emFoco?.id ?? null,
      mesReferencia: emFoco?.mes_referencia
        ? new Date(emFoco.mes_referencia).toISOString()
        : null,
      turmaNome: turmaFoco?.nome ?? null,
      status: emFoco ? statusEfetivo(emFoco, hoje) : "PENDENTE",
      valorCentavos: emFoco?.valor_centavos ?? 0,
      vencimento: emFoco?.vencimento
        ? new Date(emFoco.vencimento).toISOString()
        : null,
      chavePix: turmaFoco?.chave_pix ?? null,
      totalAtrasadas,
      totalEmAberto,
    },
    turmas: matriculas.map((t) => ({
      id: t.id,
      nome: t.nome,
      modalidade: t.modalidade,
      horarioInicio: t.horario_inicio,
      local: t.local,
    })),
    proximoEvento,
    bloqueiosInadimplencia: await (async () => {
      const { listarBloqueiosAluno } = await import("../../lib/inadimplencia.js");
      return listarBloqueiosAluno(alunoId);
    })(),
  };
}
