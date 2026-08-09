import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTurmaSchema,
  type CreateTurmaInput,
  type AuthUser,
  Modalidade,
} from "@athlon/shared-types";
import { api } from "@/lib/api";
import {
  formatCentavosInput,
  maskCurrencyBRL,
  parseReaisToCentavos,
} from "@/lib/masks";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { ArrowLeft } from "lucide-react";

const PLACEHOLDER_INPUT =
  "placeholder:text-muted-foreground/50 placeholder:font-normal";

export function NovaTurmaPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { isSubmitting, errors },
  } = useForm<CreateTurmaInput>({
    resolver: zodResolver(createTurmaSchema),
    defaultValues: {
      modalidade: Modalidade.VOLEI,
      chavePix: "",
      local: "",
      horarioInicio: "",
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
          <Input
            className={PLACEHOLDER_INPUT}
            placeholder="Ex: Adulto A"
            {...register("nome")}
          />
          {errors.nome && (
            <p className="mt-1 text-xs text-destructive">{errors.nome.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Modalidade</label>
          <select
            className="flex h-12 w-full rounded-lg border border-primary/15 bg-white px-4 text-sm text-primary"
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
          <Controller
            name="mensalidadeCentavos"
            control={control}
            render={({ field }) => (
              <MaskedInput
                className={PLACEHOLDER_INPUT}
                placeholder="150,00"
                inputMode="decimal"
                mask={maskCurrencyBRL}
                value={
                  typeof field.value === "number" && field.value > 0
                    ? formatCentavosInput(field.value)
                    : ""
                }
                onChange={(masked) => {
                  const cents = parseReaisToCentavos(masked);
                  field.onChange(cents ?? undefined);
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
          {errors.mensalidadeCentavos && (
            <p className="mt-1 text-xs text-destructive">
              Informe um valor válido (ex: 150,00)
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Dia do vencimento</label>
          <Input
            type="number"
            min={1}
            max={28}
            className={PLACEHOLDER_INPUT}
            placeholder="Ex: 10"
            {...register("diaVencimento", {
              setValueAs: (v) => {
                if (v === "" || v === null || v === undefined) return undefined;
                const n = Number(v);
                return Number.isFinite(n) ? n : undefined;
              },
            })}
          />
          {errors.diaVencimento && (
            <p className="mt-1 text-xs text-destructive">
              Informe o dia do vencimento (1 a 28)
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Chave PIX</label>
          <Input
            className={PLACEHOLDER_INPUT}
            placeholder="Ex: CPF, e-mail ou telefone"
            {...register("chavePix")}
          />
          {errors.chavePix && (
            <p className="mt-1 text-xs text-destructive">{errors.chavePix.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Local (opcional)</label>
          <Input
            className={PLACEHOLDER_INPUT}
            placeholder="Ex: Quadra 1"
            {...register("local")}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Horário (opcional)</label>
          <Input
            className={PLACEHOLDER_INPUT}
            placeholder="Ex: 18:00"
            {...register("horarioInicio")}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar Turma"}
        </Button>
      </form>
    </AppShell>
  );
}
