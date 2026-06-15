import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatMes, formatDate } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { ComprovantePreview } from "@/components/domain/ComprovantePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InadimplenciaPrevisao, StatusMensalidade } from "@athlon/shared-types";

interface ComprovanteDetail {
  id: string;
  alunoNome: string;
  turmaNome: string;
  mesReferencia: string;
  valorCentavos: number;
  vencimento: string | null;
  status: StatusMensalidade;
  enviadoEm: string;
  arquivoUrl: string;
  inadimplencia?: InadimplenciaPrevisao | null;
}

export function ComprovanteValidacaoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const [showRecusa, setShowRecusa] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["comprovante", id],
    queryFn: () => api<ComprovanteDetail>(`/comprovantes/${id}`),
    enabled: !!id,
  });

  const aprovar = useMutation({
    mutationFn: () => api(`/comprovantes/${id}/aprovar`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comprovantes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/comprovantes");
    },
  });

  const recusar = useMutation({
    mutationFn: () =>
      api(`/comprovantes/${id}/recusar`, {
        method: "POST",
        body: JSON.stringify({ motivo }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comprovantes"] });
      navigate("/comprovantes");
    },
  });

  if (isLoading || !data) {
    return (
      <AppShell>
        <div className="h-60 animate-pulse rounded-xl bg-muted mt-4" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="text-xl font-bold text-primary text-center mb-6">
        Validação de Comprovante
      </h1>

      <Card className="mb-4">
        <p className="font-bold text-lg">{data.alunoNome}</p>
        <p className="text-sm text-muted-foreground">{data.turmaNome}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="font-bold">{formatCurrency(data.valorCentavos)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Mês Ref.</p>
            <p className="font-bold text-sm">{formatMes(data.mesReferencia)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Data de Envio</p>
            <p className="font-bold text-sm">{formatDate(data.enviadoEm)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Status</p>
            <StatusBadge status={data.status} />
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-semibold">Comprovante</p>
        <ComprovantePreview url={data.arquivoUrl} />
      </Card>

      {data.inadimplencia?.desbloquearaAoPagar && (
        <Card className="mt-4 border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Inadimplência</p>
          <p className="mt-1 text-sm text-amber-800">
            Após a aprovação deste comprovante, o aluno{" "}
            <strong>{data.alunoNome}</strong> será desbloqueado de suas inadimplências
            nesta turma.
          </p>
        </Card>
      )}

      {showRecusa ? (
        <div className="mt-4 space-y-3">
          <Input
            placeholder="Motivo da recusa"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <Button
            variant="destructive"
            size="lg"
            disabled={recusar.isPending || motivo.length < 3}
            onClick={() => recusar.mutate()}
          >
            Confirmar recusa
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <Button
            variant="success"
            size="lg"
            disabled={aprovar.isPending}
            onClick={() => aprovar.mutate()}
          >
            <Check className="h-5 w-5" /> Aprovar Pagamento
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={() => setShowRecusa(true)}
          >
            <X className="h-5 w-5" /> Recusar
          </Button>
        </div>
      )}
    </AppShell>
  );
}
