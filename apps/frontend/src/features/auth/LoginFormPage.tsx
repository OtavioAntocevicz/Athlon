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
import { ArrowLeft } from "lucide-react";
import { PageEnter } from "@/components/ui/page-enter";

interface LoginFormPageProps {
  perfil: "PROFESSOR" | "ALUNO";
  title: string;
  cadastroPath: string;
}

export function LoginFormPage({ perfil, title, cadastroPath }: LoginFormPageProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");

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
      navigate("/");
    } catch (e) {
      setError(getErrorMessage(e, "Erro ao entrar"));
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-mobile flex-col bg-background px-6 py-8">
      <PageEnter>
        <button
          onClick={() => navigate("/login")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <Logo size="lg" />
      </PageEnter>

      <PageEnter delay={70}>
        <h1 className="mt-8 text-2xl font-bold text-primary">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Entre com seu e-mail e senha</p>
      </PageEnter>

      <PageEnter delay={140}>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
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
          </div>
          <input type="hidden" {...register("perfil")} />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </PageEnter>

      <PageEnter delay={210} className="mt-6 text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link to={cadastroPath} className="font-semibold text-primary underline">
          Cadastre-se
        </Link>
      </PageEnter>
    </div>
  );
}
