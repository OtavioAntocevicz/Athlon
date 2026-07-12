import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Plus, ChevronRight, GraduationCap } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, getInitials } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageEnter } from "@/components/ui/page-enter";
import { EntrarTurmaModal } from "./EntrarTurmaModal";

interface TurmaResumo {
  id: string;
  nome: string;
  modalidade: string;
  local: string | null;
  horarioInicio: string | null;
  horarioFim: string | null;
  mensalidadeCentavos: number;
  fotoUrl?: string | null;
  numeroCamisa: number | null;
  posicao: string | null;
}

export function TurmasAlunoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [entrarOpen, setEntrarOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["minhas-turmas"],
    queryFn: () => api<TurmaResumo[]>("/alunos/minhas-turmas"),
  });

  const vazia = !isLoading && (data?.length ?? 0) === 0;

  return (
    <AppShell>
      <PageEnter variant="fade">
        <PageHeader title="Minhas turmas" subtitle="Turmas em que você está matriculado" />

        <Button className="mb-4 w-full" onClick={() => setEntrarOpen(true)}>
          <Plus className="h-4 w-4" /> Entrar com código da turma
        </Button>

        <EntrarTurmaModal
          open={entrarOpen}
          onClose={() => setEntrarOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["minhas-turmas"] })}
        />

        {isLoading &&
          [1, 2].map((i) => (
            <div
              key={i}
              className="mb-3 flex items-center gap-3.5 rounded-xl border border-primary/5 bg-card p-2 shadow-brand-card"
            >
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-[8px] bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}

        {vazia && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[8px] border-2 border-accent bg-primary text-white">
              <GraduationCap className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold text-primary">Nenhuma turma ainda</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Peça o código de convite ao seu treinador e entre na turma.
            </p>
            <Button className="mt-6" onClick={() => setEntrarOpen(true)}>
              <Plus className="h-4 w-4" /> Entrar com código
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {data?.map((t) => (
            <Card
              key={t.id}
              className="flex cursor-pointer items-center gap-3.5 p-2 active:scale-[0.99]"
              onClick={() => navigate(`/minhas-turmas/${t.id}`)}
            >
              {t.fotoUrl ? (
                <img
                  src={t.fotoUrl}
                  alt={t.nome}
                  className="h-20 w-20 shrink-0 rounded-[8px] border-2 border-accent object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[8px] border-2 border-accent bg-primary text-lg font-bold text-white">
                  {getInitials(t.nome)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-primary">{t.nome}</p>
                <p className="text-xs text-muted-foreground">{t.modalidade}</p>
                {t.horarioInicio && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {t.horarioInicio}
                    {t.horarioFim ? ` - ${t.horarioFim}` : ""}
                  </p>
                )}
                {t.local && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {t.local}
                  </p>
                )}
                <p className="mt-1.5 text-sm font-medium text-primary">
                  {formatCurrency(t.mensalidadeCentavos)}/mês
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Card>
          ))}
        </div>
      </PageEnter>
    </AppShell>
  );
}
