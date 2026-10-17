import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, FileCheck, X } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { formatCurrency, formatMes, getInitials } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/ui/query-error";
import { PageEnter } from "@/components/ui/page-enter";
import { Button } from "@/components/ui/button";

interface FilaItem {
  id: string;
  alunoNome: string;
  turmaNome: string;
  mesReferencia: string;
  valorCentavos: number;
  enviadoEm: string;
  previewUrl?: string | null;
}

export function ComprovantesFilaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["comprovantes", "fila"],
    queryFn: () => api<FilaItem[]>("/comprovantes/fila"),
  });

  const aprovar = useMutation({
    mutationFn: (id: string) => api(`/comprovantes/${id}/aprovar`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comprovantes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <AppShell>
      <PageHeader title="Comprovantes" subtitle="Inbox — toque para detalhar ou use ações rápidas" />

      {isLoading && <ListSkeleton rows={3} />}

      {isError && (
        <QueryError
          message={getErrorMessage(error, "Não foi possível carregar a fila.")}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <EmptyState
          icon={FileCheck}
          title="Fila vazia"
          description="Quando um aluno enviar comprovante, ele aparecerá aqui para você validar."
          action={{ label: "Ver mensalidades", onClick: () => navigate("/mensalidades") }}
        />
      )}

      <PageEnter variant="fade" className="space-y-4">
        {data?.map((item) => (
          <Card key={item.id} className="overflow-hidden p-0">
            {item.previewUrl && (
              <button
                type="button"
                className="block w-full border-b border-primary/5 bg-muted/30"
                onClick={() => navigate(`/comprovantes/${item.id}`)}
              >
                <img
                  src={item.previewUrl}
                  alt={`Comprovante de ${item.alunoNome}`}
                  className="max-h-40 w-full object-contain"
                  loading="lazy"
                />
              </button>
            )}
            <div className="p-3">
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                onClick={() => navigate(`/comprovantes/${item.id}`)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {getInitials(item.alunoNome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-primary">{item.alunoNome}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.turmaNome} · {formatMes(item.mesReferencia)}
                  </p>
                </div>
                <p className="font-bold text-primary">{formatCurrency(item.valorCentavos)}</p>
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="success"
                  size="sm"
                  disabled={aprovar.isPending}
                  onClick={() => aprovar.mutate(item.id)}
                >
                  <Check className="h-4 w-4" /> Aprovar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/comprovantes/${item.id}`)}
                >
                  <X className="h-4 w-4" /> Revisar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </PageEnter>
    </AppShell>
  );
}
