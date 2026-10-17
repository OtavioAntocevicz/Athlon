import { useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Upload, FileCheck, Banknote } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatMes, formatDate } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-error";
import { StepIndicator } from "@/components/ui/step-indicator";
import { useToast } from "@/components/ui/toast";
import { copyTextWithToast } from "@/lib/copy-with-toast";
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
  const { toast } = useToast();
  const [uploadStep, setUploadStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const uploadSteps = useMemo(
    () => [
      { id: 1, label: "PIX" },
      { id: 2, label: "Arquivo" },
      { id: 3, label: "Enviar" },
    ],
    [],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
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
      const contentType = file.type === "image/jpg" ? "image/jpeg" : file.type || "image/jpeg";
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowed.includes(contentType)) {
        throw new Error("Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF.");
      }
      if (file.size > 8 * 1024 * 1024) {
        throw new Error("Arquivo muito grande. Máximo 8 MB.");
      }

      const signed = await api<{ uploadUrl: string; arquivoUrl: string }>(
        `/mensalidades/${id}/comprovante/upload-url`,
        { method: "POST", body: JSON.stringify({ contentType }) },
      );

      const putRes = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!putRes.ok) throw new Error("Falha ao enviar o arquivo. Tente novamente.");

      await api(`/mensalidades/${id}/comprovante`, {
        method: "POST",
        body: JSON.stringify({ arquivoUrl: signed.arquivoUrl }),
      });
    },
    onSuccess: () => {
      setMessage("Comprovante enviado! Aguardando aprovação.");
      setUploadStep(1);
      setSelectedFile(null);
      setPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ["mensalidade", id] });
      queryClient.invalidateQueries({ queryKey: ["mensalidades"] });
      toast("Comprovante enviado!", "success");
    },
    onError: (e) => setMessage(getErrorMessage(e, "Erro no upload")),
    onSettled: () => setUploading(false),
  });

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    setUploadStep(3);
    setMessage("");
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-muted mt-4" />
      </AppShell>
    );
  }

  if (isError || !data) {
    return (
      <AppShell>
        <QueryError
          message={getErrorMessage(error, "Não foi possível carregar a mensalidade.")}
          onRetry={() => void refetch()}
        />
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
            onClick={() => void copyTextWithToast(data.chavePix!, toast, "PIX copiado!")}
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
          <div className="mt-6 border-t border-primary/10 pt-4">
            <p className="mb-3 text-sm font-semibold text-primary">Enviar comprovante</p>
            <StepIndicator steps={uploadSteps} current={uploadStep} className="mb-4" />
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFilePick}
            />
            {uploadStep === 1 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  1. Copie o PIX e pague no app do banco.
                </p>
                <Button className="w-full" onClick={() => setUploadStep(2)}>
                  Já paguei — escolher arquivo
                </Button>
              </div>
            )}
            {uploadStep === 2 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  2. Selecione foto ou PDF do comprovante (até 8 MB).
                </p>
                <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Escolher arquivo
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setUploadStep(1)}>
                  Voltar
                </Button>
              </div>
            )}
            {uploadStep === 3 && selectedFile && (
              <div className="space-y-3">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Prévia do comprovante"
                    className="max-h-48 w-full rounded-lg border object-contain"
                  />
                )}
                <p className="text-sm text-muted-foreground truncate">{selectedFile.name}</p>
                <Button
                  className="w-full"
                  disabled={uploading}
                  onClick={() => uploadMutation.mutate(selectedFile)}
                >
                  {uploading ? "Enviando..." : "Confirmar envio"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => {
                    setUploadStep(2);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  Trocar arquivo
                </Button>
              </div>
            )}
          </div>
        )}

        {message && <p className="mt-3 text-sm text-center text-muted-foreground">{message}</p>}
      </Card>
    </AppShell>
  );
}
