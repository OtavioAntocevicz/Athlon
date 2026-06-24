import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { AlterarSenhaModal } from "@/features/perfil/AlterarSenhaModal";
import { KeyRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
      <h1 className="pt-2 text-2xl font-bold text-primary">Perfil</h1>
      <p className="text-sm text-muted-foreground">Administrador da plataforma</p>

      <div className="mt-8 rounded-xl border bg-card p-5">
        <p className="font-semibold text-primary">{user?.nome}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <div className="mt-6 space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => setSenhaModalOpen(true)}
        >
          <KeyRound className="mr-2 h-4 w-4" /> Alterar senha
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>

      <AlterarSenhaModal open={senhaModalOpen} onClose={() => setSenhaModalOpen(false)} />
    </AdminShell>
  );
}
