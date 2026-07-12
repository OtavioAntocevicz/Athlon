import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, Users, MapPin, Clock, CalendarDays } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime, getInitials } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageEnter } from "@/components/ui/page-enter";
import { eventoTipoStyles, labelTipoEvento } from "@/components/domain/EventoTurma";

interface Colega {
  nome: string;
  numeroCamisa: number | null;
  posicao: string | null;
}

interface TurmaAlunoDetail {
  id: string;
  nome: string;
  modalidade: string;
  nivel: string;
  local: string | null;
  horarioInicio: string | null;
  horarioFim: string | null;
  mensalidadeCentavos: number;
  codigoConvite: string;
  diaVencimento: number;
  fotoUrl?: string | null;
  numeroCamisa: number | null;
  posicao: string | null;
  bloqueadoInadimplencia: boolean;
  alunos: Colega[];
}

interface EventoTurmaItem {
  id: string;
  tipo: string;
  titulo: string;
  adversario: string | null;
  descricao: string | null;
  local: string | null;
  inicio: string;
}

export function TurmaAlunoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [camisa, setCamisa] = useState("");
  const [posicao, setPosicao] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  const { data: turma, isLoading } = useQuery({
    queryKey: ["minha-turma", id],
    queryFn: () => api<TurmaAlunoDetail>(`/alunos/minhas-turmas/${id}`),
    enabled: !!id,
  });

  const { data: eventos } = useQuery({
    queryKey: ["minha-turma", id, "eventos"],
    queryFn: () => api<EventoTurmaItem[]>(`/alunos/minhas-turmas/${id}/eventos`),
    enabled: !!id,
  });

  const salvarMutation = useMutation({
    mutationFn: () =>
      api(`/alunos/minhas-turmas/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          numeroCamisa: camisa.trim() ? parseInt(camisa, 10) : null,
          posicao: posicao.trim() || null,
        }),
      }),
    onSuccess: () => {
      setSaveError("");
      setSaveOk(true);
      queryClient.invalidateQueries({ queryKey: ["minha-turma", id] });
      queryClient.invalidateQueries({ queryKey: ["minhas-turmas"] });
      setTimeout(() => setSaveOk(false), 2000);
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  useEffect(() => {
    if (!turma) return;
    setCamisa(turma.numeroCamisa != null ? String(turma.numeroCamisa) : "");
    setPosicao(turma.posicao ?? "");
  }, [turma]);

  if (isLoading || !turma) {
    return (
      <AppShell>
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
      </AppShell>
    );
  }

  const copyCodigo = async () => {
    await navigator.clipboard.writeText(turma.codigoConvite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell>
      <PageEnter variant="fade">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {turma.bloqueadoInadimplencia && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">Acesso restrito por inadimplência</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Regularize sua mensalidade da turma <strong>{turma.nome}</strong> e solicite seu
            desbloqueio ao professor.
          </p>
        </Card>
      )}

      <div className="flex items-stretch gap-3.5">
        <div className="w-1/2 shrink-0">
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
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-0.5">
          <div>
            <h1 className="text-xl font-bold leading-tight text-primary">{turma.nome}</h1>
            <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md bg-accent/10 px-1.5 py-1">
              <p className="min-w-0 truncate text-[11px] font-semibold tracking-wide text-accent-strong">
                {turma.codigoConvite}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-6 shrink-0 px-1.5"
                onClick={copyCodigo}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="w-fit rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-primary">
              {turma.modalidade}
            </span>
            <span className="w-fit rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-primary">
              {turma.nivel}
            </span>
          </div>
        </div>
      </div>

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
          <p className="mb-2 text-sm font-semibold text-primary">Mensalidade</p>
          <p className="text-sm font-medium text-primary">
            {formatCurrency(turma.mensalidadeCentavos)}/mês · venc. dia {turma.diaVencimento}
          </p>
        </Card>
      </div>

      {eventos && eventos.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 flex items-center gap-2 font-bold text-primary">
            <CalendarDays className="h-5 w-5" /> Próximos eventos
          </h2>
          <div className="space-y-2">
            {eventos.map((evento) => {
              const styles = eventoTipoStyles(evento.tipo);
              const Icon = styles.Icon;
              return (
                <Card key={evento.id} className={`p-4 ${styles.cardClass}`}>
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg bg-white p-2 ${styles.iconClass}`}>
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
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Card className="mt-4 space-y-3 p-4">
        <h2 className="font-semibold text-primary">Minha camisa e posição</h2>
        <p className="text-xs text-muted-foreground">
          Cada turma tem sua própria camisa e posição
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nº camisa</label>
            <Input
              type="number"
              min={1}
              max={99}
              placeholder="Ex: 10"
              value={camisa}
              onChange={(e) => setCamisa(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Posição</label>
            <Input
              placeholder="Ex: Levantador"
              value={posicao}
              onChange={(e) => setPosicao(e.target.value)}
            />
          </div>
        </div>
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        {saveOk && <p className="text-sm text-success">Salvo com sucesso!</p>}
        <Button
          className="w-full"
          disabled={salvarMutation.isPending}
          onClick={() => salvarMutation.mutate()}
        >
          {salvarMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </Card>

      <h2 className="mb-3 mt-6 flex items-center gap-2 font-bold text-primary">
        <Users className="h-5 w-5" /> Colegas ({turma.alunos.length})
      </h2>
      <div className="space-y-2">
        {turma.alunos.map((a, i) => (
          <Card key={`${a.nome}-${i}`} className="flex items-center gap-3 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {getInitials(a.nome)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">{a.nome}</p>
              <p className="text-xs text-muted-foreground">
                Camisa {a.numeroCamisa != null ? `#${a.numeroCamisa}` : "-"} ·{" "}
                {a.posicao ?? "-"}
              </p>
            </div>
          </Card>
        ))}
      </div>
      </PageEnter>
    </AppShell>
  );
}
