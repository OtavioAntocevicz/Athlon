import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useAlunoBloqueado } from "@/lib/use-aluno-bloqueado";
import type { ReactNode } from "react";
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.perfil === "ADM") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) {
    if (user.perfil === "ADM") return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login/professor" replace />;
  if (user.perfil !== "ADM") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function isProfessorUser(user: { perfil?: string; professorId?: string }) {
  return user.perfil === "PROFESSOR" || !!user.professorId;
}

export function ProfessorRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.perfil === "ADM") return <Navigate to="/admin" replace />;
  if (!isProfessorUser(user)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AlunoRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.perfil !== "ALUNO") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AlunoTurmasRoute({ children }: { children: ReactNode }) {
  return (
    <AlunoRoute>
      <AlunoTurmasGuard>{children}</AlunoTurmasGuard>
    </AlunoRoute>
  );
}

function AlunoTurmasGuard({ children }: { children: ReactNode }) {
  const { bloqueado, isLoading } = useAlunoBloqueado();

  if (isLoading) return <LoadingScreen />;
  if (bloqueado) return <Navigate to="/mensalidades" replace />;
  return <>{children}</>;
}
