import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Calendar, FileCheck, AlertTriangle, Users, Plus, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/format";
import type { DashboardProfessor } from "@athlon/shared-types";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/domain/MetricCard";
import { Card } from "@/components/ui/card";
import { PageEnter } from "@/components/ui/page-enter";

export function DashboardProfessorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "professor"],
    queryFn: () => api<DashboardProfessor>("/dashboard/professor"),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-4 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  const dash = data!;

  return (
    <AppShell>
      <PageEnter variant="fade">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-primary">
          Olá, {user?.nome?.split(" ")[0]}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Aqui está o resumo da sua quadra hoje
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <MetricCard
          title="Turmas ativas"
          value={String(dash.totalTurmas)}
          icon={Calendar}
        />
        <MetricCard
          title="Alunos"
          value={String(dash.totalAlunos)}
          icon={Users}
        />
        <MetricCard
          title="Comprovantes"
          value={String(dash.comprovantesAguardando)}
          subtitle="Aguardando"
          icon={FileCheck}
          accent="warning"
        />
        <MetricCard
          title="Inadimplentes"
          value={String(dash.inadimplentes)}
          subtitle={dash.inadimplentes === 1 ? "Aluno atrasado" : "Alunos atrasados"}
          icon={AlertTriangle}
          accent="danger"
        />
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold text-primary">Ações rápidas</h2>
      <div className="grid gap-3">
        <Card
          className="cursor-pointer bg-primary p-4 text-white transition-transform active:scale-[0.99]"
          onClick={() => navigate("/comprovantes")}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <FileCheck className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Aprovar comprovantes</p>
              <p className="text-sm text-white/70">
                {dash.comprovantesAguardando} pendente{dash.comprovantesAguardando === 1 ? "" : "s"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Card
            className="cursor-pointer p-4 transition-transform active:scale-[0.99]"
            onClick={() => navigate("/alunos")}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
              <Users className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <p className="text-sm font-semibold text-primary">Ver alunos</p>
            <p className="text-xs text-muted-foreground">Lista completa</p>
          </Card>
          <Card
            className="cursor-pointer p-4 transition-transform active:scale-[0.99]"
            onClick={() => navigate("/turmas/nova")}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
              <Plus className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <p className="text-sm font-semibold text-primary">Criar turma</p>
            <p className="text-xs text-muted-foreground">Novo horário</p>
          </Card>
        </div>
      </div>

      {dash.atividadesRecentes.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-lg font-bold text-primary">Atividades recentes</h2>
          <div className="space-y-2">
            {dash.atividadesRecentes.map((a) => (
              <Card key={a.id} className="flex items-start gap-3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                  <FileCheck className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">{a.descricao}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatRelativeTime(a.criadoEm)}
                </span>
              </Card>
            ))}
          </div>
        </>
      )}
      </PageEnter>
    </AppShell>
  );
}
