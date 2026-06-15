import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatCurrency, formatMes } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { getInitials } from "@/lib/format";

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

  const { data, isLoading } = useQuery({
    queryKey: ["comprovantes", "fila"],
    queryFn: () => api<FilaItem[]>("/comprovantes/fila"),
  });

  return (
    <AppShell>
      <PageHeader
        title="Comprovantes"
        subtitle="Aguardando sua aprovação"
      />

      <div className="space-y-3">
        {isLoading && [1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}

        {data?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum comprovante pendente
          </p>
        )}

        {data?.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer active:scale-[0.99]"
            onClick={() => navigate(`/comprovantes/${item.id}`)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold text-sm">
                {getInitials(item.alunoNome)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary">{item.alunoNome}</p>
                <p className="text-xs text-muted-foreground">
                  {item.turmaNome} — {formatMes(item.mesReferencia)}
                </p>
              </div>
              <p className="font-bold text-primary">{formatCurrency(item.valorCentavos)}</p>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
