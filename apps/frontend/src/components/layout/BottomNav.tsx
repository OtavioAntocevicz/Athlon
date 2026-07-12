import { NavLink } from "react-router-dom";
import { Home, Wallet, Users, GraduationCap, UserCircle, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { useAlunoBloqueado } from "@/lib/use-aluno-bloqueado";

type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
};

const professorNav: NavItem[] = [
  { to: "/eventos", icon: Trophy, label: "Eventos" },
  { to: "/mensalidades", icon: Wallet, label: "Mensal" },
  { to: "/", icon: Home, label: "Início", primary: true },
  { to: "/turmas", icon: GraduationCap, label: "Turmas" },
  { to: "/alunos", icon: Users, label: "Alunos" },
];

const alunoNav: NavItem[] = [
  { to: "/eventos", icon: Trophy, label: "Eventos" },
  { to: "/mensalidades", icon: Wallet, label: "Mensal" },
  { to: "/", icon: Home, label: "Início", primary: true },
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
      <div className="mx-auto flex max-w-mobile items-stretch justify-around px-1 py-2">
        {items.map(({ to, icon: Icon, label, primary }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 flex-col items-center text-[10px] font-medium transition-colors sm:text-xs",
                primary
                  ? "relative -mt-4"
                  : cn(
                      "rounded-xl px-1 py-2",
                      isActive
                        ? "bg-accent font-semibold text-primary shadow-sm"
                        : "text-muted-foreground hover:text-primary",
                    ),
              )
            }
          >
            {({ isActive }) =>
              primary ? (
                <>
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full shadow-brand-card ring-2 transition-colors",
                      isActive
                        ? "bg-primary text-accent ring-accent"
                        : "bg-primary text-white ring-transparent",
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.25} />
                  </span>
                  <span
                    className={cn(
                      "mt-1 whitespace-nowrap font-semibold leading-tight",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </>
              ) : (
                <>
                  <Icon className={cn("h-5 w-5 shrink-0", isActive && "stroke-[2.5]")} />
                  <span className="mt-0.5 whitespace-nowrap text-center leading-tight">
                    {label}
                  </span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
