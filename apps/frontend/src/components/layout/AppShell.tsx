import type { ReactNode } from "react";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
  showHeader?: boolean;
}

export function AppShell({ children, showNav = true, showHeader = true }: AppShellProps) {
  return (
    <div className="mx-auto min-h-screen max-w-mobile bg-background">
      {showHeader && <Header />}
      <main className={showNav ? "pb-24 px-4" : "px-4"}>{children}</main>
      {showNav && <BottomNav />}
      <PwaInstallPrompt />
    </div>
  );
}
