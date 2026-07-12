import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlterarSenhaModal } from "@/features/perfil/AlterarSenhaModal";
import { KeyRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageEnter } from "@/components/ui/page-enter";
import { getInitials } from "@/lib/format";

export function AdminPerfilPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [senhaModalOpen, setSenhaModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login/professor");
  };

  return (
    <AdminShell>
      <PageEnter variant="fade">
        <h1 className="pt-2 text-2xl font-bold text-primary">Perfil</h1>
        <p className="text-sm text-muted-foreground">Administrador da plataforma</p>

        <Card className="mt-6 flex items-center gap-3.5 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white shadow-brand-card">
            {getInitials(user?.nome ?? "A")}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-primary">{user?.nome}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </Card>

        <div className="mt-6 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setSenhaModalOpen(true)}
          >
            <KeyRound className="h-4 w-4" /> Alterar senha
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>

        <AlterarSenhaModal open={senhaModalOpen} onClose={() => setSenhaModalOpen(false)} />
      </PageEnter>
    </AdminShell>
  );
}
