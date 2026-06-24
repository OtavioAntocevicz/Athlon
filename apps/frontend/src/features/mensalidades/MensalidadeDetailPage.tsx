import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Upload, FileCheck, Banknote } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatMes, formatDate } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Button } from "@/components/ui/button";
import type { InadimplenciaPrevisao, StatusMensalidade } from "@athlon/shared-types";

interface MensalidadeDetail {
  id: string;
  alunoNome: string;
  turmaNome: string;
  chavePix?: string | null;
  mesReferencia: string;
  vencimento: string | null;
  valorCentavos: number;
  status: StatusMensalidade;
  comprovanteUrl?: string | null;
  comprovanteId?: string | null;
  inadimplencia?: InadimplenciaPrevisao | null;
}

export function MensalidadeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["mensalidade", id],
    queryFn: () => api<MensalidadeDetail>(`/mensalidades/${id}`),
    enabled: !!id,
  });

  const marcarPagoMutation = useMutation({
    mutationFn: () => api(`/mensalidades/${id}/marcar-pago`, { method: "POST" }),
    onSuccess: () => {
      setMessage("Mensalidade marcada como paga.");
      queryClient.invalidateQueries({ queryKey: ["mensalidade", id] });
      queryClient.invalidateQueries({ queryKey: ["mensalidades"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => setMessage(e instanceof Error ? e.message : "Erro ao marcar como paga"),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const { uploadUrl, arquivoUrl, token } = await api<{
        uploadUrl: string;
        arquivoUrl: string;
        token: string;
      }>(`/mensalidades/${id}/comprovante/upload-url`, {
        method: "POST",
        body: JSON.stringify({ contentType: file.type }),
      });

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          Authorization: `Bearer ${token}`,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Falha ao enviar o arquivo. Tente novamente.");
      }

      await api(`/mensalidades/${id}/comprovante`, {
        method: "POST",
        body: JSON.stringify({ arquivoUrl }),
      });
    },
    onSuccess: () => {
      setMessage("Comprovante enviado! Aguardando aprovação.");
      queryClient.invalidateQueries({ queryKey: ["mensalidade", id] });
      queryClient.invalidateQueries({ queryKey: ["mensalidades"] });
    },
    onError: (e) => setMessage(e instanceof Error ? e.message : "Erro no upload"),
    onSettled: () => setUploading(false),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  if (isLoading || !data) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-muted mt-4" />
      </AppShell>
    );
  }

  const canUpload =
    user?.perfil === "ALUNO" &&
    ["PENDENTE", "RECUSADO", "ATRASADO"].includes(data.status);

  return (
    <AppShell>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <Card>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="font-bold text-lg text-primary">{data.alunoNome}</p>
            <p className="text-sm text-muted-foreground">{data.turmaNome}</p>
            <p className="text-sm text-muted-foreground">{formatMes(data.mesReferencia)}</p>
          </div>
          <StatusBadge status={data.status} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="font-bold">{formatCurrency(data.valorCentavos)}</p>
          </div>
          {data.vencimento && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className="font-bold">{formatDate(data.vencimento)}</p>
            </div>
          )}
        </div>

        {data.chavePix && user?.perfil === "ALUNO" && (
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => navigator.clipboard.writeText(data.chavePix!)}
          >
            <Copy className="h-4 w-4" /> Copiar PIX
          </Button>
        )}

        {user?.perfil === "PROFESSOR" && data.inadimplencia?.desbloquearaAoPagar && (
          <Card className="mt-4 border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">Inadimplência</p>
            <p className="mt-1 text-sm text-amber-800">
              Ao marcar como paga, o aluno <strong>{data.alunoNome}</strong> será
              desbloqueado de suas inadimplências nesta turma.
            </p>
          </Card>
        )}

        {user?.perfil === "PROFESSOR" &&
          data.status !== "PAGO" &&
          data.status !== "EM_ANALISE" && (
            <Button
              variant="success"
              className="mt-4 w-full"
              disabled={marcarPagoMutation.isPending}
              onClick={() => {
                const extra = data.inadimplencia?.desbloquearaAoPagar
                  ? `\n\nO aluno ${data.alunoNome} será desbloqueado de suas inadimplências.`
                  : "";
                if (
                  window.confirm(
                    `Confirmar pagamento manual desta mensalidade? Use quando o aluno pagou em dinheiro ou PIX direto.${extra}`,
                  )
                ) {
                  marcarPagoMutation.mutate();
                }
              }}
            >
              <Banknote className="h-4 w-4" /> Marcar como paga
            </Button>
          )}

        {user?.perfil === "PROFESSOR" && data.status === "EM_ANALISE" && data.comprovanteId && (
          <Button
            className="mt-4 w-full"
            onClick={() => navigate(`/comprovantes/${data.comprovanteId}`)}
          >
            <FileCheck className="h-4 w-4" /> Aprovar comprovante
          </Button>
        )}

        {user?.perfil === "PROFESSOR" && data.comprovanteUrl && data.status !== "EM_ANALISE" && (
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => window.open(data.comprovanteUrl!, "_blank")}
          >
            Ver comprovante enviado
          </Button>
        )}

        {canUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              className="mt-3 w-full"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Enviando..." : "Enviar comprovante"}
            </Button>
          </>
        )}

        {message && <p className="mt-3 text-sm text-center text-muted-foreground">{message}</p>}
      </Card>
    </AppShell>
  );
}
