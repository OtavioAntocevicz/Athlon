import { NavLink } from "react-router-dom";
import { Home, Users, UserCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const adminNav = [
  { to: "/admin", icon: Home, label: "Início" },
  { to: "/admin/professores", icon: Users, label: "Professores" },
  { to: "/admin/perfil", icon: UserCircle, label: "Perfil" },
];

export function AdminBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/10 bg-white safe-bottom">
      <div className="mx-auto flex max-w-mobile items-center justify-around px-2 py-2 lg:max-w-5xl">
        {adminNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/admin"}
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
