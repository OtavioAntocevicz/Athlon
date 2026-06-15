import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EntrarTurmaModal } from "./EntrarTurmaModal";

interface TurmaResumo {
  id: string;
  nome: string;
  modalidade: string;
  local: string | null;
  horarioInicio: string | null;
  horarioFim: string | null;
  mensalidadeCentavos: number;
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

  return (
    <AppShell>
      <PageHeader title="Minhas turmas" subtitle="Turmas em que você está matriculado" />

      <Button className="mb-4 w-full" onClick={() => setEntrarOpen(true)}>
        <Plus className="h-4 w-4" /> Entrar com código da turma
      </Button>

      <EntrarTurmaModal
        open={entrarOpen}
        onClose={() => setEntrarOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["minhas-turmas"] })}
      />

      {isLoading && <div className="h-32 animate-pulse rounded-xl bg-muted" />}

      <div className="space-y-3">
        {data?.map((t) => (
          <Card
            key={t.id}
            className="cursor-pointer p-4 active:scale-[0.99]"
            onClick={() => navigate(`/minhas-turmas/${t.id}`)}
          >
            <p className="font-semibold text-primary">{t.nome}</p>
            <p className="text-xs text-muted-foreground">{t.modalidade}</p>
            {t.horarioInicio && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t.horarioInicio}
                {t.horarioFim ? ` – ${t.horarioFim}` : ""}
              </p>
            )}
            {t.local && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {t.local}
              </p>
            )}
            <p className="mt-2 text-sm font-medium">{formatCurrency(t.mensalidadeCentavos)}/mês</p>
            {(t.numeroCamisa != null || t.posicao) && (
              <p className="mt-1 text-xs text-accent">
                Camisa {t.numeroCamisa != null ? `#${t.numeroCamisa}` : "—"} ·{" "}
                {t.posicao ?? "—"}
              </p>
            )}
          </Card>
        ))}

        {!isLoading && data?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Você ainda não está em nenhuma turma
          </p>
        )}
      </div>
    </AppShell>
  );
}
