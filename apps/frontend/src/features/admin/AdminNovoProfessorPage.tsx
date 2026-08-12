import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createProfessorAdminSchema,
  type CreateProfessorAdminInput,
  type AdminProfessorCriado,
} from "@athlon/shared-types";
import { api, getErrorMessage } from "@/lib/api";
import { maskChavePix } from "@/lib/masks";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";

export function AdminNovoProfessorPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    register,
    control,
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
      navigate(`/admin/professores/${created.id}`, {
        state: {
          conviteEnviado: created.conviteEnviado,
          conviteLink: created.conviteLink,
        },
      });
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
          subtitle="O treinador receberá um e-mail com link para criar a senha de acesso"
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
              <p className="mt-1 text-xs text-muted-foreground">
                Enviaremos um convite para este e-mail com o link de criação de senha.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Chave PIX <span className="text-destructive">*</span>
              </label>
              <Controller
                name="chavePix"
                control={control}
                render={({ field }) => (
                  <MaskedInput
                    placeholder="Ex: (41) 91234-5678, CPF ou e-mail"
                    inputMode="text"
                    autoComplete="off"
                    mask={maskChavePix}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                )}
              />
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
