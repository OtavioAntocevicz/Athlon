import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GraduationCap, Users } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import type { AdminProfessorDetalhe } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { MetricCard } from "@/components/domain/MetricCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { formatDate } from "@/lib/format";
import type { StatusMensalidade } from "@athlon/shared-types";

export function AdminProfessorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "professor", id],
    queryFn: () => api<AdminProfessorDetalhe>(`/admin/professores/${id}`),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (ativo: boolean) =>
      api(`/admin/professores/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ ativo }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  if (isLoading) {
    return (
      <AdminShell>
        <div className="space-y-3 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AdminShell>
    );
  }

  if (error || !data) {
    return (
      <AdminShell showNav={false}>
        <p className="pt-8 text-sm text-destructive">
          {error instanceof Error ? error.message : "Professor não encontrado"}
        </p>
        <Button className="mt-4" onClick={() => navigate("/admin/professores")}>
          Voltar
        </Button>
      </AdminShell>
    );
  }

  const toggleStatus = () => {
    const next = !data.ativo;
    const msg = next
      ? "Reativar este professor?"
      : "Desativar este professor? Ele não poderá mais entrar no app.";
    if (!window.confirm(msg)) return;
    statusMutation.mutate(next, {
      onError: (e) => alert(getErrorMessage(e, "Erro ao atualizar status")),
    });
  };

  return (
    <AdminShell>
      <button
        type="button"
        onClick={() => navigate("/admin/professores")}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{data.nome}</h1>
          <p className="text-sm text-muted-foreground">{data.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PIX: {data.chavePix ?? "-"} · Cadastro: {formatDate(data.criadoEm)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              data.ativo ? "bg-accent/20 text-primary" : "bg-destructive/10 text-destructive"
            }`}
          >
            {data.ativo ? "Ativo" : "Inativo"}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={statusMutation.isPending}
            onClick={toggleStatus}
          >
            {data.ativo ? "Desativar" : "Reativar"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <MetricCard title="Turmas" value={String(data.totalTurmas)} icon={GraduationCap} />
        <MetricCard title="Alunos" value={String(data.totalAlunos)} icon={Users} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-primary">Turmas</h2>
        {data.turmas.length === 0 ? (
          <Card className="mt-3 p-4 text-sm text-muted-foreground">Nenhuma turma cadastrada.</Card>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Turma</th>
                  <th className="pb-2 pr-4 font-medium">Modalidade</th>
                  <th className="pb-2 pr-4 font-medium">Alunos</th>
                  <th className="pb-2 pr-4 font-medium">Convite</th>
                  <th className="pb-2 font-medium">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {data.turmas.map((t) => (
                  <tr key={t.id} className="border-b border-primary/5">
                    <td className="py-3 pr-4 font-medium text-primary">{t.nome}</td>
                    <td className="py-3 pr-4">{t.modalidade}</td>
                    <td className="py-3 pr-4">{t.totalAlunos}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{t.codigoConvite}</td>
                    <td className="py-3">{formatDate(t.criadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-primary">Alunos</h2>
        {data.alunos.length === 0 ? (
          <Card className="mt-3 p-4 text-sm text-muted-foreground">Nenhum aluno matriculado.</Card>
        ) : (
          <div className="mt-3 space-y-2">
            {data.alunos.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-primary">{a.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.turmas.map((t) => t.nome).join(", ")}
                    </p>
                    {a.telefone && (
                      <p className="text-xs text-muted-foreground">{a.telefone}</p>
                    )}
                  </div>
                  <StatusBadge status={a.statusFinanceiro as StatusMensalidade} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
