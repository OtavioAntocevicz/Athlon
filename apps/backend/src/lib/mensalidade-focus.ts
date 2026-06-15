import type { StatusMensalidade } from "@athlon/shared-types";
import { chaveMesFromIso } from "./utils.js";

export type PagamentoResumo = {
  id: string;
  mes_referencia: string;
  vencimento: string | null;
  valor_centavos: number;
  status: string;
};

/** Status exibido conforme regras de negócio (vencimento × status no banco). */
export function statusEfetivo(
  pagamento: Pick<PagamentoResumo, "status" | "vencimento">,
  hoje: Date = new Date(),
): StatusMensalidade {
  const status = pagamento.status as StatusMensalidade;

  if (status === "PAGO" || status === "EM_ANALISE" || status === "ATRASADO") {
    return status;
  }

  if (pagamento.vencimento && (status === "PENDENTE" || status === "RECUSADO")) {
    const venc = new Date(pagamento.vencimento);
    venc.setHours(23, 59, 59, 999);
    const ref = new Date(hoje);
    ref.setHours(0, 0, 0, 0);
    if (ref > venc) return "ATRASADO";
  }

  return status;
}

function chaveMes(iso: string): string {
  return chaveMesFromIso(iso);
}

/**
 * Mensalidade em destaque no dashboard do aluno:
 * 1. A mais antiga ainda não paga (pendente, atrasada, em análise ou recusada)
 * 2. Se todas pagas, a do mês calendário atual
 * 3. Senão, a mais recente
 */
export function selecionarMensalidadeEmFoco<T extends PagamentoResumo>(
  pagamentos: T[],
  hoje: Date = new Date(),
): T | null {
  if (pagamentos.length === 0) return null;

  const ordenados = [...pagamentos].sort((a, b) =>
    chaveMes(a.mes_referencia).localeCompare(chaveMes(b.mes_referencia)),
  );

  const emAberto = ordenados.find((p) => p.status !== "PAGO");
  if (emAberto) return emAberto;

  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const doMesAtual = ordenados.find((p) => chaveMes(p.mes_referencia) === mesAtual);
  if (doMesAtual) return doMesAtual;

  return ordenados[ordenados.length - 1] ?? null;
}

export function contarMensalidadesAtrasadas(
  pagamentos: PagamentoResumo[],
  hoje: Date = new Date(),
): number {
  return pagamentos.filter((p) => statusEfetivo(p, hoje) === "ATRASADO").length;
}

export function contarMensalidadesEmAberto(pagamentos: PagamentoResumo[]): number {
  return pagamentos.filter((p) => p.status !== "PAGO").length;
}
