import { NavLink } from "react-router-dom";
import { Home, Wallet, Users, GraduationCap, UserCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { useAlunoBloqueado } from "@/lib/use-aluno-bloqueado";

const professorNav = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/mensalidades", icon: Wallet, label: "Mensalidades" },
  { to: "/alunos", icon: Users, label: "Alunos" },
  { to: "/turmas", icon: GraduationCap, label: "Turmas" },
];

const alunoNav = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/mensalidades", icon: Wallet, label: "Mensalidades" },
  { to: "/minhas-turmas", icon: GraduationCap, label: "Turmas" },
  { to: "/perfil", icon: UserCircle, label: "Perfil" },
];

export function BottomNav() {
  const { user } = useAuth();
  const { bloqueado } = useAlunoBloqueado();

  const alunoItems = bloqueado
    ? alunoNav.filter((item) => item.to !== "/minhas-turmas")
    : alunoNav;

  const items = user?.perfil === "ALUNO" ? alunoItems : professorNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/10 bg-white safe-bottom">
      <div className="mx-auto flex max-w-mobile items-center justify-around px-2 py-2">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-medium transition-colors",
                isActive ? "bg-accent text-primary" : "text-muted-foreground hover:text-primary",
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
