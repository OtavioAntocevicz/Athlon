import type { AuthUser } from "@athlon/shared-types";

/** Pré-carrega o chunk da home pós-login para evitar tela vazia no primeiro acesso. */
export function preloadPostLoginDestination(user: AuthUser): void {
  if (user.perfil === "ALUNO" && user.emailVerificado !== true) {
    void import("@/features/auth/VerificarEmailPage");
    return;
  }

  switch (user.perfil) {
    case "ADM":
      void import("@/features/admin/AdminDashboardPage");
      break;
    case "ALUNO":
      void import("@/features/dashboard/DashboardAlunoPage");
      break;
    default:
      void import("@/features/dashboard/DashboardProfessorPage");
      break;
  }
}
