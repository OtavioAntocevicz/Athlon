import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput, type AuthTokens } from "@athlon/shared-types";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ClipboardList, User } from "lucide-react";
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
  const config = PERFIL_CONFIG[perfil];
  const PerfilIcon = config.icon;
  const isProfessor = perfil === "PROFESSOR";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { perfil },
  });

  const onSubmit = async (data: LoginInput) => {
    setError("");
    try {
      const tokens = await api<AuthTokens>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      login(tokens);
      navigate(tokens.user.perfil === "ADM" ? "/admin" : "/");
    } catch (e) {
      setError(getErrorMessage(e, "Erro ao entrar"));
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
          onClick={() => navigate("/login")}
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
                isProfessor ? "bg-accent text-white" : "bg-primary text-white"
              }`}
            >
              <PerfilIcon className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">{config.title}</h1>
              <p className="mt-0.5 text-sm font-medium text-accent-strong">{config.subtitle}</p>
            </div>
          </div>
        </PageEnter>

        <PageEnter variant="fade" delay={150}>
          <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-brand-card">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-primary">E-mail</label>
                <Input type="email" placeholder="seu@email.com" {...register("email")} />
                {errors.email && (
                  <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-primary">Senha</label>
                <Input type="password" placeholder="••••••" {...register("senha")} />
                {errors.senha && (
                  <p className="mt-1 text-sm text-destructive">{errors.senha.message}</p>
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
              <input type="hidden" {...register("perfil")} />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="mt-2 shadow-brand-card"
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>
        </PageEnter>

        {cadastroPath && (
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
