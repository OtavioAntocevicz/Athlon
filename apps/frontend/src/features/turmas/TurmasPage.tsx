import { useState, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Copy, Check, Users, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageEnter } from "@/components/ui/page-enter";

interface TurmaItem {
  id: string;
  nome: string;
  codigoConvite: string;
  fotoUrl: string | null;
  totalAlunos: number;
}

export function TurmasPage() {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCodigo = async (e: MouseEvent, turma: TurmaItem) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(turma.codigoConvite);
    setCopiedId(turma.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["turmas"],
    queryFn: () => api<TurmaItem[]>("/turmas"),
  });

  const vazia = !isLoading && (data?.length ?? 0) === 0;

  return (
    <AppShell>
      <PageEnter variant="fade">
        <PageHeader
          title="Turmas ativas"
          subtitle="Gerencie horários, alunos e mensalidades por grupo"
        />

        <Button size="lg" className="mb-6" onClick={() => navigate("/turmas/nova")}>
          <Plus className="h-5 w-5" /> Nova Turma
        </Button>

        <div className="space-y-3">
          {isLoading &&
            [1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 rounded-xl border border-primary/5 bg-card p-2 shadow-brand-card"
              >
                <div className="h-24 w-24 shrink-0 animate-pulse rounded-[8px] bg-muted" />
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
                  </div>
                </div>
              </div>
            ))}

          {vazia && (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[8px] border-2 border-accent bg-primary text-white">
                <Users className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-primary">Nenhuma turma ainda</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Crie sua primeira turma para começar a gerenciar alunos e mensalidades.
              </p>
              <Button size="lg" className="mt-6" onClick={() => navigate("/turmas/nova")}>
                <Plus className="h-5 w-5" /> Nova Turma
              </Button>
            </div>
          )}

          {data?.map((turma) => (
            <Card
              key={turma.id}
              className="cursor-pointer border-primary/5 p-2 transition-all hover:border-accent/40 hover:shadow-brand-card-hover active:scale-[0.99]"
              onClick={() => navigate(`/turmas/${turma.id}`)}
            >
              <div className="flex items-center gap-3.5">
                {turma.fotoUrl ? (
                  <img
                    src={turma.fotoUrl}
                    alt={turma.nome}
                    className="h-24 w-24 shrink-0 rounded-[8px] border-2 border-accent object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[8px] border-2 border-accent bg-primary text-xl font-bold text-white">
                    {getInitials(turma.nome)}
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
                  <div className="flex items-center gap-1">
                    <p className="min-w-0 flex-1 truncate text-left text-xl font-bold leading-tight text-primary">
                      {turma.nome}
                    </p>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                  <div
                    className="flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-medium text-primary">{turma.totalAlunos}</span>
                      <span>{turma.totalAlunos === 1 ? "aluno" : "alunos"}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1 rounded-md bg-accent/10 px-1.5 py-1">
                      <p className="max-w-[5.5rem] truncate text-[11px] font-semibold tracking-wide text-accent-strong">
                        {turma.codigoConvite}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-6 shrink-0 px-1.5"
                        onClick={(e) => copyCodigo(e, turma)}
                        aria-label={copiedId === turma.id ? "Copiado" : "Copiar código"}
                      >
                        {copiedId === turma.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </PageEnter>
    </AppShell>
  );
}
