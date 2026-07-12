import { useState, useRef, type MouseEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Users, Copy, Check, ClipboardList, Pencil, X, MapPin, Clock, Plus, CalendarDays, Trash2, Camera, Wallet } from "lucide-react";
import {
  updateTurmaBasicoSchema,
  type UpdateTurmaBasicoInput,
  Modalidade,
  NivelTurma,
  TipoEvento,
  type StatusMensalidade,
} from "@athlon/shared-types";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime, getInitials } from "@/lib/format";
import { maskRg } from "@/lib/masks";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/domain/StatusDot";
import {
  eventoTipoStyles,
  fromDatetimeLocalValue,
  labelTipoEvento,
  toDatetimeLocalValue,
} from "@/components/domain/EventoTurma";

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
  fotoUrl: string | null;
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

interface EventoTurmaItem {
  id: string;
  tipo: string;
  titulo: string;
  adversario: string | null;
  descricao: string | null;
  local: string | null;
  inicio: string;
  passado: boolean;
}

interface EventoFormState {
  tipo: (typeof TipoEvento)[keyof typeof TipoEvento];
  adversario: string;
  local: string;
  inicio: string;
  descricao: string;
}

const EMPTY_EVENTO_FORM: EventoFormState = {
  tipo: TipoEvento.AMISTOSO,
  adversario: "",
  local: "",
  inicio: "",
  descricao: "",
};

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
  const [eventoFormOpen, setEventoFormOpen] = useState(false);
  const [eventoEditId, setEventoEditId] = useState<string | null>(null);
  const [eventoForm, setEventoForm] = useState<EventoFormState>(EMPTY_EVENTO_FORM);
  const [eventoError, setEventoError] = useState("");
  const [fotoError, setFotoError] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

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

  const { data: eventos } = useQuery({
    queryKey: ["turma", id, "eventos"],
    queryFn: () => api<EventoTurmaItem[]>(`/turmas/${id}/eventos`),
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

  const uploadFotoMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadingFoto(true);
      setFotoError("");
      const { uploadUrl, fotoUrl, token } = await api<{
        uploadUrl: string;
        fotoUrl: string;
        token: string;
      }>(`/turmas/${id}/foto/upload-url`, {
        method: "POST",
        body: JSON.stringify({ contentType: file.type || "image/jpeg" }),
      });

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "image/jpeg",
          Authorization: `Bearer ${token}`,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Falha ao enviar a foto. Tente novamente.");
      }

      return api<TurmaDetail>(`/turmas/${id}/foto`, {
        method: "PATCH",
        body: JSON.stringify({ fotoUrl }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turma", id] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
    },
    onError: (e: Error) => setFotoError(e.message),
    onSettled: () => setUploadingFoto(false),
  });

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFotoMutation.mutate(file);
    e.target.value = "";
  };

  const salvarEventoMutation = useMutation({
    mutationFn: (payload: EventoFormState) => {
      const body = {
        tipo: payload.tipo,
        adversario: payload.adversario.trim() || null,
        local: payload.local.trim() || null,
        inicio: fromDatetimeLocalValue(payload.inicio),
        descricao: payload.descricao.trim() || null,
      };

      if (eventoEditId) {
        return api<EventoTurmaItem>(`/turmas/${id}/eventos/${eventoEditId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }

      return api<EventoTurmaItem>(`/turmas/${id}/eventos`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      setEventoError("");
      setEventoFormOpen(false);
      setEventoEditId(null);
      setEventoForm(EMPTY_EVENTO_FORM);
      queryClient.invalidateQueries({ queryKey: ["turma", id, "eventos"] });
    },
    onError: (e: Error) => setEventoError(e.message),
  });

  const excluirEventoMutation = useMutation({
    mutationFn: (eventoId: string) =>
      api(`/turmas/${id}/eventos/${eventoId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turma", id, "eventos"] });
    },
    onError: (e: Error) => setEventoError(e.message),
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

  const abrirNovoEvento = () => {
    setEventoEditId(null);
    setEventoForm(EMPTY_EVENTO_FORM);
    setEventoError("");
    setEventoFormOpen(true);
  };

  const abrirEditarEvento = (evento: EventoTurmaItem) => {
    setEventoEditId(evento.id);
    setEventoForm({
      tipo: evento.tipo as EventoFormState["tipo"],
      adversario: evento.adversario ?? "",
      local: evento.local ?? "",
      inicio: toDatetimeLocalValue(evento.inicio),
      descricao: evento.descricao ?? "",
    });
    setEventoError("");
    setEventoFormOpen(true);
  };

  const cancelarEventoForm = () => {
    setEventoFormOpen(false);
    setEventoEditId(null);
    setEventoForm(EMPTY_EVENTO_FORM);
    setEventoError("");
  };

  const salvarEvento = () => {
    if (!eventoForm.inicio) {
      setEventoError("Informe data e horário do evento.");
      return;
    }
    setEventoError("");
    salvarEventoMutation.mutate(eventoForm);
  };

  const excluirEvento = (evento: EventoTurmaItem) => {
    const ok = window.confirm(`Excluir o evento "${evento.titulo}"?`);
    if (!ok) return;
    excluirEventoMutation.mutate(evento.id);
  };

  const eventosFuturos = eventos?.filter((e) => !e.passado) ?? [];
  const eventosPassados = eventos?.filter((e) => e.passado) ?? [];

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

      {/* Hero - identidade */}
      <div className="flex items-stretch gap-3.5">
        <div className="relative w-1/2 shrink-0">
          {turma.fotoUrl ? (
            <img
              src={turma.fotoUrl}
              alt={turma.nome}
              className="aspect-square w-full rounded-[10px] border-2 border-accent object-cover shadow-brand-card"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-[10px] border-2 border-accent bg-primary text-3xl font-bold text-white shadow-brand-card">
              {getInitials(turma.nome)}
            </div>
          )}
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFotoChange}
          />
          <button
            type="button"
            onClick={() => fotoInputRef.current?.click()}
            disabled={uploadingFoto}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-primary shadow-brand-card disabled:opacity-60"
            aria-label="Alterar foto da turma"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-0.5">
          <div>
            <h1 className="text-xl font-bold leading-tight text-primary">{turma.nome}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <div className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-accent/10 px-1.5 py-1">
                <p className="min-w-0 truncate text-[11px] font-semibold tracking-wide text-accent-strong">
                  {turma.codigoConvite}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-6 shrink-0 px-1.5"
                  onClick={copyCodigo}
                  aria-label={copiedCodigo ? "Copiado" : "Copiar código"}
                >
                  {copiedCodigo ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              {!editing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 px-2"
                  onClick={iniciarEdicao}
                  aria-label="Editar dados da turma"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {uploadingFoto && (
              <p className="mt-1 text-xs text-muted-foreground">Enviando foto...</p>
            )}
            {fotoError && <p className="mt-1 text-xs text-destructive">{fotoError}</p>}
          </div>

          {!editing && (
            <div className="flex flex-col gap-1.5">
              <span className="w-fit rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-primary">
                {turma.modalidade}
              </span>
              <span className="w-fit rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-primary">
                {turma.nivel}
              </span>
              <span className="inline-flex w-fit items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-primary">
                <Users className="h-3.5 w-3.5" />
                {alunos?.length ?? 0}{" "}
                {(alunos?.length ?? 0) === 1 ? "aluno" : "alunos"}
              </span>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <Card className="mt-5 space-y-4 p-4">
          <h2 className="font-semibold text-primary">Editar turma</h2>
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
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {(turma.local || turma.horarioInicio) && (
            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold text-primary">Treino</p>
              <div className="space-y-2.5">
                {turma.local && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-primary">{turma.local}</p>
                  </div>
                )}
                {turma.horarioInicio && (
                  <div className="flex items-start gap-2 text-sm">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-primary">
                      {turma.horarioInicio}
                      {turma.horarioFim ? ` - ${turma.horarioFim}` : ""}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <Wallet className="h-4 w-4" /> Financeiro
            </p>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Mensalidade</p>
                <p className="font-semibold text-primary">
                  {formatCurrency(turma.mensalidadeCentavos)}/mês
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p className="font-medium text-primary">Dia {turma.diaVencimento}</p>
              </div>
              <div className="border-t border-primary/5 pt-3">
                <p className="text-xs text-muted-foreground">Chave PIX</p>
                <p className="mt-0.5 break-all text-sm font-medium text-primary">{turma.chavePix}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-6 mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-primary">
          <CalendarDays className="h-5 w-5" /> Eventos
        </h2>
        {!eventoFormOpen && (
          <Button type="button" variant="secondary" size="sm" onClick={abrirNovoEvento}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        )}
      </div>

      {eventoFormOpen && (
        <Card className="mb-4 space-y-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-primary">
              {eventoEditId ? "Editar evento" : "Novo evento"}
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={cancelarEventoForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Tipo</label>
            <select
              className="flex h-12 w-full rounded-lg border border-primary/15 bg-white px-4 text-sm"
              value={eventoForm.tipo}
              onChange={(e) =>
                setEventoForm((f) => ({
                  ...f,
                  tipo: e.target.value as EventoFormState["tipo"],
                }))
              }
            >
              <option value={TipoEvento.AMISTOSO}>Amistoso</option>
              <option value={TipoEvento.CAMPEONATO}>Campeonato</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Adversário</label>
            <Input
              placeholder="Ex: Time do bairro"
              value={eventoForm.adversario}
              onChange={(e) => setEventoForm((f) => ({ ...f, adversario: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Data e horário</label>
            <Input
              type="datetime-local"
              value={eventoForm.inicio}
              onChange={(e) => setEventoForm((f) => ({ ...f, inicio: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Local</label>
            <Input
              placeholder="Ex: Ginásio Municipal"
              value={eventoForm.local}
              onChange={(e) => setEventoForm((f) => ({ ...f, local: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Descrição (opcional)</label>
            <textarea
              rows={3}
              placeholder="Detalhes extras para os alunos..."
              className="w-full rounded-lg border border-primary/15 px-3 py-2 text-sm"
              value={eventoForm.descricao}
              onChange={(e) => setEventoForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </div>

          {eventoError && <p className="text-sm text-destructive">{eventoError}</p>}

          <Button
            type="button"
            className="w-full"
            disabled={salvarEventoMutation.isPending}
            onClick={salvarEvento}
          >
            {salvarEventoMutation.isPending
              ? "Salvando..."
              : eventoEditId
                ? "Salvar alterações"
                : "Criar evento"}
          </Button>
        </Card>
      )}

      <div className="space-y-2">
        {eventosFuturos.map((evento) => {
          const styles = eventoTipoStyles(evento.tipo);
          const Icon = styles.Icon;
          return (
            <Card key={evento.id} className={`p-4 ${styles.cardClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className={`mt-0.5 rounded-lg bg-white p-2 ${styles.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.badgeClass}`}
                    >
                      {labelTipoEvento(evento.tipo)}
                    </span>
                    <p className="mt-1 font-semibold text-primary">{evento.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(evento.inicio)}
                    </p>
                    {evento.local && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {evento.local}
                      </p>
                    )}
                    {evento.descricao && (
                      <p className="mt-2 text-sm text-muted-foreground">{evento.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => abrirEditarEvento(evento)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => excluirEvento(evento)}
                    disabled={excluirEventoMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {!eventosFuturos.length && !eventoFormOpen && (
          <p className="text-sm text-muted-foreground">Nenhum evento futuro cadastrado</p>
        )}
      </div>

      {eventosPassados.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Eventos passados
          </p>
          <div className="space-y-2 opacity-70">
            {eventosPassados.map((evento) => {
              const styles = eventoTipoStyles(evento.tipo);
              const Icon = styles.Icon;
              return (
                <Card key={evento.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${styles.iconClass}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-primary">{evento.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(evento.inicio)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => excluirEvento(evento)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

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
          const camisa = a.numeroCamisa != null ? `#${a.numeroCamisa}` : "-";
          const posicao = a.posicao ?? "-";

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
