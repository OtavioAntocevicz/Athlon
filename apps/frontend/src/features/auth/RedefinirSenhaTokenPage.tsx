import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { confirmPasswordResetSchema, type ConfirmPasswordResetInput } from "@athlon/shared-types";
import { api, getErrorMessage } from "@/lib/api";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import { PageEnter } from "@/components/ui/page-enter";

interface RedefinirSenhaTokenPageProps {
  loginPath: string;
  esqueciSenhaPath: string;
}

export function RedefinirSenhaTokenPage({
  loginPath,
  esqueciSenhaPath,
}: RedefinirSenhaTokenPageProps) {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmPasswordResetInput>({
    resolver: zodResolver(confirmPasswordResetSchema),
    defaultValues: {
      token: token ?? "",
      senhaNova: "",
      confirmarSenha: "",
    },
  });

  const onSubmit = async (data: ConfirmPasswordResetInput) => {
    setError("");
    try {
      await api("/auth/recuperar-senha/confirmar", {
        method: "POST",
        body: JSON.stringify({ ...data, token: token ?? data.token }),
      });
      setSuccess(true);
    } catch (e) {
      setError(getErrorMessage(e, "Link inválido ou expirado"));
    }
  };

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-mobile flex-col items-center justify-center bg-background px-6 py-8 text-center">
        <p className="text-sm text-destructive">Link inválido.</p>
        <Button className="mt-4" onClick={() => navigate(esqueciSenhaPath)}>
          Solicitar novo código
        </Button>
      </div>
    );
  }

  if (success) {
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
        <Logo size="lg" />
      </PageEnter>

      <PageEnter delay={70}>
        <h1 className="mt-8 text-2xl font-bold text-primary">Nova senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Você acessou pelo link do e-mail. Defina sua nova senha abaixo.
        </p>
      </PageEnter>

      <PageEnter delay={140}>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-primary">Nova senha</label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              {...register("senhaNova")}
            />
            {errors.senhaNova && (
              <p className="mt-1 text-sm text-destructive">{errors.senhaNova.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-primary">Confirmar nova senha</label>
            <Input
              type="password"
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              {...register("confirmarSenha")}
            />
            {errors.confirmarSenha && (
              <p className="mt-1 text-sm text-destructive">{errors.confirmarSenha.message}</p>
            )}
          </div>

          <input type="hidden" {...register("token")} value={token} />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Salvando..." : "Salvar nova senha"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate(esqueciSenhaPath)}
          >
            Solicitar novo código
          </Button>
        </form>
      </PageEnter>
    </div>
  );
}
