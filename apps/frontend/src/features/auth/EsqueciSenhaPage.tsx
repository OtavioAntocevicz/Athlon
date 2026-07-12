import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  requestPasswordResetSchema,
  confirmPasswordResetSchema,
  type RequestPasswordResetInput,
  type ConfirmPasswordResetInput,
} from "@athlon/shared-types";
import { api, getErrorMessage } from "@/lib/api";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { PageEnter } from "@/components/ui/page-enter";

interface EsqueciSenhaPageProps {
  perfil: "PROFESSOR" | "ALUNO";
  title: string;
  loginPath: string;
  cadastroPath?: string;
}

type Step = "email" | "codigo" | "sucesso";

export function EsqueciSenhaPage({
  perfil,
  title,
  loginPath,
  cadastroPath,
}: EsqueciSenhaPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const initialStep = searchParams.get("step") === "codigo" && initialEmail ? "codigo" : "email";

  const [step, setStep] = useState<Step>(initialStep);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [emailEnviado, setEmailEnviado] = useState(initialEmail);
  const [codigoTemporario, setCodigoTemporario] = useState("");

  const emailForm = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { perfil, email: initialEmail },
  });

  const codigoForm = useForm<ConfirmPasswordResetInput>({
    resolver: zodResolver(confirmPasswordResetSchema),
    defaultValues: {
      perfil,
      email: initialEmail,
      codigo: "",
      senhaNova: "",
      confirmarSenha: "",
    },
  });

  const solicitarCodigo = async (data: RequestPasswordResetInput) => {
    setError("");
    setInfo("");
    setCodigoTemporario("");
    try {
      const result = await api<{
        ok: boolean;
        message: string;
        codigo?: string;
        link?: string;
      }>("/auth/recuperar-senha/solicitar", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setEmailEnviado(data.email);
      codigoForm.setValue("email", data.email);
      codigoForm.setValue("perfil", perfil);
      if (result.codigo) {
        setCodigoTemporario(result.codigo);
        codigoForm.setValue("codigo", result.codigo);
      }
      setInfo(result.message);
      setStep("codigo");
    } catch (e) {
      setError(getErrorMessage(e, "Erro ao enviar código"));
    }
  };

  const confirmarCodigo = async (data: ConfirmPasswordResetInput) => {
    setError("");
    try {
      await api("/auth/recuperar-senha/confirmar", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setStep("sucesso");
    } catch (e) {
      setError(getErrorMessage(e, "Erro ao redefinir senha"));
    }
  };

  if (step === "sucesso") {
    return (
      <div className="mx-auto flex min-h-screen max-w-mobile flex-col bg-background px-6 py-8">
        <PageEnter>
          <div className="flex flex-col items-center pt-12 text-center">
            <CheckCircle2 className="h-14 w-14 text-accent" strokeWidth={1.75} />
            <h1 className="mt-6 text-2xl font-bold text-primary">Senha redefinida</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua nova senha foi salva. Agora você já pode entrar na sua conta.
            </p>
            <Button size="lg" className="mt-8 w-full" onClick={() => navigate(loginPath)}>
              Ir para o login
            </Button>
          </div>
        </PageEnter>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-mobile flex-col bg-background px-6 py-8">
      <PageEnter>
        <button
          type="button"
          onClick={() => (step === "codigo" ? setStep("email") : navigate(loginPath))}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {step === "codigo" ? "Voltar" : "Voltar ao login"}
        </button>

        <Logo size="lg" />
      </PageEnter>

      <PageEnter delay={70}>
        <h1 className="mt-8 text-2xl font-bold text-primary">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "email"
            ? "Enviaremos um código de 6 dígitos para o seu e-mail cadastrado"
            : `Digite o código enviado para ${emailEnviado}`}
        </p>
      </PageEnter>

      {step === "email" ? (
        <PageEnter delay={140}>
          <form onSubmit={emailForm.handleSubmit(solicitarCodigo)} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">E-mail</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                {...emailForm.register("email")}
              />
              {emailForm.formState.errors.email && (
                <p className="mt-1 text-sm text-destructive">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <input type="hidden" {...emailForm.register("perfil")} />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              size="lg"
              disabled={emailForm.formState.isSubmitting}
              className="mt-2"
            >
              {emailForm.formState.isSubmitting ? "Enviando..." : "Enviar código"}
            </Button>
          </form>
        </PageEnter>
      ) : (
        <PageEnter delay={140}>
          {info && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/10 bg-muted/40 p-4 text-sm text-muted-foreground">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>{info}</p>
            </div>
          )}

          {codigoTemporario && (
            <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-center">
              <p className="text-xs font-medium text-accent-strong">Código temporário (sem e-mail)</p>
              <p className="mt-1 text-2xl font-bold tracking-[0.3em] text-primary">{codigoTemporario}</p>
              <p className="mt-1 text-xs text-muted-foreground">Já preenchido no campo abaixo</p>
            </div>
          )}

          <form onSubmit={codigoForm.handleSubmit(confirmarCodigo)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">Código de 6 dígitos</label>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                {...codigoForm.register("codigo")}
              />
              {codigoForm.formState.errors.codigo && (
                <p className="mt-1 text-sm text-destructive">
                  {codigoForm.formState.errors.codigo.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">Nova senha</label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                {...codigoForm.register("senhaNova")}
              />
              {codigoForm.formState.errors.senhaNova && (
                <p className="mt-1 text-sm text-destructive">
                  {codigoForm.formState.errors.senhaNova.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">Confirmar nova senha</label>
              <Input
                type="password"
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                {...codigoForm.register("confirmarSenha")}
              />
              {codigoForm.formState.errors.confirmarSenha && (
                <p className="mt-1 text-sm text-destructive">
                  {codigoForm.formState.errors.confirmarSenha.message}
                </p>
              )}
            </div>

            <input type="hidden" {...codigoForm.register("email")} />
            <input type="hidden" {...codigoForm.register("perfil")} />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              size="lg"
              disabled={codigoForm.formState.isSubmitting}
              className="mt-2"
            >
              {codigoForm.formState.isSubmitting ? "Salvando..." : "Redefinir senha"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={emailForm.formState.isSubmitting}
              onClick={() => solicitarCodigo({ email: emailEnviado, perfil })}
            >
              Reenviar código
            </Button>
          </form>
        </PageEnter>
      )}

      {cadastroPath && (
        <PageEnter delay={210} className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link to={cadastroPath} className="font-semibold text-primary underline">
            Cadastre-se
          </Link>
        </PageEnter>
      )}
    </div>
  );
}
