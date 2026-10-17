import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/ui/query-error";
import { PageEnter } from "@/components/ui/page-enter";
import { formatDateTime } from "@/lib/format";

interface AvisoAluno {
  id: string;
  titulo: string;
  descricao: string;
  turmaNome: string;
  enviadoEm: string;
}

export function AvisosAlunoPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["aluno", "avisos"],
    queryFn: () => api<AvisoAluno[]>("/alunos/meus-avisos"),
  });

  return (
    <AppShell>
      <PageHeader title="Avisos" subtitle="Comunicados das suas turmas" />

      {isLoading && <ListSkeleton rows={4} rowClassName="h-24" />}

      {isError && (
        <QueryError
          message={getErrorMessage(error, "Não foi possível carregar os avisos.")}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title="Nenhum aviso ainda"
          description="Quando o treinador enviar um comunicado, ele aparecerá aqui."
        />
      )}

      <PageEnter variant="fade" className="space-y-3">
        {data?.map((aviso) => (
          <Card key={aviso.id} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
              {aviso.turmaNome}
            </p>
            <h2 className="mt-1 font-semibold text-primary">{aviso.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {aviso.descricao}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(aviso.enviadoEm)}</p>
          </Card>
        ))}
      </PageEnter>
    </AppShell>
  );
}
