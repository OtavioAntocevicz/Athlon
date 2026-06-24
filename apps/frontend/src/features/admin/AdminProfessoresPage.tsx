import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminProfessorResumo } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/domain/FilterPills";
import { PageHeader } from "@/components/layout/PageHeader";

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

  const filtrosStatus = useMemo(
    () => [
      { value: "", label: "Todos" },
      { value: "ativo", label: "Ativos" },
      { value: "inativo", label: "Inativos" },
    ],
    [],
  );

  return (
    <AdminShell>
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Professores" />
        <Button onClick={() => navigate("/admin/professores/novo")}>
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
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)
        ) : (data ?? []).length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum professor encontrado.
          </Card>
        ) : (
          (data ?? []).map((p) => (
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
                    p.ativo ? "bg-accent/20 text-primary" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {p.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </AdminShell>
  );
}
