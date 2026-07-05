import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAlunoBloqueado } from "@/lib/use-aluno-bloqueado";
import { formatCurrency, formatDate, formatDateTime, formatMes } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Button } from "@/components/ui/button";
import type { StatusMensalidade } from "@athlon/shared-types";
import { PageEnter } from "@/components/ui/page-enter";
import { eventoTipoStyles, labelTipoEvento } from "@/components/domain/EventoTurma";
import { MapPin } from "lucide-react";

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
  const { bloqueado } = useAlunoBloqueado();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "aluno"],
    queryFn: () => api<DashboardAluno>("/dashboard/aluno"),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
      </AppShell>
    );
  }

  const fin = data!.situacaoFinanceira;
  const proximoEvento = data!.proximoEvento;
  const precisaPagar = fin.status !== "PAGO" && fin.status !== "EM_ANALISE";

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
          Olá, {user?.nome?.split(" ")[0]}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">Sua situação hoje</p>
      </div>

      {bloqueado && (
        <Card className="mt-4 border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">Conta bloqueada por inadimplência</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu acesso está limitado. Você pode apenas visualizar e pagar suas mensalidades em
            atraso. Após regularizar, solicite o desbloqueio ao professor.
          </p>
          <Button className="mt-3 w-full" onClick={() => navigate("/mensalidades")}>
            Ir para mensalidades
          </Button>
        </Card>
      )}

      <Card className="mt-6">
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

        {fin.totalAtrasadas > 0 && (
          <p className="mt-2 text-sm font-medium text-destructive">
            {fin.totalAtrasadas === 1
              ? "1 mensalidade em atraso"
              : `${fin.totalAtrasadas} mensalidades em atraso`}
            {fin.totalEmAberto > fin.totalAtrasadas &&
              ` · ${fin.totalEmAberto - fin.totalAtrasadas} pendente(s) no prazo`}
          </p>
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
                className="cursor-pointer active:scale-[0.99]"
                onClick={() => navigate(`/minhas-turmas/${t.id}`)}
              >
                <p className="font-semibold text-primary">{t.nome}</p>
                <p className="text-xs text-muted-foreground">{t.modalidade}</p>
                {t.horarioInicio && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.horarioInicio} - {t.local}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
      </PageEnter>
    </AppShell>
  );
}
