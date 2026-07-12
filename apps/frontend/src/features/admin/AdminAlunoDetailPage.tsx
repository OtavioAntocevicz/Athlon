import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Unlock,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AdminAlunoDetalhe } from "@athlon/shared-types";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { PageEnter } from "@/components/ui/page-enter";
import { formatCurrency, formatDate, formatMes, getInitials } from "@/lib/format";
import { maskCpf, maskRg, maskWhatsApp } from "@/lib/masks";
import type { StatusMensalidade } from "@athlon/shared-types";

function DadoAluno({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-primary">{value}</p>
    </div>
  );
}

export function AdminAlunoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "aluno", id],
    queryFn: () => api<AdminAlunoDetalhe>(`/admin/alunos/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AdminShell>
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
      </AdminShell>
    );
  }

  if (error || !data) {
    return (
      <AdminShell>
        <p className="pt-8 text-sm text-destructive">Aluno não encontrado</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </AdminShell>
    );
  }

  const nomeCompleto = [data.nome, data.sobrenome].filter(Boolean).join(" ");
  const telefoneFmt = data.telefone ? maskWhatsApp(data.telefone) : null;
  const rgFmt = data.rg ? maskRg(data.rg) : null;
  const cpfFmt = data.cpf ? maskCpf(data.cpf) : null;
  const temBloqueio = data.turmas.some((t) => t.bloqueadoInadimplencia);
  const semTurma = data.turmas.length === 0;

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="flex items-start gap-3.5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-brand-card">
            {getInitials(nomeCompleto)}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-xl font-bold leading-tight text-primary">{nomeCompleto}</h1>
            {data.email && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{data.email}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/admin/edicao/matricular?alunoId=${data.id}`)}
          >
            <UserPlus className="h-4 w-4" /> Matricular
          </Button>
          {!semTurma && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/admin/edicao/remover?alunoId=${data.id}`)}
              >
                <UserMinus className="h-4 w-4" /> Remover
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/admin/edicao/trocar?alunoId=${data.id}`)}
              >
                <ArrowRightLeft className="h-4 w-4" /> Trocar
              </Button>
            </>
          )}
          {temBloqueio && (
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/edicao/desbloquear")}>
              <Unlock className="h-4 w-4" /> Desbloquear
            </Button>
          )}
        </div>

        <Card className="mt-5 space-y-4 p-4">
          <h2 className="font-semibold text-primary">Dados do aluno</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <DadoAluno label="Nome" value={data.nome} />
            <DadoAluno label="Sobrenome" value={data.sobrenome || null} />
            <DadoAluno label="E-mail" value={data.email} />
            <DadoAluno label="WhatsApp" value={telefoneFmt} />
            <DadoAluno label="RG" value={rgFmt} />
            <DadoAluno label="CPF" value={cpfFmt} />
            <DadoAluno
              label="Conta criada em"
              value={
                data.contaCriadaEm
                  ? formatDate(data.contaCriadaEm)
                  : "Sem conta de login"
              }
            />
            {!data.contaCriadaEm && (
              <DadoAluno label="Cadastro em" value={formatDate(data.criadoEm)} />
            )}
          </div>
        </Card>

        <h2 className="mb-3 mt-6 flex items-center gap-2 font-bold text-primary">
          <GraduationCap className="h-5 w-5" /> Turmas ({data.turmas.length})
        </h2>
        <div className="mb-6 space-y-2.5">
          {data.turmas.length === 0 ? (
            <Card className="space-y-3 p-4 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma turma</p>
              <Button
                size="sm"
                onClick={() => navigate(`/admin/edicao/matricular?alunoId=${data.id}`)}
              >
                <UserPlus className="h-4 w-4" /> Matricular agora
              </Button>
            </Card>
          ) : (
            data.turmas.map((t) => (
              <Card
                key={t.id}
                className="flex cursor-pointer items-center gap-3 p-3 active:scale-[0.99]"
                onClick={() => navigate(`/admin/turmas/${t.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-primary">{t.nome}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.professorNome}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Entrou em {formatDate(t.matriculadoEm)} · Camisa{" "}
                    {t.numeroCamisa != null ? `#${t.numeroCamisa}` : "-"} · Posição{" "}
                    {t.posicao ?? "-"}
                    {t.bloqueadoInadimplencia ? " · Bloqueado" : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Card>
            ))
          )}
        </div>

        <h2 className="mb-3 font-bold text-primary">Mensalidades</h2>
        {data.mensalidades.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma mensalidade no período</p>
        ) : (
          <div className="space-y-2.5">
            {data.mensalidades.map((m) => (
              <Card key={m.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium text-primary">{formatMes(m.mesReferencia)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(m.valorCentavos)}
                  </p>
                  {m.vencimento && (
                    <p className="text-xs text-muted-foreground">
                      Venc.: {formatDate(m.vencimento)}
                    </p>
                  )}
                </div>
                <StatusBadge status={m.status as StatusMensalidade} />
              </Card>
            ))}
          </div>
        )}
      </PageEnter>
    </AdminShell>
  );
}
