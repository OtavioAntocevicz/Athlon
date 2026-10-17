import type { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
  showHeader?: boolean;
}

export function AppShell({ children, showNav = true, showHeader = true }: AppShellProps) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-mobile bg-background lg:max-w-2xl">
      {showHeader && <Header />}
      <main className={showNav ? "pb-24 px-4" : "px-4"}>{children}</main>
      {showNav && <BottomNav />}
    </div>
  );
}
