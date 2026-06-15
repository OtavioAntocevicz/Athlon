import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserMinus, Unlock } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatMes } from "@/lib/format";
import { maskCpf, maskRg, maskWhatsApp } from "@/lib/masks";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/domain/StatusBadge";
import type { StatusMensalidade } from "@athlon/shared-types";

interface AlunoDetail {
  id: string;
  nome: string;
  sobrenome: string;
  telefone: string | null;
  email: string | null;
  rg: string | null;
  cpf: string | null;
  turmas: {
    id: string;
    nome: string;
    numeroCamisa: number | null;
    posicao: string | null;
    bloqueadoInadimplencia: boolean;
  }[];
  mensalidades: {
    id: string;
    mesReferencia: string;
    valorCentavos: number;
    status: StatusMensalidade;
    vencimento: string | null;
  }[];
}

function DadoAluno({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-primary">{value}</p>
    </div>
  );
}

export function AlunoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["aluno", id],
    queryFn: () => api<AlunoDetail>(`/alunos/${id}`),
    enabled: !!id,
  });

  const desbloquearMutation = useMutation({
    mutationFn: (turmaId: string) =>
      api(`/alunos/${id}/desbloquear-inadimplencia`, {
        method: "POST",
        body: JSON.stringify({ turmaId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aluno", id] });
    },
  });

  const afastarMutation = useMutation({
    mutationFn: (turmaId: string) =>
      api(`/alunos/${id}/afastar-turma`, {
        method: "POST",
        body: JSON.stringify({ turmaId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aluno", id] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
    },
  });

  const confirmarAfastar = (turmaId: string, turmaNome: string) => {
    if (
      window.confirm(
        `Remover o aluno da turma "${turmaNome}"? Ele deixará de aparecer nesta turma.`,
      )
    ) {
      afastarMutation.mutate(turmaId);
    }
  };

  if (isLoading || !data) {
    return (
      <AppShell>
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
      </AppShell>
    );
  }

  const nomeCompleto = [data.nome, data.sobrenome].filter(Boolean).join(" ");
  const telefoneFmt = data.telefone ? maskWhatsApp(data.telefone) : null;
  const rgFmt = data.rg ? maskRg(data.rg) : null;
  const cpfFmt = data.cpf ? maskCpf(data.cpf) : null;

  return (
    <AppShell>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="text-2xl font-bold text-primary">{nomeCompleto}</h1>

      <Card className="mt-6 space-y-4 p-4">
        <h2 className="font-semibold text-primary">Dados do aluno</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <DadoAluno label="Nome" value={data.nome} />
          <DadoAluno label="Sobrenome" value={data.sobrenome || null} />
          <DadoAluno label="E-mail" value={data.email} />
          <DadoAluno label="WhatsApp" value={telefoneFmt} />
          <DadoAluno label="RG" value={rgFmt} />
          <DadoAluno label="CPF" value={cpfFmt} />
        </div>
      </Card>

      <h2 className="mb-3 mt-6 font-bold text-primary">Turmas</h2>
      <div className="mb-6 space-y-2">
        {data.turmas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma turma</p>
        ) : (
          data.turmas.map((t) => (
            <Card key={t.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-primary">{t.nome}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Camisa {t.numeroCamisa != null ? `#${t.numeroCamisa}` : "—"} · Posição{" "}
                    {t.posicao ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {t.bloqueadoInadimplencia && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-amber-700 border-amber-300"
                      disabled={desbloquearMutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Retirar inadimplência de ${nomeCompleto} na turma "${t.nome}"?`,
                          )
                        ) {
                          desbloquearMutation.mutate(t.id);
                        }
                      }}
                    >
                      <Unlock className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30"
                    disabled={afastarMutation.isPending}
                    onClick={() => confirmarAfastar(t.id, t.nome)}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <h2 className="mb-3 font-bold text-primary">Mensalidades</h2>
      {data.mensalidades.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma mensalidade no período</p>
      ) : (
        <div className="space-y-2">
          {data.mensalidades.map((m) => (
            <Card
              key={m.id}
              className="flex cursor-pointer items-center justify-between p-3 active:scale-[0.99]"
              onClick={() => navigate(`/mensalidades/${m.id}`)}
            >
              <div>
                <p className="text-sm font-medium">{formatMes(m.mesReferencia)}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(m.valorCentavos)}</p>
                {m.vencimento && (
                  <p className="text-xs text-muted-foreground">
                    Venc.: {formatDate(m.vencimento)}
                  </p>
                )}
              </div>
              <StatusBadge status={m.status} />
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
