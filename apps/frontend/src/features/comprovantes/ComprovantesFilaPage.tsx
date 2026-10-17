import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileCheck } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { formatCurrency, formatMes, getInitials } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/ui/query-error";
import { PageEnter } from "@/components/ui/page-enter";

interface FilaItem {
  id: string;
  alunoNome: string;
  turmaNome: string;
  mesReferencia: string;
  valorCentavos: number;
  enviadoEm: string;
}

export function ComprovantesFilaPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["comprovantes", "fila"],
    queryFn: () => api<FilaItem[]>("/comprovantes/fila"),
  });

  return (
    <AppShell>
      <PageHeader title="Comprovantes" subtitle="Aguardando sua aprovação" />

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

      <PageEnter variant="fade" className="space-y-3">
        {data?.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer active:scale-[0.99]"
            onClick={() => navigate(`/comprovantes/${item.id}`)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {getInitials(item.alunoNome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary">{item.alunoNome}</p>
                <p className="text-xs text-muted-foreground">
                  {item.turmaNome} · {formatMes(item.mesReferencia)}
                </p>
              </div>
              <p className="font-bold text-primary">{formatCurrency(item.valorCentavos)}</p>
            </div>
          </Card>
        ))}
      </PageEnter>
    </AppShell>
  );
}
