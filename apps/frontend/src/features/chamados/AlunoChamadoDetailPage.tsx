import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ChamadoDetalhe } from "@athlon/shared-types";
import { StatusChamado } from "@athlon/shared-types";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageEnter } from "@/components/ui/page-enter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const statusLabel: Record<string, string> = {
  [StatusChamado.ABERTO]: "Aberto",
  [StatusChamado.RESPONDIDO]: "Respondido",
  [StatusChamado.FECHADO]: "Fechado",
};

export function AlunoChamadoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["chamados", id],
    queryFn: () => api<ChamadoDetalhe>(`/chamados/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <p className="pt-8 text-sm text-destructive">Chamado não encontrado</p>
        <Button className="mt-4" onClick={() => navigate("/chamados")}>
          Voltar
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageEnter variant="fade">
        <button
          type="button"
          onClick={() => navigate("/chamados")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold text-primary">{data.assunto}</h1>
          <span
            className={cn(
              "shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-primary",
            )}
          >
            {statusLabel[data.status] ?? data.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Aberto em {formatDateTime(data.criadoEm)}
        </p>

        <Card className="mt-4 space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sua mensagem
          </p>
          <p className="whitespace-pre-wrap text-sm text-primary">{data.mensagem}</p>
        </Card>

        {data.respostaAdmin ? (
          <Card className="mt-3 space-y-2 border-accent/30 bg-accent/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
              Resposta do suporte
            </p>
            <p className="whitespace-pre-wrap text-sm text-primary">{data.respostaAdmin}</p>
            {data.respondidoEm && (
              <p className="text-xs text-muted-foreground">
                {formatDate(data.respondidoEm)}
              </p>
            )}
          </Card>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Ainda sem resposta. Em breve o suporte retorna.
          </p>
        )}
      </PageEnter>
    </AppShell>
  );
}
