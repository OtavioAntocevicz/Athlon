import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Megaphone, Clock, CheckCircle2, Plus } from "lucide-react";
import { criarAvisoSchema, type CriarAvisoInput } from "@athlon/shared-types";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TurmaItem {
  id: string;
  nome: string;
}

interface AvisoHistorico {
  id: string;
  titulo: string;
  descricao: string;
  turmaNome: string;
  agendadoPara: string | null;
  enviadoEm: string | null;
  criadoEm: string;
  status: "ENVIADO" | "AGENDADO";
}

export function AvisosProfessorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formAberto, setFormAberto] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [agendar, setAgendar] = useState(false);
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [horaAgendamento, setHoraAgendamento] = useState("");

  const { data: turmas } = useQuery({
    queryKey: ["turmas"],
    queryFn: () => api<TurmaItem[]>("/turmas"),
  });

  const { data: historico, isLoading } = useQuery({
    queryKey: ["avisos"],
    queryFn: () => api<AvisoHistorico[]>("/avisos"),
  });

  const form = useForm<CriarAvisoInput>({
    resolver: zodResolver(criarAvisoSchema),
    defaultValues: { titulo: "", descricao: "", turmaId: "" },
  });

  const fecharForm = () => {
    setFormAberto(false);
    form.reset({ titulo: "", descricao: "", turmaId: "" });
    setAgendar(false);
    setDataAgendamento("");
    setHoraAgendamento("");
    setMensagem("");
  };

  const enviar = useMutation({
    mutationFn: (payload: CriarAvisoInput) =>
      api("/avisos", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos"] });
      fecharForm();
    },
    onError: (e: Error) => setMensagem(e.message),
  });

  const onSubmit = form.handleSubmit((values) => {
    setMensagem("");
    let agendadoPara: string | null = null;

    if (agendar) {
      if (!dataAgendamento || !horaAgendamento) {
        setMensagem("Informe data e horário para agendar o aviso.");
        return;
      }
      agendadoPara = new Date(`${dataAgendamento}T${horaAgendamento}`).toISOString();
    }

    enviar.mutate({
      titulo: values.titulo,
      descricao: values.descricao,
      turmaId: values.turmaId,
      agendadoPara,
    });
  });

  if (formAberto) {
    return (
      <AppShell>
        <button
          type="button"
          onClick={fecharForm}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <PageHeader
          title="Novo aviso"
          subtitle="Comunique seus alunos por turma"
        />

        <Card className="space-y-4 p-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Título do aviso</label>
              <Input {...form.register("titulo")} placeholder="Ex.: Treino cancelado amanhã" />
              {form.formState.errors.titulo && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.titulo.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Descrição do aviso</label>
              <textarea
                {...form.register("descricao")}
                rows={4}
                placeholder="Escreva a mensagem que os alunos receberão..."
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              {form.formState.errors.descricao && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.descricao.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Turma que vai receber</label>
              <select
                {...form.register("turmaId")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Selecione uma turma</option>
                {turmas?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
              {form.formState.errors.turmaId && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.turmaId.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={agendar}
                onChange={(e) => setAgendar(e.target.checked)}
                className="rounded"
              />
              Agendar aviso para envio posterior
            </label>

            {agendar && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">Data</label>
                  <Input
                    type="date"
                    value={dataAgendamento}
                    onChange={(e) => setDataAgendamento(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">Horário</label>
                  <Input
                    type="time"
                    value={horaAgendamento}
                    onChange={(e) => setHoraAgendamento(e.target.value)}
                  />
                </div>
              </div>
            )}

            {mensagem && (
              <p className="text-center text-sm text-destructive">{mensagem}</p>
            )}

            <Button type="submit" size="lg" disabled={enviar.isPending}>
              <Megaphone className="h-4 w-4" />
              {enviar.isPending
                ? "Enviando..."
                : agendar
                  ? "Agendar aviso"
                  : "Confirmar e enviar"}
            </Button>
          </form>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <PageHeader
        title="Avisos"
        subtitle="Comunique seus alunos por turma"
      />

      <Button size="lg" className="mb-6" onClick={() => setFormAberto(true)}>
        <Plus className="h-5 w-5" /> Novo aviso
      </Button>

      <h2 className="mb-3 text-lg font-bold text-primary">Histórico de avisos</h2>

      <div className="space-y-3">
        {isLoading && (
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        )}

        {!isLoading && !historico?.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum aviso enviado ainda
          </p>
        )}

        {historico?.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-primary">{a.titulo}</p>
                <p className="text-xs text-muted-foreground">{a.turmaNome}</p>
              </div>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  a.status === "ENVIADO"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {a.status === "ENVIADO" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {a.status === "ENVIADO" ? "Enviado" : "Agendado"}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.descricao}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {a.enviadoEm
                ? `Enviado em ${formatDate(a.enviadoEm)}`
                : a.agendadoPara
                  ? `Agendado para ${formatDate(a.agendadoPara)}`
                  : `Criado em ${formatDate(a.criadoEm)}`}
            </p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
