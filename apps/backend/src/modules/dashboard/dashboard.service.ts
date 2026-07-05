import { supabase } from "../../config/supabase.js";
import { relOne, turmaIdsDoProfessor } from "../../lib/db.js";
import {
  contarMensalidadesAtrasadas,
  contarMensalidadesEmAberto,
  selecionarMensalidadeEmFoco,
  statusEfetivo,
} from "../../lib/mensalidade-focus.js";
import { AppError } from "../../middleware/error-handler.js";
import { chaveMesCalendario, chaveMesFromIso, isMesFuturo } from "../../lib/utils.js";
import { proximoEventoDoAluno } from "../eventos/eventos.service.js";

const EMPTY_PROFESSOR_DASH = {
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

  const [pagamentosRes, comprovantesRes] = await Promise.all([
    supabase
      .from("Pagamento")
      .select("id, aluno_id, mes_referencia, vencimento, valor_centavos, status")
      .in("turma_id", turmaIds),
    supabase
      .from("Comprovante")
      .select("id, enviado_em, Pagamento(aluno_id, turma_id, mes_referencia, Aluno(nome), Turma(nome))")
      .eq("ativo", true)
      .order("enviado_em", { ascending: false })
      .limit(20),
  ]);

  if (pagamentosRes.error) {
    throw new AppError(500, "DB_ERROR", pagamentosRes.error.message);
  }

  const pagamentos = (pagamentosRes.data ?? []).filter(
    (p) => !isMesFuturo(p.mes_referencia, hoje),
  ) as PagamentoRow[];

  let recebidoMesCentavos = 0;
  let pendenteCentavos = 0;
  let comprovantesAguardando = 0;
  let mensalidadesEmAberto = 0;
  const alunosInadimplentes = new Set<string>();

  for (const p of pagamentos) {
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

  const comprovantesFiltrados = (comprovantesRes.data ?? []).filter((c) => {
    const pag = relOne(c.Pagamento) as { turma_id: string } | undefined;
    return pag && turmaIds.includes(pag.turma_id);
  }).slice(0, 5);

  const atividadesRecentes = comprovantesFiltrados.map((c) => {
    const pag = relOne(c.Pagamento) as {
      mes_referencia: string;
      Aluno: { nome: string } | { nome: string }[];
      Turma: { nome: string } | { nome: string }[];
    };
    const aluno = relOne(pag.Aluno);
    const turma = relOne(pag.Turma);
    const mesLabel = new Date(
      chaveMesFromIso(pag.mes_referencia) + "-01T12:00:00Z",
    ).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

    return {
      id: c.id,
      tipo: "COMPROVANTE",
      titulo: `${aluno?.nome ?? "Aluno"} enviou comprovante`,
      descricao: `${turma?.nome ?? "Turma"} - ${mesLabel}`,
      criadoEm: new Date(c.enviado_em).toISOString(),
    };
  });

  return {
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

  const [pagamentosRes, matriculasRes] = await Promise.all([
    supabase
      .from("Pagamento")
      .select("id, mes_referencia, vencimento, valor_centavos, status, Turma(chave_pix, nome)")
      .eq("aluno_id", alunoId)
      .order("mes_referencia", { ascending: true }),
    supabase
      .from("MatriculaTurma")
      .select("Turma(id, nome, modalidade, horario_inicio, local)")
      .eq("aluno_id", alunoId)
      .eq("afastado", false),
  ]);

  if (pagamentosRes.error) {
    throw new AppError(500, "DB_ERROR", pagamentosRes.error.message);
  }

  const pagamentos = (pagamentosRes.data ?? []).filter(
    (p) => !isMesFuturo(p.mes_referencia, hoje),
  );
  const emFoco = selecionarMensalidadeEmFoco(pagamentos, hoje);
  const turmaFoco = emFoco
    ? (relOne(emFoco.Turma) as { chave_pix: string | null; nome: string } | undefined)
    : undefined;

  const totalAtrasadas = contarMensalidadesAtrasadas(pagamentos, hoje);
  const totalEmAberto = contarMensalidadesEmAberto(pagamentos);
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
    turmas: (matriculasRes.data ?? []).flatMap((m) => {
      const t = relOne(m.Turma) as {
        id: string;
        nome: string;
        modalidade: string | null;
        horario_inicio: string | null;
        local: string | null;
      } | undefined;
      if (!t) return [];
      return [
        {
          id: t.id,
          nome: t.nome,
          modalidade: t.modalidade,
          horarioInicio: t.horario_inicio,
          local: t.local,
        },
      ];
    }),
    proximoEvento,
    bloqueiosInadimplencia: await (async () => {
      const { listarBloqueiosAluno } = await import("../../lib/inadimplencia.js");
      return listarBloqueiosAluno(alunoId);
    })(),
  };
}
