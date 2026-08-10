import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerAlunoSchema,
  type RegisterAlunoInput,
  type AuthTokens,
} from "@athlon/shared-types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { maskCpf, maskRg, maskWhatsApp } from "@/lib/masks";
import { ArrowLeft } from "lucide-react";

const currentYear = new Date().getFullYear();

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function RegisterAlunoPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterAlunoInput>({
    resolver: zodResolver(registerAlunoSchema),
    defaultValues: {
      whatsapp: "",
      rg: "",
      cpf: "",
      codigoConvite: "",
    },
  });

  const codigoConvite = watch("codigoConvite") ?? "";
  const podeEnviar = codigoConvite.trim().length >= 4;

  const onSubmit = async (data: RegisterAlunoInput) => {
    setError("");
    const codigo = data.codigoConvite.trim().toUpperCase();
    if (codigo.length < 4) {
      setError("Informe o código da turma para criar a conta.");
      return;
    }
    try {
      const tokens = await api<AuthTokens>("/auth/register/aluno", {
        method: "POST",
        body: JSON.stringify({ ...data, codigoConvite: codigo }),
      });
      login(tokens);
      // Redirecionamento feito pelo GuestRoute após o estado de auth atualizar.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao cadastrar");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      <button
        onClick={() => navigate("/login/aluno")}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="text-2xl font-bold text-primary">Criar conta de Aluno</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        É obrigatório ter o código da turma do treinador para se cadastrar.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <Field label="Código da turma" required error={errors.codigoConvite?.message}>
          <Input
            placeholder="Ex: AB12CD34"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            {...register("codigoConvite")}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Sem o código válido da turma, a conta não é criada.
          </p>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome" required error={errors.nome?.message}>
            <Input placeholder="João" {...register("nome")} />
          </Field>
          <Field label="Sobrenome" required error={errors.sobrenome?.message}>
            <Input placeholder="Silva" {...register("sobrenome")} />
          </Field>
        </div>

        <Field label="E-mail" required error={errors.email?.message}>
          <Input type="email" placeholder="seu@email.com" {...register("email")} />
        </Field>

        <Field label="Senha" required error={errors.senha?.message}>
          <Input type="password" placeholder="Mínimo 6 caracteres" {...register("senha")} />
        </Field>

        <Field label="WhatsApp" required error={errors.whatsapp?.message}>
          <Controller
            name="whatsapp"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask={maskWhatsApp}
                placeholder="(41) 91234-5678"
                inputMode="tel"
                autoComplete="tel"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>

        <Field label="Ano de nascimento" required error={errors.anoNascimento?.message}>
          <Input
            type="number"
            placeholder={`Ex: ${currentYear - 18}`}
            min={1920}
            max={currentYear}
            {...register("anoNascimento", { valueAsNumber: true })}
          />
        </Field>

        <Field label="RG" required error={errors.rg?.message}>
          <Controller
            name="rg"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask={maskRg}
                placeholder="00.000.000-0"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>

        <Field label="CPF" error={errors.cpf?.message}>
          <Controller
            name="cpf"
            control={control}
            render={({ field }) => (
              <MaskedInput
                mask={maskCpf}
                placeholder="000.000.000-00 (opcional)"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={isSubmitting || !podeEnviar}>
          {isSubmitting ? "Criando..." : "Criar conta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/login/aluno" className="font-semibold text-primary underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
