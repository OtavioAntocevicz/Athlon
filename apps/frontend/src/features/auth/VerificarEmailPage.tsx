import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  confirmEmailVerificationSchema,
  type ConfirmEmailVerificationInput,
  type AuthTokens,
} from "@athlon/shared-types";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/layout/Logo";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, MessageSquare, CheckCircle2 } from "lucide-react";
import { PageEnter } from "@/components/ui/page-enter";

export function VerificarEmailPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [codigoTemporario, setCodigoTemporario] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmEmailVerificationInput>({
    resolver: zodResolver(confirmEmailVerificationSchema),
    defaultValues: { codigo: "" },
  });

  const confirmar = async (data: ConfirmEmailVerificationInput) => {
    setError("");
    setInfo("");
    try {
      const tokens = await api<AuthTokens>("/auth/verificar-email/confirmar", {
        method: "POST",
        body: JSON.stringify(data),
      });
      login(tokens);
      setConfirmado(true);
    } catch (e) {
      setError(getErrorMessage(e, "Código inválido ou expirado"));
    }
  };

  const reenviar = async () => {
    setError("");
    setInfo("");
    setCodigoTemporario("");
    setReenviando(true);
    try {
      const result = await api<{ ok: boolean; message: string; codigo?: string }>(
        "/auth/verificar-email/reenviar",
        { method: "POST" },
      );
      setInfo(result.message);
      if (result.codigo) {
        setCodigoTemporario(result.codigo);
        setValue("codigo", result.codigo);
      }
    } catch (e) {
      setError(getErrorMessage(e, "Não foi possível reenviar o código"));
    } finally {
      setReenviando(false);
    }
  };

  if (confirmado) {
    return (
      <AppShell showNav={false}>
        <PageEnter variant="fade" className="flex min-h-[70vh] flex-col items-center justify-center px-2 text-center">
          <CheckCircle2 className="h-16 w-16 text-success" />
          <h1 className="mt-6 text-2xl font-bold text-primary">E-mail confirmado!</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Agora peça o código da turma ao seu treinador e entre na sua primeira turma.
          </p>
          <Button className="mt-8 w-full max-w-xs" size="lg" onClick={() => navigate("/minhas-turmas")}>
            Entrar na minha turma
          </Button>
          <Button
            className="mt-3 w-full max-w-xs"
            variant="outline"
            onClick={() => navigate("/")}
          >
            Ir para o início
          </Button>
        </PageEnter>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageEnter variant="fade">
        <div className="flex justify-center pt-4">
          <Logo size="lg" />
        </div>

        <div className="mt-8 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">Confirme seu e-mail</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enviamos um código de 6 dígitos para{" "}
              <span className="font-medium text-primary">{user?.email}</span>
            </p>
          </div>
        </div>

        <Card className="mt-6 space-y-4 p-5">
          <form onSubmit={handleSubmit(confirmar)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Código de verificação</label>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                className="text-center text-lg tracking-[0.35em]"
                {...register("codigo")}
              />
              {errors.codigo && (
                <p className="mt-1 text-sm text-destructive">{errors.codigo.message}</p>
              )}
            </div>

            {codigoTemporario && (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                Modo dev: código <strong className="text-primary">{codigoTemporario}</strong>
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-muted-foreground">{info}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Confirmando..." : "Confirmar e-mail"}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={reenviando}
            onClick={() => void reenviar()}
          >
            {reenviando ? "Reenviando..." : "Reenviar código"}
          </Button>
        </Card>

        <Card className="mt-4 p-4">
          <p className="text-sm font-medium text-primary">Não recebeu o e-mail?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique a caixa de spam ou abra um chamado de suporte.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link to="/chamados">
              <Button variant="outline" size="sm" className="w-full">
                <MessageSquare className="h-4 w-4" /> Abrir chamado de suporte
              </Button>
            </Link>
            <Link to="/perfil">
              <Button variant="outline" size="sm" className="w-full">
                Ir para o perfil
              </Button>
            </Link>
          </div>
        </Card>
      </PageEnter>
    </AppShell>
  );
}
