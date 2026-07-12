import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronRight, Users, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminAlunoListaItem } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/domain/FilterPills";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";
import { getInitials } from "@/lib/format";
import type { StatusMensalidade } from "@athlon/shared-types";

const filtrosTurma = [
  { value: "", label: "Todos" },
  { value: "sem-turma", label: "Sem turma" },
];

export function AdminAlunosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busca, setBusca] = useState("");
  const [filtroTurma, setFiltroTurma] = useState(
    searchParams.get("semTurma") === "true" ? "sem-turma" : "",
  );

  useEffect(() => {
    if (searchParams.get("semTurma") === "true") {
      setFiltroTurma("sem-turma");
    }
  }, [searchParams]);

  const onFiltroChange = (value: string) => {
    setFiltroTurma(value);
    if (value === "sem-turma") {
      setSearchParams({ semTurma: "true" });
    } else {
      setSearchParams({});
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "alunos", busca, filtroTurma],
    queryFn: () => {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("busca", busca.trim());
      if (filtroTurma === "sem-turma") params.set("semTurma", "true");
      const qs = params.toString();
      return api<AdminAlunoListaItem[]>(`/admin/alunos${qs ? `?${qs}` : ""}`);
    },
  });

  const lista = data ?? [];
  const temFiltroAtivo = Boolean(busca.trim() || filtroTurma);
  const listaVazia = !isLoading && lista.length === 0 && !temFiltroAtivo;
  const semResultados = !isLoading && lista.length === 0 && temFiltroAtivo;

  const subtitle = useMemo(() => {
    if (isLoading) return "Carregando...";
    if (listaVazia) return "Nenhum aluno cadastrado";
    if (semResultados) return "Nenhum resultado";
    if (filtroTurma === "sem-turma") {
      return `${lista.length} sem turma`;
    }
    return `${lista.length} ${lista.length === 1 ? "aluno" : "alunos"}`;
  }, [isLoading, listaVazia, semResultados, lista.length, filtroTurma]);

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader title="Alunos" subtitle={subtitle} />
          {filtroTurma === "sem-turma" && lista.length > 0 && (
            <Button
              className="shrink-0"
              size="sm"
              onClick={() => navigate("/admin/edicao/matricular?semTurma=true")}
            >
              <UserPlus className="h-4 w-4" /> Matricular
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Nome, e-mail, CPF ou RG..."
              className="pl-10"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <FilterPills options={filtrosTurma} value={filtroTurma} onChange={onFiltroChange} />
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
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
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
                Alunos aparecem aqui quando se cadastram ou entram em turmas.
              </p>
            </div>
          )}

          {semResultados && (
            <div className="flex flex-col items-center py-10 text-center">
              <p className="text-sm font-semibold text-primary">Nenhum resultado</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Tente outro nome, documento ou filtro.
              </p>
            </div>
          )}

          {lista.map((aluno) => (
            <Card
              key={aluno.id}
              className="flex cursor-pointer items-center gap-3 p-3 active:scale-[0.99]"
              onClick={() => navigate(`/admin/alunos/${aluno.id}`)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {getInitials(aluno.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-primary">{aluno.nome}</p>
                {aluno.semTurma ? (
                  <span className="mt-1 inline-block rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent-strong">
                    Sem turma
                  </span>
                ) : (
                  <span className="mt-1 inline-block max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-primary">
                    {aluno.turmas.map((t) => t.nome).join(", ")}
                  </span>
                )}
              </div>
              {aluno.semTurma ? (
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/edicao/matricular?alunoId=${aluno.id}`);
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              ) : (
                <StatusBadge status={aluno.statusFinanceiro as StatusMensalidade} />
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Card>
          ))}
        </div>
      </PageEnter>
    </AdminShell>
  );
}
