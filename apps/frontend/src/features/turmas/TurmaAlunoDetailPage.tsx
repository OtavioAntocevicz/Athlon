import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, Users, MapPin, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, getInitials } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  numeroCamisa: number | null;
  posicao: string | null;
  bloqueadoInadimplencia: boolean;
  alunos: Colega[];
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

      <h1 className="text-2xl font-bold text-primary">{turma.nome}</h1>
      <p className="text-sm text-muted-foreground">
        {turma.modalidade} · {turma.nivel}
      </p>

      <Card className="mt-4 space-y-3 p-4">
        {turma.horarioInicio && (
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Horário</p>
              <p className="text-sm font-medium">
                {turma.horarioInicio}
                {turma.horarioFim ? ` – ${turma.horarioFim}` : ""}
              </p>
            </div>
          </div>
        )}
        {turma.local && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Local</p>
              <p className="text-sm font-medium">{turma.local}</p>
            </div>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Mensalidade</p>
          <p className="text-sm font-medium">
            {formatCurrency(turma.mensalidadeCentavos)}/mês · venc. dia {turma.diaVencimento}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Código da turma</p>
            <p className="truncate text-sm font-semibold text-accent">{turma.codigoConvite}</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={copyCodigo}>
            {copied ? (
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
        {saveOk && <p className="text-sm text-green-600">Salvo com sucesso!</p>}
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-primary">
              {getInitials(a.nome)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">{a.nome}</p>
              <p className="text-xs text-muted-foreground">
                Camisa {a.numeroCamisa != null ? `#${a.numeroCamisa}` : "—"} ·{" "}
                {a.posicao ?? "—"}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
