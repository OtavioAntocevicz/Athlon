import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/format";
import { NotificacoesPanel } from "./NotificacoesPanel";
import { ProfessorAvisosButton } from "./ProfessorAvisosButton";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between px-4 py-3">
      <Logo size="sm" />
      <div className="flex items-center gap-3">
        <ProfessorAvisosButton />
        <NotificacoesPanel />
        <Link
          to="/perfil"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
        >
          {user ? getInitials(user.nome) : "?"}
        </Link>
      </div>
    </header>
  );
}
