import type { ReactNode } from "react";
import { Header } from "./Header";
import { AdminBottomNav } from "./AdminBottomNav";

interface AdminShellProps {
  children: ReactNode;
  showNav?: boolean;
  showHeader?: boolean;
}

export function AdminShell({ children, showNav = true, showHeader = true }: AdminShellProps) {
  return (
    <div className="mx-auto min-h-screen max-w-mobile bg-background lg:max-w-5xl">
      {showHeader && <Header />}
      <main className={showNav ? "px-4 pb-24 lg:px-8" : "px-4 lg:px-8"}>{children}</main>
      {showNav && <AdminBottomNav />}
    </div>
  );
}
