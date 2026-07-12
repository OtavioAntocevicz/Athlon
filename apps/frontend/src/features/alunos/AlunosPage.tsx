import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, Users } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPills } from "@/components/domain/FilterPills";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { PageEnter } from "@/components/ui/page-enter";
import { getInitials } from "@/lib/format";
import type { StatusMensalidade } from "@athlon/shared-types";

interface AlunoItem {
  id: string;
  nome: string;
  turmaNome: string;
  turmas: { id: string; nome: string }[];
  telefone: string | null;
  statusFinanceiro: StatusMensalidade;
}

interface TurmaOption {
  id: string;
  nome: string;
}

const filtrosStatus = [
  { value: "", label: "Todos" },
  { value: "PAGO", label: "Em dia" },
  { value: "ATRASADO", label: "Atrasado" },
  { value: "PENDENTE", label: "Pendente" },
];

function rotuloContagem(total: number, atrasados: number, statusFiltro: string): string {
  const alunosLabel = `${total} ${total === 1 ? "aluno" : "alunos"}`;

  if (statusFiltro === "ATRASADO") {
    return `${total} ${total === 1 ? "atrasado" : "atrasados"}`;
  }
  if (statusFiltro === "PAGO") {
    return `${total} em dia`;
  }
  if (statusFiltro === "PENDENTE") {
    return `${total} ${total === 1 ? "pendente" : "pendentes"}`;
  }
  if (atrasados > 0) {
    return `${alunosLabel} · ${atrasados} ${atrasados === 1 ? "atrasado" : "atrasados"}`;
  }
  return alunosLabel;
}

export function AlunosPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");

  const { data: turmas } = useQuery({
    queryKey: ["turmas"],
    queryFn: () => api<TurmaOption[]>("/turmas"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => api<AlunoItem[]>("/alunos"),
  });

  const filtrosTurma = useMemo(() => {
    const opts = [{ value: "", label: "Todas as turmas" }];
    turmas?.forEach((t) => opts.push({ value: t.id, label: t.nome }));
    return opts;
  }, [turmas]);

  const baseFiltrados = useMemo(() => {
    if (!data) return [];
    const termo = busca.trim().toLowerCase();
    return data.filter((a) => {
      const matchTurma = !turmaId || a.turmas.some((t) => t.id === turmaId);
      const matchNome = !termo || a.nome.toLowerCase().includes(termo);
      return matchTurma && matchNome;
    });
  }, [data, busca, turmaId]);

  const filtrados = useMemo(() => {
    if (!statusFiltro) return baseFiltrados;
    return baseFiltrados.filter((a) => a.statusFinanceiro === statusFiltro);
  }, [baseFiltrados, statusFiltro]);

  const totalGeral = data?.length ?? 0;
  const atrasadosNoContexto = useMemo(
    () => baseFiltrados.filter((a) => a.statusFinanceiro === "ATRASADO").length,
    [baseFiltrados],
  );

  const temFiltroAtivo = Boolean(busca.trim() || turmaId || statusFiltro);
  const listaVazia = !isLoading && totalGeral === 0;
  const semResultados = !isLoading && totalGeral > 0 && filtrados.length === 0;

  const subtitle = isLoading
    ? "Carregando..."
    : listaVazia
      ? "Nenhum aluno cadastrado"
      : rotuloContagem(filtrados.length, atrasadosNoContexto, statusFiltro);

  return (
    <AppShell>
      <PageEnter variant="fade">
        <PageHeader title="Alunos" subtitle={subtitle} />

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2.5">
          <FilterPills options={filtrosStatus} value={statusFiltro} onChange={setStatusFiltro} />
          <FilterPills options={filtrosTurma} value={turmaId} onChange={setTurmaId} />
        </div>

        <div className="mt-4 space-y-2.5">
          {isLoading &&
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-primary/5 bg-card p-3 shadow-brand-card"
              >
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}

          {listaVazia && (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[8px] border-2 border-accent bg-primary text-white">
                <Users className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-primary">Nenhum aluno ainda</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Quando alunos entrarem nas suas turmas pelo código de convite, eles aparecem aqui.
              </p>
            </div>
          )}

          {semResultados && (
            <div className="flex flex-col items-center py-10 text-center">
              <p className="text-sm font-semibold text-primary">
                {statusFiltro === "PAGO"
                  ? "Nenhum aluno em dia"
                  : statusFiltro === "ATRASADO"
                    ? "Nenhum aluno atrasado"
                    : statusFiltro === "PENDENTE"
                      ? "Nenhum aluno pendente"
                      : "Nenhum resultado"}
              </p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {statusFiltro === "PAGO"
                  ? "Só entram aqui alunos com a mensalidade atual paga."
                  : temFiltroAtivo
                    ? "Tente outro nome, turma ou status financeiro."
                    : "Nenhum aluno encontrado."}
              </p>
            </div>
          )}

          {filtrados.map((aluno) => (
            <Card
              key={aluno.id}
              className="flex cursor-pointer items-center gap-3 p-3 active:scale-[0.99]"
              onClick={() => navigate(`/alunos/${aluno.id}`)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {getInitials(aluno.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-primary">{aluno.nome}</p>
                <span className="mt-1 inline-block max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-primary">
                  {aluno.turmaNome}
                </span>
              </div>
              <StatusBadge status={aluno.statusFinanceiro} />
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Card>
          ))}
        </div>
      </PageEnter>
    </AppShell>
  );
}
