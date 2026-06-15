import { useState, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Calendar, MapPin, Copy, Check } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TurmaItem {
  id: string;
  nome: string;
  modalidade: string;
  totalAlunos: number;
  mensalidadeCentavos: number | null;
  horarioInicio: string | null;
  local: string | null;
  codigoConvite: string;
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

  return (
    <AppShell>
      <PageHeader
        title="Turmas Ativas"
        subtitle="Gerencie horários, alunos e mensalidades por grupo"
      />

      <Button size="lg" className="mb-6" onClick={() => navigate("/turmas/nova")}>
        <Plus className="h-5 w-5" /> Nova Turma
      </Button>

      <div className="space-y-4">
        {isLoading && [1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}

        {data?.map((turma) => (
          <Card
            key={turma.id}
            className="cursor-pointer active:scale-[0.99]"
            onClick={() => navigate(`/turmas/${turma.id}`)}
          >
            <p className="font-bold text-primary">{turma.nome}</p>
            <p className="text-xs text-muted-foreground mb-3">{turma.modalidade}</p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" /> {turma.totalAlunos} alunos
              </div>
              {turma.horarioInicio && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> {turma.horarioInicio}
                </div>
              )}
              {turma.local && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {turma.local}
                </div>
              )}
              {turma.mensalidadeCentavos && (
                <p className="font-semibold text-primary mt-2">
                  {formatCurrency(turma.mensalidadeCentavos)}/mês
                </p>
              )}
            </div>
            <div
              className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Código da turma</p>
                <p className="truncate text-sm font-semibold text-accent">
                  {turma.codigoConvite}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={(e) => copyCodigo(e, turma)}
              >
                {copiedId === turma.id ? (
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
        ))}
      </div>
    </AppShell>
  );
}
