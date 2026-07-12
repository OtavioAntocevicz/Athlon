import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Users, GraduationCap, UserX, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminDashboard } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { MetricCard } from "@/components/domain/MetricCard";
import { Card } from "@/components/ui/card";
import { PageEnter } from "@/components/ui/page-enter";

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => api<AdminDashboard>("/admin/dashboard"),
  });

  if (isLoading) {
    return (
      <AdminShell>
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AdminShell>
    );
  }

  const dash = data!;
  const totalProfessores = dash.professores.length;
  const inativos = totalProfessores - dash.professoresAtivos;

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-primary">
            Olá, {user?.nome?.split(" ")[0]}!
          </h1>
          <p className="text-sm text-muted-foreground">Resumo da plataforma</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <MetricCard
            title="Professores ativos"
            value={String(dash.professoresAtivos)}
            subtitle={inativos > 0 ? `${inativos} inativo${inativos === 1 ? "" : "s"}` : undefined}
            icon={Users}
          />
          <MetricCard
            title="Total de turmas"
            value={String(dash.totalTurmas)}
            icon={GraduationCap}
          />
          <MetricCard
            title="Alunos matriculados"
            value={String(dash.totalAlunos)}
            icon={Users}
            accent="success"
          />
          <MetricCard
            title="Alunos sem turma"
            value={String(dash.alunosSemTurma)}
            icon={UserX}
            accent={dash.alunosSemTurma ? "warning" : undefined}
          />
        </div>

        <h2 className="mb-3 mt-8 text-lg font-bold text-primary">Ações rápidas</h2>
        <div className="grid gap-3">
          <Card
            className="cursor-pointer bg-primary p-4 text-white transition-transform active:scale-[0.99]"
            onClick={() => navigate("/admin/professores/novo")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Plus className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Novo professor</p>
                <p className="text-sm text-white/70">Criar acesso de treinador</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
            </div>
          </Card>

          <Card
            className="cursor-pointer p-4 transition-transform active:scale-[0.99]"
            onClick={() => navigate("/admin/professores")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                <Users className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary">Ver professores</p>
                <p className="text-sm text-muted-foreground">
                  {totalProfessores}{" "}
                  {totalProfessores === 1 ? "cadastrado" : "cadastrados"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </Card>

          <Card
            className="cursor-pointer p-4 transition-transform active:scale-[0.99]"
            onClick={() => navigate("/admin/alunos")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                <Users className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary">Ver alunos</p>
                <p className="text-sm text-muted-foreground">
                  {dash.totalAlunos} matriculado{dash.totalAlunos === 1 ? "" : "s"}
                  {dash.alunosSemTurma > 0
                    ? ` · ${dash.alunosSemTurma} sem turma`
                    : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </Card>
        </div>
      </PageEnter>
    </AdminShell>
  );
}
