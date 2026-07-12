import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Check } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import type { AdminAlunoListaItem, AdminTurmaListaItem } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AdminEdicaoMatricularPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preAlunoId = searchParams.get("alunoId") ?? "";

  const [buscaAluno, setBuscaAluno] = useState("");
  const [buscaTurma, setBuscaTurma] = useState("");
  const [alunoId, setAlunoId] = useState(preAlunoId);
  const [turmaId, setTurmaId] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (preAlunoId) setAlunoId(preAlunoId);
  }, [preAlunoId]);

  const { data: alunos } = useQuery({
    queryKey: ["admin", "alunos", buscaAluno, searchParams.get("semTurma")],
    queryFn: () => {
      const params = new URLSearchParams();
      if (buscaAluno.trim()) params.set("busca", buscaAluno.trim());
      if (searchParams.get("semTurma") === "true") params.set("semTurma", "true");
      const qs = params.toString();
      return api<AdminAlunoListaItem[]>(`/admin/alunos${qs ? `?${qs}` : ""}`);
    },
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
  const turmaSel = useMemo(
    () => turmas?.find((t) => t.id === turmaId) ?? null,
    [turmas, turmaId],
  );

  const mutation = useMutation({
    mutationFn: () =>
      api(`/admin/alunos/${alunoId}/matricular`, {
        method: "POST",
        body: JSON.stringify({ turmaId }),
      }),
    onSuccess: () => {
      setOk(true);
      setErro("");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => {
      setOk(false);
      setErro(getErrorMessage(e, "Erro ao matricular"));
    },
  });

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

        <PageHeader title="Matricular aluno" subtitle="Escolha o aluno e a turma de destino" />

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
            {(alunos ?? []).slice(0, 20).map((a) => (
              <Card
                key={a.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 p-2.5",
                  alunoId === a.id && "ring-2 ring-accent",
                )}
                onClick={() => setAlunoId(a.id)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  {getInitials(a.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">{a.nome}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {a.semTurma ? "Sem turma" : a.turmas.map((t) => t.nome).join(", ")}
                  </p>
                </div>
                {alunoId === a.id && <Check className="h-4 w-4 text-accent-strong" />}
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-2">
          <p className="text-sm font-semibold text-primary">2. Turma</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar turma ou professor..."
              value={buscaTurma}
              onChange={(e) => setBuscaTurma(e.target.value)}
            />
          </div>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {(turmas ?? []).slice(0, 20).map((t) => (
              <Card
                key={t.id}
                className={cn(
                  "cursor-pointer p-2.5",
                  turmaId === t.id && "ring-2 ring-accent",
                )}
                onClick={() => setTurmaId(t.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">{t.nome}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {t.professorNome} · {t.totalAlunos} aluno(s)
                    </p>
                  </div>
                  {turmaId === t.id && <Check className="h-4 w-4 shrink-0 text-accent-strong" />}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {alunoSel && turmaSel && (
          <Card className="mt-6 space-y-1 p-3 text-sm">
            <p className="text-muted-foreground">Confirmar</p>
            <p className="font-medium text-primary">
              {alunoSel.nome} → {turmaSel.nome}
            </p>
          </Card>
        )}

        {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
        {ok && <p className="mt-3 text-sm text-success">Aluno matriculado com sucesso.</p>}

        <Button
          className="mt-4 w-full"
          size="lg"
          disabled={!alunoId || !turmaId || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Matriculando..." : "Matricular"}
        </Button>
      </PageEnter>
    </AdminShell>
  );
}
