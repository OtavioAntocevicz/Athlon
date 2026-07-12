import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Wallet,
  AlertTriangle,
  GraduationCap,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAlunoBloqueado } from "@/lib/use-aluno-bloqueado";
import { formatCurrency, formatDate, formatDateTime, formatMes } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { MetricCard } from "@/components/domain/MetricCard";
import { Button } from "@/components/ui/button";
import type { StatusMensalidade } from "@athlon/shared-types";
import { PageEnter } from "@/components/ui/page-enter";
import { eventoTipoStyles, labelTipoEvento } from "@/components/domain/EventoTurma";

interface DashboardAluno {
  situacaoFinanceira: {
    pagamentoId: string | null;
    mesReferencia: string | null;
    turmaNome: string | null;
    status: StatusMensalidade;
    valorCentavos: number;
    vencimento: string | null;
    chavePix: string | null;
    totalAtrasadas: number;
    totalEmAberto: number;
  };
  turmas: {
    id: string;
    nome: string;
    modalidade: string;
    horarioInicio: string | null;
    local: string | null;
  }[];
  proximoEvento: {
    id: string;
    turmaId: string;
    turmaNome: string;
    tipo: string;
    titulo: string;
    adversario: string | null;
    local: string | null;
    inicio: string;
  } | null;
  bloqueiosInadimplencia: { turmaId: string; turmaNome: string }[];
}

const STATUS_MSG: Partial<Record<StatusMensalidade, string>> = {
  PENDENTE: "Aguardando pagamento até o vencimento.",
  ATRASADO: "Pagamento em atraso. Regularize o quanto antes.",
  EM_ANALISE: "Comprovante enviado - aguardando aprovação do treinador.",
  RECUSADO: "Comprovante recusado. Envie um novo comprovante.",
  PAGO: "Mensalidade quitada neste período.",
};

export function DashboardAlunoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { bloqueado, bloqueios } = useAlunoBloqueado();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "aluno"],
    queryFn: () => api<DashboardAluno>("/dashboard/aluno"),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-3 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  const fin = data!.situacaoFinanceira;
  const proximoEvento = data!.proximoEvento;
  const precisaPagar = fin.status !== "PAGO" && fin.status !== "EM_ANALISE";
  const turmasBloqueadas =
    bloqueios.length > 0
      ? bloqueios
      : data!.bloqueiosInadimplencia.map((b) => ({
          turmaId: b.turmaId,
          turmaNome: b.turmaNome,
        }));

  const copyPix = () => {
    if (fin.chavePix) {
      navigator.clipboard.writeText(fin.chavePix);
    }
  };

  return (
    <AppShell>
      <PageEnter variant="fade">
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-primary">
            Olá, {user?.nome?.split(" ")[0]}!
          </h1>
          <p className="text-sm text-muted-foreground">Sua situação hoje</p>
        </div>

        {bloqueado && (
          <Card className="mt-4 border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">
              Conta bloqueada por inadimplência
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Seu acesso está limitado. Regularize as mensalidades em atraso e peça o
              desbloqueio ao professor.
            </p>
            {turmasBloqueadas.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                {turmasBloqueadas.map((b) => (
                  <li key={b.turmaId}>{b.turmaNome}</li>
                ))}
              </ul>
            )}
            <Button className="mt-3 w-full" onClick={() => navigate("/mensalidades")}>
              Ir para mensalidades
            </Button>
          </Card>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <MetricCard
            title="Em aberto"
            value={String(fin.totalEmAberto)}
            icon={Wallet}
            accent={fin.totalEmAberto > 0 ? "warning" : "default"}
          />
          <MetricCard
            title="Atrasadas"
            value={String(fin.totalAtrasadas)}
            icon={AlertTriangle}
            accent={fin.totalAtrasadas > 0 ? "danger" : "default"}
          />
          <MetricCard
            title="Turmas"
            value={String(data!.turmas.length)}
            icon={GraduationCap}
          />
          <MetricCard
            title="Próx. venc."
            value={fin.vencimento && precisaPagar ? formatDate(fin.vencimento) : "-"}
            icon={Calendar}
            compact
          />
        </div>

        {precisaPagar && (
          <Card
            className="mt-5 cursor-pointer bg-primary p-4 text-white transition-transform active:scale-[0.99]"
            onClick={() =>
              navigate(fin.pagamentoId ? `/mensalidades/${fin.pagamentoId}` : "/mensalidades")
            }
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Wallet className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {fin.status === "RECUSADO" ? "Reenviar comprovante" : "Pagar mensalidade"}
                </p>
                <p className="text-sm text-white/70">
                  {formatCurrency(fin.valorCentavos)}
                  {fin.turmaNome ? ` · ${fin.turmaNome}` : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
            </div>
          </Card>
        )}

        <Card className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-primary">Situação financeira</p>
            <StatusBadge status={fin.status} />
          </div>

          {fin.mesReferencia && (
            <p className="text-sm font-medium text-primary">
              {formatMes(fin.mesReferencia)}
              {fin.turmaNome ? ` · ${fin.turmaNome}` : ""}
            </p>
          )}

          <p className="mt-2 text-2xl font-bold">{formatCurrency(fin.valorCentavos)}</p>

          {fin.vencimento && precisaPagar && (
            <p className="mt-1 text-sm text-muted-foreground">
              Vencimento: {formatDate(fin.vencimento)}
            </p>
          )}

          {STATUS_MSG[fin.status] && (
            <p className="mt-2 text-sm text-muted-foreground">{STATUS_MSG[fin.status]}</p>
          )}

          {fin.chavePix && precisaPagar && (
            <Button variant="secondary" className="mt-4 w-full" onClick={copyPix}>
              Copiar PIX
            </Button>
          )}

          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={() => navigate("/mensalidades")}
          >
            Ver mensalidades
          </Button>
        </Card>

        {!bloqueado && proximoEvento && (() => {
          const styles = eventoTipoStyles(proximoEvento.tipo);
          const Icon = styles.Icon;
          return (
            <Card
              className={`mt-4 cursor-pointer p-4 active:scale-[0.99] ${styles.cardClass}`}
              onClick={() => navigate(`/minhas-turmas/${proximoEvento.turmaId}`)}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold text-primary">Próximo evento</p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.badgeClass}`}
                >
                  <Icon className="h-3 w-3" />
                  {labelTipoEvento(proximoEvento.tipo)}
                </span>
              </div>
              <p className="font-medium text-primary">{proximoEvento.titulo}</p>
              <p className="text-sm text-muted-foreground">{proximoEvento.turmaNome}</p>
              <p className="mt-2 text-sm font-medium">{formatDateTime(proximoEvento.inicio)}</p>
              {proximoEvento.local && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {proximoEvento.local}
                </p>
              )}
            </Card>
          );
        })()}

        {!bloqueado && data!.turmas.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 text-lg font-bold text-primary">Minhas Turmas</h2>
            <div className="space-y-3">
              {data!.turmas.map((t) => (
                <Card
                  key={t.id}
                  className="flex cursor-pointer items-center gap-3 p-3 active:scale-[0.99]"
                  onClick={() => navigate(`/minhas-turmas/${t.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">{t.modalidade}</p>
                    {t.horarioInicio && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.horarioInicio}
                        {t.local ? ` - ${t.local}` : ""}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Card>
              ))}
            </div>
          </>
        )}
      </PageEnter>
    </AppShell>
  );
}
