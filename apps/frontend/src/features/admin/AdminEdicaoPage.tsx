import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Unlock,
  UserCog,
  Users,
  ChevronRight,
  Pencil,
  MessageSquare,
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageEnter } from "@/components/ui/page-enter";

const acoes = [
  {
    to: "/admin/chamados",
    icon: MessageSquare,
    title: "Chamados",
    desc: "Suporte aberto por alunos e treinadores",
  },
  {
    to: "/admin/edicao/matricular",
    icon: UserPlus,
    title: "Matricular aluno",
    desc: "Adicionar um aluno a uma turma",
  },
  {
    to: "/admin/edicao/remover",
    icon: UserMinus,
    title: "Remover da turma",
    desc: "Afastar aluno de uma turma",
  },
  {
    to: "/admin/edicao/trocar",
    icon: ArrowRightLeft,
    title: "Trocar de turma",
    desc: "Sair de uma e entrar em outra",
  },
  {
    to: "/admin/edicao/desbloquear",
    icon: Unlock,
    title: "Desbloquear inadimplência",
    desc: "Liberar aluno bloqueado na turma",
  },
  {
    to: "/admin/edicao/professores",
    icon: UserCog,
    title: "Ativar / desativar professor",
    desc: "Controlar acesso dos treinadores",
  },
  {
    to: "/admin/alunos?semTurma=true",
    icon: Users,
    title: "Alunos sem turma",
    desc: "Ver e matricular quem está sem grupo",
  },
] as const;

export function AdminEdicaoPage() {
  const navigate = useNavigate();

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <PageHeader
          title="Edição"
          subtitle="Ações administrativas na plataforma"
        />

        <div className="space-y-2.5">
          {acoes.map(({ to, icon: Icon, title, desc }) => (
            <Card
              key={to}
              className="flex cursor-pointer items-center gap-3 p-3 active:scale-[0.99]"
              onClick={() => navigate(to)}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Card>
          ))}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Pencil className="h-3.5 w-3.5" />
          Use com cuidado - as ações afetam turmas e acessos reais
        </p>
      </PageEnter>
    </AdminShell>
  );
}
