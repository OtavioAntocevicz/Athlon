import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Wallet, ClipboardList, FileCheck, AlertTriangle, Users, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";
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
          Olá, {user?.nome?.split(" ")[0]}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Aqui está o resumo da sua quadra hoje
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        <MetricCard
          title="Recebido no mês"
          value={formatCurrency(dash.recebidoMesCentavos)}
          icon={Wallet}
          accent="success"
        />
        <MetricCard
          title="Valor pendente"
          value={formatCurrency(dash.pendenteCentavos)}
          subtitle={`${dash.mensalidadesEmAberto} mensalidade(s) em aberto`}
          icon={ClipboardList}
        />
        <MetricCard
          title="Comprovantes"
          value={String(dash.comprovantesAguardando)}
          subtitle="Aguardando aprovação"
          icon={FileCheck}
          accent="warning"
        />
        <MetricCard
          title="Inadimplentes"
          value={String(dash.inadimplentes)}
          subtitle={
            dash.inadimplentes === 1
              ? "Aluno com mensalidade atrasada"
              : "Alunos com mensalidade atrasada"
          }
          icon={AlertTriangle}
          accent="warning"
        />
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold text-primary">Ações Rápidas</h2>
      <div className="grid gap-3">
        <Card
          className="cursor-pointer bg-primary text-white p-4 active:scale-[0.99]"
          onClick={() => navigate("/comprovantes")}
        >
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-accent" />
            <div>
              <p className="font-semibold">Aprovar comprovantes</p>
              <p className="text-sm text-white/70">{dash.comprovantesAguardando} pendentes</p>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Card className="cursor-pointer p-4 active:scale-[0.99]" onClick={() => navigate("/alunos")}>
            <Users className="h-5 w-5 text-primary mb-2" />
            <p className="text-sm font-semibold">Ver alunos</p>
            <p className="text-xs text-muted-foreground">Lista completa</p>
          </Card>
          <Card className="cursor-pointer p-4 active:scale-[0.99]" onClick={() => navigate("/turmas/nova")}>
            <Plus className="h-5 w-5 text-primary mb-2" />
            <p className="text-sm font-semibold">Criar turma</p>
            <p className="text-xs text-muted-foreground">Novo horário</p>
          </Card>
        </div>
      </div>

      {dash.atividadesRecentes.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-lg font-bold text-primary">Atividades Recentes</h2>
          <div className="space-y-3">
            {dash.atividadesRecentes.map((a) => (
              <Card key={a.id} className="p-3">
                <p className="text-sm font-medium text-primary">{a.titulo}</p>
                <p className="text-xs text-muted-foreground">{a.descricao}</p>
              </Card>
            ))}
          </div>
        </>
      )}
      </PageEnter>
    </AppShell>
  );
}
