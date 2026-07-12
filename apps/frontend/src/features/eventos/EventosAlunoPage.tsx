import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin } from "lucide-react";
import type { EventoResumo } from "@athlon/shared-types";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useAlunoBloqueado } from "@/lib/use-aluno-bloqueado";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPills } from "@/components/domain/FilterPills";
import { eventoTipoStyles, labelTipoEvento } from "@/components/domain/EventoTurma";
import { Card } from "@/components/ui/card";
import { PageEnter } from "@/components/ui/page-enter";
import { cn } from "@/lib/cn";

const filters = [
  { value: "todos", label: "Todos" },
  { value: "proximos", label: "Próximos" },
  { value: "passados", label: "Passados" },
];

export function EventosAlunoPage() {
  const navigate = useNavigate();
  const { bloqueado } = useAlunoBloqueado();
  const [filtro, setFiltro] = useState("proximos");

  const { data, isLoading } = useQuery({
    queryKey: ["eventos", "aluno"],
    queryFn: () => api<EventoResumo[]>("/eventos"),
  });

  const filtrados = useMemo(() => {
    if (!data) return [];
    if (filtro === "proximos") return data.filter((e) => !e.passado);
    if (filtro === "passados") return data.filter((e) => e.passado);
    return data;
  }, [data, filtro]);

  return (
    <AppShell>
      <PageEnter variant="fade">
        <PageHeader
          title="Eventos"
          subtitle="Amistosos e campeonatos das suas turmas"
        />

        <FilterPills options={filters} value={filtro} onChange={setFiltro} />

        <div className="mt-4 space-y-3">
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
              ))}
            </>
          )}

          {!isLoading && filtrados.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {filtro === "todos"
                ? "Nenhum evento nas suas turmas ainda."
                : filtro === "proximos"
                  ? "Nenhum evento próximo"
                  : "Nenhum evento passado"}
            </p>
          )}

          {filtrados.map((evento) => {
            const styles = eventoTipoStyles(evento.tipo);
            const Icon = styles.Icon;
            return (
              <Card
                key={evento.id}
                className={cn(
                  "border-primary/20 bg-card p-4 transition-transform",
                  !bloqueado && "cursor-pointer active:scale-[0.99]",
                  evento.passado && "opacity-70",
                )}
                onClick={() => {
                  if (!bloqueado) navigate(`/minhas-turmas/${evento.turmaId}`);
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted",
                      styles.iconClass,
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          styles.badgeClass,
                        )}
                      >
                        {labelTipoEvento(evento.tipo)}
                      </span>
                      {!bloqueado && (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <p className="mt-1 font-semibold text-primary">{evento.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(evento.inicio)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{evento.turmaNome}</p>
                    {evento.local && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {evento.local}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </PageEnter>
    </AppShell>
  );
}
