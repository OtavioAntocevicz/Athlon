import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ChevronRight, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminProfessorResumo } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/domain/FilterPills";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/cn";

const filtrosStatus = [
  { value: "", label: "Todos" },
  { value: "ativo", label: "Ativos" },
  { value: "inativo", label: "Inativos" },
];

function rotuloContagem(total: number, statusFiltro: string): string {
  if (statusFiltro === "ativo") {
    return `${total} ${total === 1 ? "ativo" : "ativos"}`;
  }
  if (statusFiltro === "inativo") {
    return `${total} ${total === 1 ? "inativo" : "inativos"}`;
  }
  return `${total} ${total === 1 ? "professor" : "professores"}`;
}

export function AdminProfessoresPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "professores", busca, statusFiltro],
    queryFn: () => {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("busca", busca.trim());
      if (statusFiltro === "ativo") params.set("ativo", "true");
      if (statusFiltro === "inativo") params.set("ativo", "false");
      const qs = params.toString();
      return api<AdminProfessorResumo[]>(`/admin/professores${qs ? `?${qs}` : ""}`);
    },
  });

  const lista = data ?? [];
  const temFiltroAtivo = Boolean(busca.trim() || statusFiltro);
  const listaVazia = !isLoading && lista.length === 0 && !temFiltroAtivo;
  const semResultados = !isLoading && lista.length === 0 && temFiltroAtivo;

  const subtitle = useMemo(() => {
    if (isLoading) return "Carregando...";
    if (listaVazia) return "Nenhum professor cadastrado";
    if (semResultados) return "Nenhum resultado";
    return rotuloContagem(lista.length, statusFiltro);
  }, [isLoading, listaVazia, semResultados, lista.length, statusFiltro]);

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader title="Professores" subtitle={subtitle} />
          <Button className="shrink-0" onClick={() => navigate("/admin/professores/novo")}>
            <Plus className="h-4 w-4" /> Novo professor
          </Button>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome ou e-mail..."
              className="pl-10"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <FilterPills options={filtrosStatus} value={statusFiltro} onChange={setStatusFiltro} />
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
              <p className="text-base font-semibold text-primary">Nenhum professor ainda</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Crie o primeiro treinador para ele começar a montar turmas no app.
              </p>
              <Button className="mt-6" onClick={() => navigate("/admin/professores/novo")}>
                <Plus className="h-4 w-4" /> Novo professor
              </Button>
            </div>
          )}

          {semResultados && (
            <div className="flex flex-col items-center py-10 text-center">
              <p className="text-sm font-semibold text-primary">Nenhum resultado</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Tente outro nome, e-mail ou status.
              </p>
            </div>
          )}

          {lista.map((p) => (
            <Card
              key={p.id}
              className="flex cursor-pointer items-center gap-3 p-3 active:scale-[0.99]"
              onClick={() => navigate(`/admin/professores/${p.id}`)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {getInitials(p.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-primary">{p.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {p.totalTurmas} {p.totalTurmas === 1 ? "turma" : "turmas"} · {p.totalAlunos}{" "}
                  {p.totalAlunos === 1 ? "aluno" : "alunos"}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ring-1",
                  p.ativo
                    ? "bg-success/10 text-success ring-success/20"
                    : "bg-destructive/10 text-destructive ring-destructive/20",
                )}
              >
                {p.ativo ? "Ativo" : "Inativo"}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Card>
          ))}
        </div>
      </PageEnter>
    </AdminShell>
  );
}
