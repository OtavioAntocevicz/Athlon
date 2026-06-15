import { useState, type MouseEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Users, Copy, Check, ClipboardList, Pencil, X, MapPin, Clock } from "lucide-react";
import {
  updateTurmaBasicoSchema,
  type UpdateTurmaBasicoInput,
  Modalidade,
  NivelTurma,
  type StatusMensalidade,
} from "@athlon/shared-types";
import { api } from "@/lib/api";
import { formatCurrency, getInitials } from "@/lib/format";
import { maskRg } from "@/lib/masks";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/domain/StatusDot";

interface TurmaDetail {
  id: string;
  nome: string;
  modalidade: string;
  nivel: string;
  codigoConvite: string;
  mensalidadeCentavos: number;
  diaVencimento: number;
  chavePix: string;
  local: string | null;
  horarioInicio: string | null;
  horarioFim: string | null;
}

interface AlunoTurma {
  id: string;
  nome: string;
  sobrenome: string;
  rg: string | null;
  numeroCamisa: number | null;
  posicao: string | null;
  statusFinanceiro: StatusMensalidade;
}

function formatAlunosParaCopia(alunos: AlunoTurma[]): string {
  const linhas = [
    "Nome completo\tRG\tNº camisa\tPosição",
    ...alunos.map((a) => {
      const nome = [a.nome, a.sobrenome].filter(Boolean).join(" ");
      const rg = a.rg ? maskRg(a.rg) : "-";
      const camisa = a.numeroCamisa != null ? String(a.numeroCamisa) : "-";
      const pos = a.posicao ?? "-";
      return `${nome}\t${rg}\t${camisa}\t${pos}`;
    }),
  ];
  return linhas.join("\n");
}

