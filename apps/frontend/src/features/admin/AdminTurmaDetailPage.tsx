import { useState, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  MapPin,
  Clock,
  Wallet,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AdminTurmaDetalhe } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { PageEnter } from "@/components/ui/page-enter";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, getInitials } from "@/lib/format";
import type { StatusMensalidade } from "@athlon/shared-types";

export function AdminTurmaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "turma", id],
    queryFn: () => api<AdminTurmaDetalhe>(`/admin/turmas/${id}`),
    enabled: !!id,
  });

  const copyCodigo = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!data) return;
    await navigator.clipboard.writeText(data.codigoConvite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <AdminShell>
        <p className="pt-8 text-sm text-destructive">Turma não encontrada</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="flex items-stretch gap-3.5">
          <div className="relative w-1/2 shrink-0">
            {data.fotoUrl ? (
              <img
                src={data.fotoUrl}
                alt={data.nome}
                className="aspect-square w-full rounded-[10px] border-2 border-accent object-cover shadow-brand-card"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-[10px] border-2 border-accent bg-primary text-3xl font-bold text-white shadow-brand-card">
                {getInitials(data.nome)}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-0.5">
            <div>
              <h1 className="text-xl font-bold leading-tight text-primary">{data.nome}</h1>
              <button
                type="button"
                onClick={() => navigate(`/admin/professores/${data.professor.id}`)}
                className="mt-1 text-left text-sm text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
              >
                {data.professor.nome}
              </button>
              <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md bg-accent/10 px-1.5 py-1">
                <p className="min-w-0 truncate text-[11px] font-semibold tracking-wide text-accent-strong">
                  {data.codigoConvite}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-6 shrink-0 px-1.5"
                  onClick={copyCodigo}
                  aria-label={copied ? "Copiado" : "Copiar código"}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="w-fit rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-primary">
                {data.modalidade}
              </span>
              <span className="w-fit rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-primary">
                {data.nivel}
              </span>
              <span className="inline-flex w-fit items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-primary">
                <Users className="h-3.5 w-3.5" />
                {data.totalAlunos} {data.totalAlunos === 1 ? "aluno" : "alunos"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {(data.local || data.horarioInicio) && (
            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold text-primary">Treino</p>
              <div className="space-y-2.5">
                {data.local && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-primary">{data.local}</p>
                  </div>
                )}
                {data.horarioInicio && (
                  <div className="flex items-start gap-2 text-sm">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-primary">
                      {data.horarioInicio}
                      {data.horarioFim ? ` - ${data.horarioFim}` : ""}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <Wallet className="h-4 w-4" /> Financeiro
            </p>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Mensalidade</p>
                <p className="font-semibold text-primary">
                  {formatCurrency(data.mensalidadeCentavos)}/mês
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p className="font-medium text-primary">Dia {data.diaVencimento}</p>
              </div>
              <div className="border-t border-primary/5 pt-3">
                <p className="text-xs text-muted-foreground">Criada em</p>
                <p className="mt-0.5 text-sm font-medium text-primary">
                  {formatDate(data.criadoEm)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-primary">
            <Users className="h-5 w-5" /> Alunos ({data.alunos.length})
          </h2>
          {data.alunos.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">
              Nenhum aluno nesta turma.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {data.alunos.map((aluno) => (
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
                  </div>
                  <StatusBadge status={aluno.statusFinanceiro as StatusMensalidade} />
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
