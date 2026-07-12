import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  responderChamadoSchema,
  type ChamadoDetalhe,
  type ChamadoResumo,
  type ResponderChamadoInput,
  StatusChamado,
} from "@athlon/shared-types";
import { api, getErrorMessage } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { AdminShell } from "@/components/layout/AdminShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/domain/FilterPills";

const filtros = [
  { value: "", label: "Todos" },
  { value: "ABERTO", label: "Abertos" },
  { value: "RESPONDIDO", label: "Respondidos" },
  { value: "FECHADO", label: "Fechados" },
];

const statusLabel: Record<string, string> = {
  [StatusChamado.ABERTO]: "Aberto",
  [StatusChamado.RESPONDIDO]: "Respondido",
  [StatusChamado.FECHADO]: "Fechado",
};

export function AdminChamadosPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "chamados", status],
    queryFn: () => {
      const qs = status ? `?status=${status}` : "";
      return api<ChamadoResumo[]>(`/admin/chamados${qs}`);
    },
  });

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <PageHeader title="Chamados" subtitle="Suporte aberto por alunos e treinadores" />
        <FilterPills options={filtros} value={status} onChange={setStatus} />

        <div className="mt-4 space-y-2.5">
          {isLoading &&
            [1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}

          {!isLoading && (data?.length ?? 0) === 0 && (
            <Card className="flex flex-col items-center p-8 text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum chamado neste filtro.</p>
            </Card>
          )}

          {data?.map((c) => {
            const nome = c.autorNome ?? c.alunoNome ?? "Usuário";
            const tipo = c.autorTipo === "PROFESSOR" ? "Treinador" : "Aluno";
            return (
              <Card
                key={c.id}
                className="flex cursor-pointer items-center gap-3 p-3 active:scale-[0.99]"
                onClick={() => navigate(`/admin/chamados/${c.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-primary">{c.assunto}</p>
                  <p className="text-xs text-muted-foreground">
                    {tipo} · {nome} · {formatDate(c.criadoEm)}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {statusLabel[c.status] ?? c.status}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Card>
            );
          })}
        </div>
      </PageEnter>
    </AdminShell>
  );
}

export function AdminChamadoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [erro, setErro] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "chamados", id],
    queryFn: () => api<ChamadoDetalhe>(`/admin/chamados/${id}`),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResponderChamadoInput>({
    resolver: zodResolver(responderChamadoSchema),
    defaultValues: { status: StatusChamado.RESPONDIDO },
  });

  const mutation = useMutation({
    mutationFn: (body: ResponderChamadoInput) =>
      api(`/admin/chamados/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setErro("");
      queryClient.invalidateQueries({ queryKey: ["admin", "chamados"] });
    },
    onError: (e) => setErro(getErrorMessage(e, "Erro ao responder")),
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
        <p className="pt-8 text-sm text-destructive">Chamado não encontrado</p>
        <Button className="mt-4" onClick={() => navigate("/admin/chamados")}>
          Voltar
        </Button>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <button
          type="button"
          onClick={() => navigate("/admin/chamados")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <h1 className="text-xl font-bold text-primary">{data.assunto}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.autorTipo === "PROFESSOR" ? "Treinador" : "Aluno"} ·{" "}
          {data.autorNome || data.alunoNome} · {formatDateTime(data.criadoEm)} ·{" "}
          {statusLabel[data.status] ?? data.status}
        </p>
        {data.alunoId && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => navigate(`/admin/alunos/${data.alunoId}`)}
          >
            Ver perfil do aluno
          </Button>
        )}
        {data.professorId && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => navigate(`/admin/professores/${data.professorId}`)}
          >
            Ver perfil do treinador
          </Button>
        )}

        <Card className="mt-4 space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mensagem
          </p>
          <p className="whitespace-pre-wrap text-sm text-primary">{data.mensagem}</p>
        </Card>

        {data.respostaAdmin && (
          <Card className="mt-3 space-y-2 border-accent/30 bg-accent/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
              Resposta atual
            </p>
            <p className="whitespace-pre-wrap text-sm text-primary">{data.respostaAdmin}</p>
          </Card>
        )}

        <Card className="mt-4 space-y-3 p-4">
          <p className="text-sm font-semibold text-primary">Responder</p>
          <form
            onSubmit={handleSubmit((body) => mutation.mutate(body))}
            className="space-y-3"
          >
            <textarea
              className="flex min-h-[100px] w-full rounded-lg border border-primary/15 bg-white px-4 py-3 text-sm"
              placeholder="Escreva a resposta ao aluno..."
              {...register("respostaAdmin")}
            />
            {errors.respostaAdmin && (
              <p className="text-sm text-destructive">{errors.respostaAdmin.message}</p>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Status</label>
              <select
                className="flex h-12 w-full rounded-lg border border-primary/15 bg-white px-4 text-sm"
                {...register("status")}
              >
                <option value={StatusChamado.RESPONDIDO}>Respondido</option>
                <option value={StatusChamado.FECHADO}>Fechado</option>
                <option value={StatusChamado.ABERTO}>Aberto</option>
              </select>
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Enviar resposta"}
            </Button>
          </form>
        </Card>
      </PageEnter>
    </AdminShell>
  );
}