export function TurmaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [copiedCodigo, setCopiedCodigo] = useState(false);
  const [copiedAlunos, setCopiedAlunos] = useState(false);
  const [saveError, setSaveError] = useState("");

  const { data: turma, isLoading } = useQuery({
    queryKey: ["turma", id],
    queryFn: () => api<TurmaDetail>(`/turmas/${id}`),
    enabled: !!id,
  });

  const { data: alunos } = useQuery({
    queryKey: ["turma", id, "alunos"],
    queryFn: () => api<AlunoTurma[]>(`/turmas/${id}/alunos`),
    enabled: !!id,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<UpdateTurmaBasicoInput>({
    resolver: zodResolver(updateTurmaBasicoSchema),
    values: turma
      ? {
          nome: turma.nome,
          modalidade: turma.modalidade as UpdateTurmaBasicoInput["modalidade"],
          nivel: turma.nivel as UpdateTurmaBasicoInput["nivel"],
          mensalidadeCentavos: turma.mensalidadeCentavos,
          diaVencimento: turma.diaVencimento,
          chavePix: turma.chavePix,
          local: turma.local ?? "",
          horarioInicio: turma.horarioInicio ?? "",
          horarioFim: turma.horarioFim ?? "",
        }
      : undefined,
  });

  const salvarMutation = useMutation({
    mutationFn: (data: UpdateTurmaBasicoInput) =>
      api<TurmaDetail>(`/turmas/${id}/basico`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setSaveError("");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["turma", id] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  const copyCodigo = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!turma) return;
    await navigator.clipboard.writeText(turma.codigoConvite);
    setCopiedCodigo(true);
    setTimeout(() => setCopiedCodigo(false), 2000);
  };

  const copyAlunos = async () => {
    if (!alunos?.length) return;
    await navigator.clipboard.writeText(formatAlunosParaCopia(alunos));
    setCopiedAlunos(true);
    setTimeout(() => setCopiedAlunos(false), 2000);
  };

  const turmaFormValues = (t: TurmaDetail): UpdateTurmaBasicoInput => ({
    nome: t.nome,
    modalidade: t.modalidade as UpdateTurmaBasicoInput["modalidade"],
    nivel: t.nivel as UpdateTurmaBasicoInput["nivel"],
    mensalidadeCentavos: t.mensalidadeCentavos,
    diaVencimento: t.diaVencimento,
    chavePix: t.chavePix,
    local: t.local ?? "",
    horarioInicio: t.horarioInicio ?? "",
    horarioFim: t.horarioFim ?? "",
  });

  const iniciarEdicao = () => {
    if (!turma) return;
    reset(turmaFormValues(turma));
    setSaveError("");
    setEditing(true);
  };

  const cancelarEdicao = () => {
    if (turma) reset(turmaFormValues(turma));
    setSaveError("");
    setEditing(false);
  };

  if (isLoading || !turma) {
    return (
      <AppShell>
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-primary">Dados da turma</h2>
          {!editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={iniciarEdicao}
              aria-label="Editar dados da turma"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        {editing ? (
          <form
            onSubmit={handleSubmit((data) => salvarMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nome</label>
              <Input {...register("nome")} />
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
              <label className="mb-1.5 block text-sm font-medium">Nível</label>
              <select
                className="flex h-12 w-full rounded-lg border border-primary/15 bg-white px-4 text-sm"
                {...register("nivel")}
              >
                {Object.values(NivelTurma).map((n) => (
                  <option key={n} value={n}>
                    {n}
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
                  <Input
                    type="number"
                    step="0.01"
                    value={field.value / 100}
                    onChange={(e) => {
                      const reais = parseFloat(e.target.value);
                      field.onChange(Number.isFinite(reais) ? Math.round(reais * 100) : 0);
                    }}
                  />
                )}
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
              <Input {...register("chavePix")} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Local</label>
              <Input placeholder="Ex: Ginásio Municipal" {...register("local")} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Horário início</label>
                <Input type="time" {...register("horarioInicio")} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Horário fim</label>
                <Input type="time" {...register("horarioFim")} />
              </div>
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
                onClick={cancelarEdicao}
              >
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium text-primary">{turma.nome}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Modalidade</p>
              <p className="font-medium text-primary">{turma.modalidade}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nível</p>
              <p className="font-medium text-primary">{turma.nivel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mensalidade</p>
              <p className="font-medium text-primary">
                {formatCurrency(turma.mensalidadeCentavos)}/mês
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className="font-medium text-primary">Dia {turma.diaVencimento}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chave PIX</p>
              <p className="truncate font-medium text-primary">{turma.chavePix}</p>
            </div>
            {turma.local && (
              <div className="sm:col-span-2">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> Local
                </p>
                <p className="font-medium text-primary">{turma.local}</p>
              </div>
            )}
            {turma.horarioInicio && (
              <div className="sm:col-span-2">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Horário
                </p>
                <p className="font-medium text-primary">
                  {turma.horarioInicio}
                  {turma.horarioFim ? ` – ${turma.horarioFim}` : ""}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Código da turma</p>
            <p className="truncate text-sm font-semibold text-accent">
              {turma.codigoConvite}
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={copyCodigo}>
            {copiedCodigo ? (
              <>
                <Check className="h-4 w-4" /> Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar
              </>
            )}
          </Button>
        </div>
      </Card>

      <div className="mt-6 mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold text-primary flex items-center gap-2">
          <Users className="h-5 w-5" /> Alunos ({alunos?.length ?? 0})
        </h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!alunos?.length}
          onClick={copyAlunos}
        >
          {copiedAlunos ? (
            <>
              <Check className="h-4 w-4" /> Copiado
            </>
          ) : (
            <>
              <ClipboardList className="h-4 w-4" /> Copiar lista
            </>
          )}
        </Button>
      </div>

      <div className="space-y-2">
        {alunos?.map((a) => {
          const nomeCompleto = [a.nome, a.sobrenome].filter(Boolean).join(" ");
          const camisa = a.numeroCamisa != null ? `#${a.numeroCamisa}` : "—";
          const posicao = a.posicao ?? "—";

          return (
            <Card key={a.id} className="flex items-center gap-3 p-3">
              <StatusDot status={a.statusFinanceiro} />
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-primary">
                {getInitials(nomeCompleto)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">{nomeCompleto}</p>
                <p className="text-xs text-muted-foreground">
                  Camisa {camisa} · {posicao}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => navigate(`/alunos/${a.id}`)}
              >
                Ver
              </Button>
            </Card>
          );
        })}

        {alunos?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma</p>
        )}
      </div>
    </AppShell>
  );
}
