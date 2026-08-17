import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  loginMfaSchema,
  type LoginInput,
  type LoginMfaInput,
  type AuthTokens,
} from "@athlon/shared-types";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ClipboardList, ShieldCheck, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageEnter } from "@/components/ui/page-enter";

interface LoginFormPageProps {
  perfil: "PROFESSOR" | "ALUNO";
  title: string;
  cadastroPath?: string;
  esqueciSenhaPath: string;
}

const PERFIL_CONFIG = {
  PROFESSOR: {
    title: "Entrar como Treinador",
    subtitle: "Acesse sua conta de treinador",
    icon: ClipboardList,
  },
  ALUNO: {
    title: "Entrar como Aluno",
    subtitle: "Acesse sua conta de atleta",
    icon: User,
  },
} as const satisfies Record<
  LoginFormPageProps["perfil"],
  { title: string; subtitle: string; icon: LucideIcon }
>;

export function LoginFormPage({
  perfil,
  cadastroPath,
  esqueciSenhaPath,
}: LoginFormPageProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [mfaStep, setMfaStep] = useState(false);
  const config = PERFIL_CONFIG[perfil];
  const PerfilIcon = config.icon;
  const isProfessor = perfil === "PROFESSOR";

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { perfil },
  });

  const mfaForm = useForm<LoginMfaInput>({
    resolver: zodResolver(loginMfaSchema),
  });

  const onSubmitLogin = async (data: LoginInput) => {
    setError("");
    try {
      const result = await api<AuthTokens>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (result.requiresMfa) {
        setMfaStep(true);
        return;
      }
      login(result);
    } catch (e) {
      setError(getErrorMessage(e, "Erro ao entrar"));
    }
  };

  const onSubmitMfa = async (data: LoginMfaInput) => {
    setError("");
    try {
      const result = await api<AuthTokens>("/auth/login/mfa", {
        method: "POST",
        body: JSON.stringify(data),
      });
      login(result);
    } catch (e) {
      setError(getErrorMessage(e, "Código inválido"));
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen max-w-mobile flex-col bg-background px-6 pb-8 pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-25deg, #E8B84A 0px, #E8B84A 2px, transparent 2px, transparent 22px)",
          maskImage: "linear-gradient(to bottom, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      <PageEnter variant="fade">
        <button
          type="button"
          onClick={() => (mfaStep ? setMfaStep(false) : navigate("/login"))}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      </PageEnter>

      <div className="flex flex-col gap-10">
        <PageEnter variant="fade" delay={50} className="flex justify-center">
          <Logo size="lg" />
        </PageEnter>

        <PageEnter variant="fade" delay={100}>
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                mfaStep
                  ? "bg-primary text-white"
                  : isProfessor
                    ? "bg-accent text-white"
                    : "bg-primary text-white"
              }`}
            >
              {mfaStep ? (
                <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
              ) : (
                <PerfilIcon className="h-5 w-5" strokeWidth={2.25} />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">
                {mfaStep ? "Verificação em duas etapas" : config.title}
              </h1>
              <p className="mt-0.5 text-sm font-medium text-accent-strong">
                {mfaStep
                  ? "Digite o código do seu aplicativo autenticador"
                  : config.subtitle}
              </p>
            </div>
          </div>
        </PageEnter>

        <PageEnter variant="fade" delay={150}>
          <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-brand-card">
            {mfaStep ? (
              <form onSubmit={mfaForm.handleSubmit(onSubmitMfa)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-primary">
                    Código de verificação
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={9}
                    {...mfaForm.register("codigo")}
                  />
                  {mfaForm.formState.errors.codigo && (
                    <p className="mt-1 text-sm text-destructive">
                      {mfaForm.formState.errors.codigo.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Use o código de 6 dígitos do app autenticador ou um código de backup.
                  </p>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  size="lg"
                  disabled={mfaForm.formState.isSubmitting}
                  className="mt-2 shadow-brand-card"
                >
                  {mfaForm.formState.isSubmitting ? "Verificando..." : "Confirmar"}
                </Button>
              </form>
            ) : (
              <form onSubmit={loginForm.handleSubmit(onSubmitLogin)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-primary">E-mail</label>
                  <Input type="email" placeholder="seu@email.com" {...loginForm.register("email")} />
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-primary">Senha</label>
                  <Input type="password" placeholder="••••••" {...loginForm.register("senha")} />
                  {loginForm.formState.errors.senha && (
                    <p className="mt-1 text-sm text-destructive">
                      {loginForm.formState.errors.senha.message}
                    </p>
                  )}
                  <div className="mt-2 text-right">
                    <Link
                      to={esqueciSenhaPath}
                      className="text-sm font-medium text-primary underline decoration-primary/30"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                </div>
                <input type="hidden" {...loginForm.register("perfil")} />

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  size="lg"
                  disabled={loginForm.formState.isSubmitting}
                  className="mt-2 shadow-brand-card"
                >
                  {loginForm.formState.isSubmitting ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            )}
          </div>
        </PageEnter>

        {!mfaStep && cadastroPath && (
          <PageEnter variant="fade" delay={150} className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to={cadastroPath} className="font-semibold text-primary underline">
              Cadastre-se
            </Link>
          </PageEnter>
        )}
      </div>
    </div>
  );
}
