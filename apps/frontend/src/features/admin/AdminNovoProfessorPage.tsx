import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createProfessorAdminSchema,
  type CreateProfessorAdminInput,
  type AdminProfessorCriado,
} from "@athlon/shared-types";
import { api, getErrorMessage } from "@/lib/api";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";

export function AdminNovoProfessorPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProfessorAdminInput>({
    resolver: zodResolver(createProfessorAdminSchema),
  });

  const onSubmit = async (data: CreateProfessorAdminInput) => {
    setError("");
    try {
      const created = await api<AdminProfessorCriado>("/admin/professores", {
        method: "POST",
        body: JSON.stringify(data),
      });
      navigate(`/admin/professores/${created.id}`);
    } catch (e) {
      setError(getErrorMessage(e, "Erro ao criar professor"));
    }
  };

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <button
          type="button"
          onClick={() => navigate("/admin/professores")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageHeader
          title="Novo professor"
          subtitle="O treinador usará estas credenciais para entrar no app"
        />

        <Card className="mt-2 p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Nome <span className="text-destructive">*</span>
              </label>
              <Input placeholder="Nome do treinador" {...register("nome")} />
              {errors.nome && <p className="mt-1 text-sm text-destructive">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                E-mail <span className="text-destructive">*</span>
              </label>
              <Input type="email" placeholder="treinador@email.com" {...register("email")} />
              {errors.email && (
                <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Senha inicial <span className="text-destructive">*</span>
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

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar professor"}
            </Button>
          </form>
        </Card>
      </PageEnter>
    </AdminShell>
  );
}
