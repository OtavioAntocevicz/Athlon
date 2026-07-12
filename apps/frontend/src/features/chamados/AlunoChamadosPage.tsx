import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, MessageSquarePlus, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  criarChamadoSchema,
  type ChamadoResumo,
  type CriarChamadoInput,
  StatusChamado,
} from "@athlon/shared-types";
import { api, getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const statusLabel: Record<string, string> = {
  [StatusChamado.ABERTO]: "Aberto",
  [StatusChamado.RESPONDIDO]: "Respondido",
  [StatusChamado.FECHADO]: "Fechado",
};

const statusClass: Record<string, string> = {
  [StatusChamado.ABERTO]: "bg-accent/15 text-accent-strong ring-accent/30",
  [StatusChamado.RESPONDIDO]: "bg-success/10 text-success ring-success/20",
  [StatusChamado.FECHADO]: "bg-muted text-muted-foreground ring-primary/10",
};

export function AlunoChamadosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [novoAberto, setNovoAberto] = useState(false);
  const [erro, setErro] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["chamados"],
    queryFn: () => api<ChamadoResumo[]>("/chamados"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CriarChamadoInput>({
    resolver: zodResolver(criarChamadoSchema),
  });

  const criarMutation = useMutation({
    mutationFn: (body: CriarChamadoInput) =>
      api("/chamados", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setErro("");
      setNovoAberto(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
    },
    onError: (e) => setErro(getErrorMessage(e, "Erro ao abrir chamado")),
  });

  return (
    <AppShell>
      <PageEnter variant="fade">
        <button
          type="button"
          onClick={() => navigate("/perfil")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="flex items-start justify-between gap-3">
          <PageHeader
            title="Chamados"
            subtitle="Fale com o suporte da plataforma"
          />
          {!novoAberto && (
            <Button size="sm" className="shrink-0" onClick={() => setNovoAberto(true)}>
              <Plus className="h-4 w-4" /> Novo
            </Button>
          )}
        </div>

        {novoAberto && (
          <Card className="mb-4 space-y-3 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <MessageSquarePlus className="h-4 w-4" /> Novo chamado
            </p>
            <form
              onSubmit={handleSubmit((data) => criarMutation.mutate(data))}
              className="space-y-3"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium">Assunto</label>
                <Input placeholder="Ex: Problema no pagamento" {...register("assunto")} />
                {errors.assunto && (
                  <p className="mt-1 text-sm text-destructive">{errors.assunto.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Mensagem</label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-lg border border-primary/15 bg-white px-4 py-3 text-sm"
                  placeholder="Descreva o que aconteceu..."
                  {...register("mensagem")}
                />
                {errors.mensagem && (
                  <p className="mt-1 text-sm text-destructive">{errors.mensagem.message}</p>
                )}
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Enviar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setNovoAberto(false);
                    setErro("");
                    reset();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="space-y-2.5">
          {isLoading &&
            [1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}

          {!isLoading && (data?.length ?? 0) === 0 && !novoAberto && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Você ainda não abriu nenhum chamado.
            </Card>
          )}

          {data?.map((c) => (
            <Card
              key={c.id}
              className="flex cursor-pointer items-center gap-3 p-3 active:scale-[0.99]"
              onClick={() => navigate(`/chamados/${c.id}`)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-primary">{c.assunto}</p>
                <p className="text-xs text-muted-foreground">{formatDate(c.criadoEm)}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
                  statusClass[c.status] ?? statusClass.ABERTO,
                )}
              >
                {statusLabel[c.status] ?? c.status}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Card>
          ))}
        </div>
      </PageEnter>
    </AppShell>
  );
}
