import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Check } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import type {
  AdminAlunoDetalhe,
  AdminAlunoListaItem,
  AdminTurmaListaItem,
} from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AdminEdicaoTrocarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [buscaAluno, setBuscaAluno] = useState("");
  const [buscaTurma, setBuscaTurma] = useState("");
  const [alunoId, setAlunoId] = useState(searchParams.get("alunoId") ?? "");
  const [origemId, setOrigemId] = useState(searchParams.get("turmaId") ?? "");
  const [destinoId, setDestinoId] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  const { data: alunos } = useQuery({
    queryKey: ["admin", "alunos", buscaAluno],
    queryFn: () => {
      const qs = buscaAluno.trim() ? `?busca=${encodeURIComponent(buscaAluno.trim())}` : "";
      return api<AdminAlunoListaItem[]>(`/admin/alunos${qs}`);
    },
  });

  const { data: detalhe } = useQuery({
    queryKey: ["admin", "aluno", alunoId],
    queryFn: () => api<AdminAlunoDetalhe>(`/admin/alunos/${alunoId}`),
    enabled: !!alunoId,
  });

  const { data: turmas } = useQuery({
    queryKey: ["admin", "turmas", buscaTurma],
    queryFn: () => {
      const qs = buscaTurma.trim() ? `?busca=${encodeURIComponent(buscaTurma.trim())}` : "";
      return api<AdminTurmaListaItem[]>(`/admin/turmas${qs}`);
    },
  });

  const alunoSel = useMemo(
    () => alunos?.find((a) => a.id === alunoId) ?? null,
    [alunos, alunoId],
  );
  const origemSel = detalhe?.turmas.find((t) => t.id === origemId) ?? null;
  const destinoSel = turmas?.find((t) => t.id === destinoId) ?? null;

  const mutation = useMutation({
    mutationFn: () =>
      api(`/admin/alunos/${alunoId}/trocar-turma`, {
        method: "POST",
        body: JSON.stringify({ turmaOrigemId: origemId, turmaDestinoId: destinoId }),
      }),
    onSuccess: () => {
      setOk(true);
      setErro("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => {
      setOk(false);
      setErro(getErrorMessage(e, "Erro ao trocar turma"));
    },
  });

  const confirmar = () => {
    if (!origemSel || !destinoSel) return;
    if (
      !window.confirm(
        `Trocar ${alunoSel?.nome ?? "aluno"} de "${origemSel.nome}" para "${destinoSel.nome}"?`,
      )
    ) {
      return;
    }
    mutation.mutate();
  };

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <button
          type="button"
          onClick={() => navigate("/admin/edicao")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageHeader title="Trocar de turma" subtitle="Remove da origem e matricula no destino" />

        <section className="space-y-2">
          <p className="text-sm font-semibold text-primary">1. Aluno</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar aluno..."
              value={buscaAluno}
              onChange={(e) => setBuscaAluno(e.target.value)}
            />
          </div>
          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {(alunos ?? [])
              .filter((a) => !a.semTurma)
              .slice(0, 20)
              .map((a) => (
                <Card
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 p-2.5",
                    alunoId === a.id && "ring-2 ring-accent",
                  )}
                  onClick={() => {
                    setAlunoId(a.id);
                    setOrigemId("");
                    setDestinoId("");
                    setOk(false);
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                    {getInitials(a.nome)}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{a.nome}</p>
                  {alunoId === a.id && <Check className="h-4 w-4 text-accent-strong" />}
                </Card>
              ))}
          </div>
        </section>

        {alunoId && (
          <section className="mt-5 space-y-2">
            <p className="text-sm font-semibold text-primary">2. Turma de origem</p>
            <div className="space-y-1.5">
              {detalhe?.turmas.map((t) => (
                <Card
                  key={t.id}
                  className={cn(
                    "cursor-pointer p-2.5",
                    origemId === t.id && "ring-2 ring-accent",
                  )}
                  onClick={() => setOrigemId(t.id)}
                >
                  <p className="text-sm font-medium text-primary">{t.nome}</p>
                  <p className="text-[11px] text-muted-foreground">{t.professorNome}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {origemId && (
          <section className="mt-5 space-y-2">
            <p className="text-sm font-semibold text-primary">3. Turma de destino</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar turma..."
                value={buscaTurma}
                onChange={(e) => setBuscaTurma(e.target.value)}
              />
            </div>
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {(turmas ?? [])
                .filter((t) => t.id !== origemId)
                .slice(0, 20)
                .map((t) => (
                  <Card
                    key={t.id}
                    className={cn(
                      "cursor-pointer p-2.5",
                      destinoId === t.id && "ring-2 ring-accent",
                    )}
                    onClick={() => setDestinoId(t.id)}
                  >
                    <p className="text-sm font-medium text-primary">{t.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{t.professorNome}</p>
                  </Card>
                ))}
            </div>
          </section>
        )}

        {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
        {ok && <p className="mt-3 text-sm text-success">Troca realizada com sucesso.</p>}

        <Button
          className="mt-4 w-full"
          size="lg"
          disabled={!alunoId || !origemId || !destinoId || mutation.isPending}
          onClick={confirmar}
        >
          {mutation.isPending ? "Trocando..." : "Confirmar troca"}
        </Button>
      </PageEnter>
    </AdminShell>
  );
}
