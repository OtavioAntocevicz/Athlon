import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut, Pencil, X, KeyRound, Settings, MessageSquare } from "lucide-react";
import { AlterarSenhaModal } from "./AlterarSenhaModal";
import {
  updateProfessorPerfilSchema,
  updateAlunoPerfilSchema,
  type UpdateProfessorPerfilInput,
  type UpdateAlunoPerfilInput,
  type AuthUser,
} from "@athlon/shared-types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/format";
import { maskCpf, maskRg, maskWhatsApp } from "@/lib/masks";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";

export function PerfilPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [senhaModalOpen, setSenhaModalOpen] = useState(false);
  const [saveError, setSaveError] = useState("");

  const { data: me, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<AuthUser>("/auth/me"),
  });

  const isProfessor = user?.perfil === "PROFESSOR" || !!user?.professorId;
  const isAluno = user?.perfil === "ALUNO";

  const profForm = useForm<UpdateProfessorPerfilInput>({
    resolver: zodResolver(updateProfessorPerfilSchema),
    values: me ? { nome: me.nome, chavePix: me.chavePix ?? "" } : undefined,
  });

  const alunoForm = useForm<UpdateAlunoPerfilInput>({
    resolver: zodResolver(updateAlunoPerfilSchema),
    values: me?.aluno
      ? {
          nome: me.aluno.nome,
          sobrenome: me.aluno.sobrenome,
          email: me.email,
          whatsapp: me.aluno.telefone ? maskWhatsApp(me.aluno.telefone) : "",
          rg: me.aluno.rg ? maskRg(me.aluno.rg) : "",
          cpf: me.aluno.cpf ? maskCpf(me.aluno.cpf) : "",
        }
      : undefined,
  });

  const salvarMutation = useMutation({
    mutationFn: (data: UpdateProfessorPerfilInput | UpdateAlunoPerfilInput) =>
      api<AuthUser>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: async () => {
      setSaveError("");
      setEditing(false);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const iniciarEdicao = () => {
    setSaveError("");
    setEditing(true);
  };

  const cancelarEdicao = () => {
    setSaveError("");
    setEditing(false);
    if (isProfessor) profForm.reset();
    else alunoForm.reset();
  };

  if (isLoading || !me) {
    return (
      <AppShell>
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Perfil" subtitle="Suas informações de conta" />

      <Card className="flex flex-col items-center py-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
          {getInitials(me.nome)}
        </div>
        <p className="mt-4 text-xl font-bold text-primary">{me.nome}</p>
        <p className="text-sm text-muted-foreground">{me.email}</p>
        <p className="mt-2 rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {isProfessor ? "Treinador" : "Aluno"}
        </p>
      </Card>

      <Card className="mt-4 space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-primary">Dados da conta</h2>
          {!editing && (
            <Button type="button" variant="outline" size="sm" onClick={iniciarEdicao}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        {editing && isProfessor ? (
          <form
            onSubmit={profForm.handleSubmit((data) => salvarMutation.mutate(data))}
            className="space-y-3"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nome</label>
              <Input {...profForm.register("nome")} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Chave PIX</label>
              <Input {...profForm.register("chavePix")} />
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={salvarMutation.isPending}>
                {salvarMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={cancelarEdicao}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </div>
          </form>
        ) : editing && !isProfessor ? (
          <form
            onSubmit={alunoForm.handleSubmit((data) => salvarMutation.mutate(data))}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nome</label>
                <Input {...alunoForm.register("nome")} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Sobrenome</label>
                <Input {...alunoForm.register("sobrenome")} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">E-mail</label>
              <Input type="email" {...alunoForm.register("email")} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">WhatsApp</label>
              <Controller
                name="whatsapp"
                control={alunoForm.control}
                render={({ field }) => (
                  <MaskedInput mask={maskWhatsApp} {...field} />
                )}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">RG</label>
              <Controller
                name="rg"
                control={alunoForm.control}
                render={({ field }) => <MaskedInput mask={maskRg} {...field} />}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">CPF (opcional)</label>
              <Controller
                name="cpf"
                control={alunoForm.control}
                render={({ field }) => <MaskedInput mask={maskCpf} {...field} />}
              />
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={salvarMutation.isPending}>
                {salvarMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={cancelarEdicao}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {isProfessor ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{me.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chave PIX</p>
                  <p className="font-medium">{me.chavePix ?? "-"}</p>
                </div>
              </>
            ) : me.aluno ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Nome completo</p>
                  <p className="font-medium">
                    {[me.aluno.nome, me.aluno.sobrenome].filter(Boolean).join(" ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">
                    {me.aluno.telefone ? maskWhatsApp(me.aluno.telefone) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">RG</p>
                  <p className="font-medium">{me.aluno.rg ? maskRg(me.aluno.rg) : "-"}</p>
                </div>
                {me.aluno.cpf && (
                  <div>
                    <p className="text-xs text-muted-foreground">CPF</p>
                    <p className="font-medium">{maskCpf(me.aluno.cpf)}</p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </Card>

      {isProfessor && (
        <Link to="/gerir-turmas" className="mt-4 block">
          <Button type="button" variant="outline" size="lg" className="w-full">
            <Settings className="h-4 w-4" /> Gerir turmas
          </Button>
        </Link>
      )}

      {(isAluno || isProfessor) && (
        <Link to="/chamados" className="mt-4 block">
          <Button type="button" variant="outline" size="lg" className="w-full">
            <MessageSquare className="h-4 w-4" /> Chamado (suporte)
          </Button>
        </Link>
      )}

      <Button
        variant="outline"
        size="lg"
        className="mt-4 w-full"
        onClick={() => setSenhaModalOpen(true)}
      >
        <KeyRound className="h-4 w-4" /> Alterar senha
      </Button>

      <AlterarSenhaModal open={senhaModalOpen} onClose={() => setSenhaModalOpen(false)} />

      <Button variant="destructive" size="lg" className="mt-4" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> Sair da conta
      </Button>
    </AppShell>
  );
}
