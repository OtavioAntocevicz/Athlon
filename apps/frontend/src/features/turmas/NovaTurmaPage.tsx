import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTurmaSchema,
  type CreateTurmaInput,
  type AuthUser,
  Modalidade,
} from "@athlon/shared-types";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

export function NovaTurmaPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<CreateTurmaInput>({
    resolver: zodResolver(createTurmaSchema),
    defaultValues: {
      modalidade: Modalidade.VOLEI,
      mensalidadeCentavos: 15000,
      diaVencimento: 10,
      chavePix: "",
    },
  });

  useEffect(() => {
    api<AuthUser>("/auth/me")
      .then((me) => {
        if (me.chavePix) setValue("chavePix", me.chavePix);
      })
      .catch(() => {});
  }, [setValue]);

  const onSubmit = async (data: CreateTurmaInput) => {
    setError("");
    try {
      await api("/turmas", { method: "POST", body: JSON.stringify(data) });
      navigate("/turmas");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar turma");
    }
  };

  return (
    <AppShell>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="mb-2 text-2xl font-bold text-primary">Nova Turma</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        A chave PIX vem do seu cadastro - altere aqui se esta turma usar outra conta.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Nome da turma</label>
          <Input placeholder="Ex: Adulto A" {...register("nome")} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Modalidade</label>
          <select
            className="flex h-12 w-full rounded-lg border border-primary/15 bg-white px-4 text-sm"
            {...register("modalidade")}
          >
            {Object.values(Modalidade).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Mensalidade (R$)</label>
          <Input
            type="number"
            step="0.01"
            placeholder="150.00"
            {...register("mensalidadeCentavos", {
              setValueAs: (v) => Math.round(parseFloat(v) * 100),
            })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Dia do vencimento</label>
          <Input
            type="number"
            min={1}
            max={28}
            {...register("diaVencimento", { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Chave PIX</label>
          <Input placeholder="CPF, e-mail ou telefone" {...register("chavePix")} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Local (opcional)</label>
          <Input placeholder="Quadra 1" {...register("local")} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Horário (opcional)</label>
          <Input placeholder="18:00" {...register("horarioInicio")} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar Turma"}
        </Button>
      </form>
    </AppShell>
  );
}
