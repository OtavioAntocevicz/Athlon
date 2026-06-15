import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, FileCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPills } from "@/components/domain/FilterPills";
import { MensalidadeCard } from "@/components/domain/MensalidadeCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    return data.filter((m) => m.alunoNome.toLowerCase().includes(termo));
  }, [data, busca]);

  return (
    <AppShell>
      <PageHeader
        title="Mensalidades"
        subtitle={
          isProfessor
            ? "Gestão de mensalidades e status financeiros"
            : "Suas mensalidades e pagamentos"
        }
      />

      {isProfessor && (
        <Card
          className="mb-4 cursor-pointer bg-primary p-4 text-white active:scale-[0.99]"
          onClick={() => navigate("/comprovantes")}
        >
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-accent" />
            <div>
              <p className="font-semibold">Aprovar comprovantes</p>
              <p className="text-sm text-white/70">
                {dash?.comprovantesAguardando ?? 0} pendente(s)
              </p>
            </div>
          </div>
        </Card>
      )}

      {isProfessor && (
        <div className="mb-4 border-b border-primary/10" aria-hidden />
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
            {busca.trim()
              ? "Nenhuma mensalidade encontrada"
              : "Nenhuma mensalidade encontrada"}
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
            onClick={() => navigate(`/mensalidades/${m.id}`)}
          />
        ))}
      </div>
    </AppShell>
  );
}
