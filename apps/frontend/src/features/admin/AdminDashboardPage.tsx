import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Users, GraduationCap, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminDashboard } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { MetricCard } from "@/components/domain/MetricCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/domain/FilterPills";
import { PageEnter } from "@/components/ui/page-enter";
import { PageHeader } from "@/components/layout/PageHeader";

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", busca, statusFiltro],
    queryFn: () => {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("busca", busca.trim());
      if (statusFiltro === "ativo") params.set("ativo", "true");
      if (statusFiltro === "inativo") params.set("ativo", "false");
      const qs = params.toString();
      return api<AdminDashboard>(`/admin/dashboard${qs ? `?${qs}` : ""}`);
    },
  });

  const filtrosStatus = useMemo(
    () => [
      { value: "", label: "Todos" },
      { value: "ativo", label: "Ativos" },
      { value: "inativo", label: "Inativos" },
    ],
    [],
  );

  const professores = data?.professores ?? [];

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-primary">
            Olá, {user?.nome?.split(" ")[0]}!
          </h1>
          <p className="text-sm text-muted-foreground">Painel administrativo ATHLON</p>
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Professores ativos"
                value={String(data?.professoresAtivos ?? 0)}
                icon={Users}
              />
              <MetricCard
                title="Total de turmas"
                value={String(data?.totalTurmas ?? 0)}
                icon={GraduationCap}
              />
              <MetricCard
                title="Alunos matriculados"
                value={String(data?.totalAlunos ?? 0)}
                icon={Users}
                accent="success"
              />
              <MetricCard
                title="Alunos sem turma"
                value={String(data?.alunosSemTurma ?? 0)}
                icon={UserX}
                accent={data?.alunosSemTurma ? "warning" : undefined}
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <PageHeader title="Professores" />
              <Button onClick={() => navigate("/admin/professores/novo")} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Novo professor
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  className="pl-9"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <FilterPills options={filtrosStatus} value={statusFiltro} onChange={setStatusFiltro} />
            </div>

            <div className="mt-4 space-y-2">
              {professores.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum professor encontrado.
                </Card>
              ) : (
                professores.map((p) => (
                  <Card
                    key={p.id}
                    className="cursor-pointer p-4 transition-colors hover:bg-muted/40"
                    onClick={() => navigate(`/admin/professores/${p.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-primary">{p.nome}</p>
                        <p className="truncate text-sm text-muted-foreground">{p.email}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.totalTurmas} turma(s) · {p.totalAlunos} aluno(s)
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.ativo
                            ? "bg-accent/20 text-primary"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {p.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground lg:hidden">
              <Link to="/admin/professores" className="font-medium text-primary underline">
                Ver todos os professores
              </Link>
            </p>
          </>
        )}
      </PageEnter>
    </AdminShell>
  );
}
