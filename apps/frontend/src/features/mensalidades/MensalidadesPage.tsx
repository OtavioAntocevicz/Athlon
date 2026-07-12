import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronRight, FileCheck, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAlunoBloqueado } from "@/lib/use-aluno-bloqueado";
import { formatMes } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPills } from "@/components/domain/FilterPills";
import { MensalidadeCard } from "@/components/domain/MensalidadeCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageEnter } from "@/components/ui/page-enter";
import type { DashboardProfessor, MensalidadeResumo, StatusMensalidade } from "@athlon/shared-types";

const filters = [
  { value: "", label: "Todos" },
  { value: "PENDENTE", label: "Pendentes" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "PAGO", label: "Pagos" },
  { value: "ATRASADO", label: "Atrasados" },
];

export function MensalidadesPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();
  const isProfessor = user?.perfil === "PROFESSOR";
  const { bloqueado, bloqueios } = useAlunoBloqueado();

  const { data: dash } = useQuery({
    queryKey: ["dashboard", "professor"],
    queryFn: () => api<DashboardProfessor>("/dashboard/professor"),
    enabled: isProfessor,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["mensalidades", status],
    queryFn: () => {
      const params = status ? `?status=${status}` : "";
      return api<MensalidadeResumo[]>(`/mensalidades${params}`);
    },
  });

  const filtradas = useMemo(() => {
    if (!data) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return data;
    return data.filter((m) => {
      if (isProfessor) {
        return m.alunoNome.toLowerCase().includes(termo);
      }
      const mes = formatMes(m.mesReferencia).toLowerCase();
      const turma = (m.turmaNome ?? "").toLowerCase();
      return mes.includes(termo) || turma.includes(termo);
    });
  }, [data, busca, isProfessor]);

  return (
    <AppShell>
      <PageEnter variant="fade">
        <PageHeader
          title="Mensalidades"
          subtitle={
            isProfessor
              ? "Gestão de mensalidades e status financeiros"
              : "Suas mensalidades e pagamentos"
          }
        />

        {!isProfessor && bloqueado && (
          <Card className="mb-4 border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">Acesso limitado por inadimplência</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Regularize as mensalidades em atraso abaixo.
            </p>
            {bloqueios.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                {bloqueios.map((b) => (
                  <li key={b.turmaId}>{b.turmaNome}</li>
                ))}
              </ul>
            )}
            <Button
              size="sm"
              className="mt-3"
              variant="outline"
              onClick={() => setStatus("ATRASADO")}
            >
              Ver atrasadas
            </Button>
          </Card>
        )}

        {isProfessor && (
          <Card
            className="mb-5 cursor-pointer bg-primary p-4 text-white transition-transform active:scale-[0.99]"
            onClick={() => navigate("/comprovantes")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <FileCheck className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Aprovar comprovantes</p>
                <p className="text-sm text-white/70">
                  {dash?.comprovantesAguardando ?? 0} pendente
                  {(dash?.comprovantesAguardando ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
            </div>
          </Card>
        )}

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={isProfessor ? "Buscar aluno pelo nome..." : "Buscar por mês ou turma..."}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>

        <FilterPills options={filters} value={status} onChange={setStatus} />

        <div className="mt-4 space-y-3">
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
              ))}
            </>
          )}

          {!isLoading && filtradas.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma mensalidade encontrada
            </p>
          )}

          {filtradas.map((m) => (
            <MensalidadeCard
              key={m.id}
              alunoNome={m.alunoNome}
              turmaNome={m.turmaNome}
              mesReferencia={m.mesReferencia}
              valorCentavos={m.valorCentavos}
              status={m.status as StatusMensalidade}
              comprovanteEmAnalise={m.comprovanteEmAnalise}
              comprovantePreviewUrl={m.comprovantePreviewUrl}
              visaoAluno={!isProfessor}
              onClick={() => navigate(`/mensalidades/${m.id}`)}
            />
          ))}
        </div>
      </PageEnter>
    </AppShell>
  );
}
