import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerProfessorSchema,
  type RegisterProfessorInput,
  type AuthTokens,
} from "@athlon/shared-types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

export function RegisterProfessorPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterProfessorInput>({
    resolver: zodResolver(registerProfessorSchema),
  });

  const onSubmit = async (data: RegisterProfessorInput) => {
    setError("");
    try {
      const tokens = await api<AuthTokens>("/auth/register/professor", {
        method: "POST",
        body: JSON.stringify(data),
      });
      login(tokens);
      navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao cadastrar");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      <button
        onClick={() => navigate("/login/professor")}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="text-2xl font-bold text-primary">Criar conta de Treinador</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A chave PIX cadastrada aqui será usada ao criar turmas - você pode alterá-la depois.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Nome <span className="text-destructive">*</span>
          </label>
          <Input placeholder="Seu nome" {...register("nome")} />
          {errors.nome && (
            <p className="mt-1 text-sm text-destructive">{errors.nome.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            E-mail <span className="text-destructive">*</span>
          </label>
          <Input type="email" placeholder="seu@email.com" {...register("email")} />
          {errors.email && (
            <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Senha <span className="text-destructive">*</span>
          </label>
          <Input type="password" placeholder="Mínimo 6 caracteres" {...register("senha")} />
          {errors.senha && (
            <p className="mt-1 text-sm text-destructive">{errors.senha.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Chave PIX <span className="text-destructive">*</span>
          </label>
          <Input placeholder="CPF, e-mail ou telefone" {...register("chavePix")} />
          {errors.chavePix && (
            <p className="mt-1 text-sm text-destructive">{errors.chavePix.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar conta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/login/professor" className="font-semibold text-primary underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
