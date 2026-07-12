import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Check } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import type { AdminAlunoDetalhe, AdminAlunoListaItem } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AdminEdicaoRemoverPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [buscaAluno, setBuscaAluno] = useState("");
  const [alunoId, setAlunoId] = useState(searchParams.get("alunoId") ?? "");
  const [turmaId, setTurmaId] = useState(searchParams.get("turmaId") ?? "");
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

  const alunoSel = useMemo(
    () => alunos?.find((a) => a.id === alunoId) ?? null,
    [alunos, alunoId],
  );
  const turmaSel = detalhe?.turmas.find((t) => t.id === turmaId) ?? null;

  const mutation = useMutation({
    mutationFn: () =>
      api(`/admin/alunos/${alunoId}/afastar`, {
        method: "POST",
        body: JSON.stringify({ turmaId }),
      }),
    onSuccess: () => {
      setOk(true);
      setErro("");
      setTurmaId("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => {
      setOk(false);
      setErro(getErrorMessage(e, "Erro ao remover"));
    },
  });

  const confirmar = () => {
    if (!turmaSel) return;
    if (!window.confirm(`Remover ${alunoSel?.nome ?? "aluno"} da turma "${turmaSel.nome}"?`)) {
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

        <PageHeader title="Remover da turma" subtitle="Afastar aluno de uma matrícula ativa" />

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
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
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
                    setTurmaId("");
                    setOk(false);
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                    {getInitials(a.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">{a.nome}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {a.turmas.map((t) => t.nome).join(", ")}
                    </p>
                  </div>
                  {alunoId === a.id && <Check className="h-4 w-4 text-accent-strong" />}
                </Card>
              ))}
          </div>
        </section>

        {alunoId && (
          <section className="mt-6 space-y-2">
            <p className="text-sm font-semibold text-primary">2. Turma a remover</p>
            {(detalhe?.turmas.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Aluno sem turmas ativas.</p>
            ) : (
              <div className="space-y-1.5">
                {detalhe?.turmas.map((t) => (
                  <Card
                    key={t.id}
                    className={cn(
                      "cursor-pointer p-2.5",
                      turmaId === t.id && "ring-2 ring-accent",
                    )}
                    onClick={() => setTurmaId(t.id)}
                  >
                    <p className="text-sm font-medium text-primary">{t.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{t.professorNome}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
        {ok && <p className="mt-3 text-sm text-success">Aluno removido da turma.</p>}

        <Button
          className="mt-4 w-full"
          size="lg"
          variant="outline"
          disabled={!alunoId || !turmaId || mutation.isPending}
          onClick={confirmar}
        >
          {mutation.isPending ? "Removendo..." : "Remover da turma"}
        </Button>
      </PageEnter>
    </AdminShell>
  );
}
