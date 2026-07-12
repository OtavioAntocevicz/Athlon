import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GraduationCap, Users, Copy, Check, ChevronRight } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { api, getErrorMessage } from "@/lib/api";
import type { AdminProfessorDetalhe } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { MetricCard } from "@/components/domain/MetricCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { PageEnter } from "@/components/ui/page-enter";
import { formatDate, getInitials } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { StatusMensalidade } from "@athlon/shared-types";

export function AdminProfessorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyCodigo = async (e: MouseEvent, turmaId: string, codigo: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(codigo);
    setCopiedId(turmaId);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
      <PageEnter variant="fade">
        <button
          type="button"
          onClick={() => navigate("/admin/professores")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="flex items-start gap-3.5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-brand-card">
            {getInitials(data.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight text-primary">{data.nome}</h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{data.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ring-1",
                  data.ativo
                    ? "bg-success/10 text-success ring-success/20"
                    : "bg-destructive/10 text-destructive ring-destructive/20",
                )}
              >
                {data.ativo ? "Ativo" : "Inativo"}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={statusMutation.isPending}
                onClick={toggleStatus}
              >
                {data.ativo ? "Desativar" : "Reativar"}
              </Button>
            </div>
          </div>
        </div>

        <Card className="mt-4 space-y-2 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs text-muted-foreground">Chave PIX</p>
            <p className="max-w-[70%] break-all text-right text-sm font-medium text-primary">
              {data.chavePix ?? "-"}
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs text-muted-foreground">Cadastro</p>
            <p className="text-sm font-medium text-primary">{formatDate(data.criadoEm)}</p>
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard title="Turmas" value={String(data.totalTurmas)} icon={GraduationCap} />
          <MetricCard title="Alunos" value={String(data.totalAlunos)} icon={Users} />
        </div>

        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-primary">
            <GraduationCap className="h-5 w-5" /> Turmas ({data.turmas.length})
          </h2>
          {data.turmas.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma turma cadastrada.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {data.turmas.map((t) => (
                <Card
                  key={t.id}
                  className="cursor-pointer p-3 active:scale-[0.99]"
                  onClick={() => navigate(`/admin/turmas/${t.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-primary">{t.nome}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {t.modalidade}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-primary">
                          <Users className="h-3 w-3" />
                          {t.totalAlunos} {t.totalAlunos === 1 ? "aluno" : "alunos"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Criada em {formatDate(t.criadoEm)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => copyCodigo(e, t.id, t.codigoConvite)}
                        className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-1.5 py-1 text-[11px] font-semibold text-accent-strong"
                        aria-label="Copiar código"
                      >
                        <span className="max-w-[5.5rem] truncate">{t.codigoConvite}</span>
                        {copiedId === t.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-primary">
            <Users className="h-5 w-5" /> Alunos ({data.alunos.length})
          </h2>
          {data.alunos.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">
              Nenhum aluno matriculado.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {data.alunos.map((a) => (
                <Card
                  key={a.id}
                  className="flex cursor-pointer items-center gap-3 p-3 active:scale-[0.99]"
                  onClick={() => navigate(`/admin/alunos/${a.id}`)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                    {getInitials(a.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-primary">{a.nome}</p>
                    <span className="mt-1 inline-block max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-primary">
                      {a.turmas.map((t) => t.nome).join(", ") || "Sem turma"}
                    </span>
                  </div>
                  <StatusBadge status={a.statusFinanceiro as StatusMensalidade} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Card>
              ))}
            </div>
          )}
        </section>
      </PageEnter>
    </AdminShell>
  );
}
