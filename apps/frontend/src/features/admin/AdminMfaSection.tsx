import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  confirmMfaSchema,
  type ConfirmMfaInput,
  type MfaConfirmResponse,
  type MfaSetupResponse,
  type MfaStatus,
} from "@athlon/shared-types";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, ShieldCheck, Copy, Check } from "lucide-react";

export function AdminMfaSection() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data: status, isLoading } = useQuery({
    queryKey: ["mfa", "status"],
    queryFn: () => api<MfaStatus>("/auth/mfa/status"),
  });

  const setupMutation = useMutation({
    mutationFn: () => api<MfaSetupResponse>("/auth/mfa/setup", { method: "POST" }),
    onSuccess: (data) => {
      setSetupData(data);
      setBackupCodes(null);
      setError("");
      setMessage("");
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const confirmForm = useForm<ConfirmMfaInput>({
    resolver: zodResolver(confirmMfaSchema),
  });

  const confirmMutation = useMutation({
    mutationFn: (input: ConfirmMfaInput) =>
      api<MfaConfirmResponse>("/auth/mfa/confirm", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async (data) => {
      setBackupCodes(data.backupCodes);
      setSetupData(null);
      confirmForm.reset();
      setMessage("MFA ativado com sucesso. Guarde os códigos de backup em local seguro.");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["mfa", "status"] });
      await refreshUser();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const copyBackupCodes = async () => {
    if (!backupCodes) return;
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="mt-6 h-24 animate-pulse rounded-xl bg-muted" />;
  }

  const setupPendente = Boolean(status?.setupPendente);

  return (
    <Card className="mt-6 p-4">
      <div className="flex items-center gap-2">
        {status?.habilitado ? (
          <ShieldCheck className="h-5 w-5 text-green-600" />
        ) : (
          <Shield className="h-5 w-5 text-muted-foreground" />
        )}
        <h2 className="font-semibold text-primary">Autenticação em duas etapas (MFA)</h2>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {status?.habilitado
          ? `MFA ativo. Códigos de backup restantes: ${status.backupCodesRestantes}.`
          : setupPendente
            ? "Você já gerou um QR. Use o código de 6 dígitos da conta ATHLON no autenticador — não adicione outra conta. Se houver várias, use a mais recente."
            : "Obrigatório para administradores. Escaneie o QR no autenticador uma única vez para liberar o painel."}
      </p>

      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {backupCodes && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">Códigos de backup (guarde agora)</p>
          <p className="mt-1 text-xs text-amber-800">
            Cada código só pode ser usado uma vez. Não serão exibidos novamente.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
            {backupCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={copyBackupCodes}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar códigos"}
          </Button>
        </div>
      )}

      {!status?.habilitado && !setupData && setupPendente && (
        <div className="mt-4 space-y-3">
          <ConfirmMfaForm confirmForm={confirmForm} confirmMutation={confirmMutation} />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
          >
            {setupMutation.isPending ? "Carregando..." : "Mostrar QR outra vez (mesma conta)"}
          </Button>
        </div>
      )}

      {!status?.habilitado && !setupData && !setupPendente && (
        <Button
          className="mt-4 w-full"
          onClick={() => setupMutation.mutate()}
          disabled={setupMutation.isPending}
        >
          {setupMutation.isPending ? "Preparando..." : "Configurar MFA"}
        </Button>
      )}

      {setupData && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-center">
            <img
              src={setupData.qrCodeDataUrl}
              alt="QR Code MFA"
              className="h-44 w-44 rounded-lg border"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {setupPendente
              ? "Este QR é o mesmo de antes. Se a conta ATHLON já está no autenticador, não adicione de novo — só digite o código. Se houver várias contas ATHLON, use a mais recente."
              : "Escaneie uma vez com Google Authenticator, Authy ou similar. Depois use só o código de 6 dígitos. Se você já adicionou várias contas ATHLON, use a mais recente."}
          </p>
          <ConfirmMfaForm confirmForm={confirmForm} confirmMutation={confirmMutation} />
        </div>
      )}
    </Card>
  );
}

function ConfirmMfaForm({
  confirmForm,
  confirmMutation,
}: {
  confirmForm: UseFormReturn<ConfirmMfaInput>;
  confirmMutation: {
    mutate: (input: ConfirmMfaInput) => void;
    isPending: boolean;
  };
}) {
  return (
    <form
      onSubmit={confirmForm.handleSubmit((data) => confirmMutation.mutate(data))}
      className="space-y-3"
    >
      <div>
        <label htmlFor="mfa-codigo" className="mb-1.5 block text-sm font-medium">
          Código de verificação
        </label>
        <Input
          id="mfa-codigo"
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          {...confirmForm.register("codigo")}
        />
        {confirmForm.formState.errors.codigo && (
          <p className="mt-1 text-sm text-destructive">
            {confirmForm.formState.errors.codigo.message}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={confirmMutation.isPending}>
        {confirmMutation.isPending ? "Ativando..." : "Ativar MFA"}
      </Button>
    </form>
  );
}
