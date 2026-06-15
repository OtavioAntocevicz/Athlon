import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPills } from "@/components/domain/FilterPills";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { getInitials } from "@/lib/format";
import type { StatusMensalidade } from "@athlon/shared-types";

interface AlunoItem {
  id: string;
  nome: string;
  turmaNome: string;
  turmas: { id: string; nome: string }[];
  telefone: string | null;
  statusFinanceiro: StatusMensalidade;
}

interface TurmaOption {
  id: string;
  nome: string;
}

export function AlunosPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [turmaId, setTurmaId] = useState("");

  const { data: turmas } = useQuery({
    queryKey: ["turmas"],
    queryFn: () => api<TurmaOption[]>("/turmas"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => api<AlunoItem[]>("/alunos"),
  });

  const filtrosTurma = useMemo(() => {
    const opts = [{ value: "", label: "Todas as turmas" }];
    turmas?.forEach((t) => opts.push({ value: t.id, label: t.nome }));
    return opts;
  }, [turmas]);

  const filtrados = useMemo(() => {
    if (!data) return [];
    const termo = busca.trim().toLowerCase();
    return data.filter((a) => {
      const matchTurma = !turmaId || a.turmas.some((t) => t.id === turmaId);
      const matchNome = !termo || a.nome.toLowerCase().includes(termo);
      return matchTurma && matchNome;
    });
  }, [data, busca, turmaId]);

  return (
    <AppShell>
      <PageHeader title="Alunos" subtitle="Lista de alunos e status financeiro" />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar pelo nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      <FilterPills options={filtrosTurma} value={turmaId} onChange={setTurmaId} />

      <div className="mt-4 space-y-3">
        {isLoading && [1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}

        {!isLoading && filtrados.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum aluno encontrado
          </p>
        )}

        {filtrados.map((aluno) => (
          <Card
            key={aluno.id}
            className="flex cursor-pointer items-center gap-3 active:scale-[0.99]"
            onClick={() => navigate(`/alunos/${aluno.id}`)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
              {getInitials(aluno.nome)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-primary">{aluno.nome}</p>
              <p className="truncate text-xs text-muted-foreground">{aluno.turmaNome}</p>
            </div>
            <StatusBadge status={aluno.statusFinanceiro} />
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
