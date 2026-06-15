import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute, GuestRoute, ProfessorRoute, AlunoTurmasRoute } from "./guards";
import { AvisosProfessorPage } from "@/features/avisos/AvisosProfessorPage";
import { ProfileSelectPage } from "@/features/auth/ProfileSelectPage";
import { LoginFormPage } from "@/features/auth/LoginFormPage";
import { RegisterProfessorPage } from "@/features/auth/RegisterProfessorPage";
import { RegisterAlunoPage } from "@/features/auth/RegisterAlunoPage";
import { DashboardProfessorPage } from "@/features/dashboard/DashboardProfessorPage";
import { DashboardAlunoPage } from "@/features/dashboard/DashboardAlunoPage";
import { MensalidadesPage } from "@/features/mensalidades/MensalidadesPage";
import { MensalidadeDetailPage } from "@/features/mensalidades/MensalidadeDetailPage";
import { ComprovantesFilaPage } from "@/features/comprovantes/ComprovantesFilaPage";
import { ComprovanteValidacaoPage } from "@/features/comprovantes/ComprovanteValidacaoPage";
import { TurmasPage } from "@/features/turmas/TurmasPage";
import { NovaTurmaPage } from "@/features/turmas/NovaTurmaPage";
import { TurmaDetailPage } from "@/features/turmas/TurmaDetailPage";
import { TurmasAlunoPage } from "@/features/turmas/TurmasAlunoPage";
import { TurmaAlunoDetailPage } from "@/features/turmas/TurmaAlunoDetailPage";
import { AlunosPage } from "@/features/alunos/AlunosPage";
import { AlunoDetailPage } from "@/features/alunos/AlunoDetailPage";
import { PerfilPage } from "@/features/perfil/PerfilPage";
import { GerirTurmasPage } from "@/features/turmas/GerirTurmasPage";
import { TermosDeUsoPage } from "@/features/legal/TermosDeUsoPage";
import { PoliticaPrivacidadePage } from "@/features/legal/PoliticaPrivacidadePage";

function HomePage() {
  const { user } = useAuth();
  if (user?.perfil === "ALUNO") return <DashboardAlunoPage />;
  return <DashboardProfessorPage />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><ProfileSelectPage /></GuestRoute>} />
      <Route path="/login/professor" element={<GuestRoute><LoginFormPage perfil="PROFESSOR" title="Login Treinador" cadastroPath="/cadastro/professor" /></GuestRoute>} />
      <Route path="/login/aluno" element={<GuestRoute><LoginFormPage perfil="ALUNO" title="Login Aluno" cadastroPath="/cadastro/aluno" /></GuestRoute>} />
      <Route path="/cadastro/professor" element={<GuestRoute><RegisterProfessorPage /></GuestRoute>} />
      <Route path="/cadastro/aluno" element={<GuestRoute><RegisterAlunoPage /></GuestRoute>} />
      <Route path="/termos" element={<TermosDeUsoPage />} />
      <Route path="/privacidade" element={<PoliticaPrivacidadePage />} />

      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/mensalidades" element={<ProtectedRoute><MensalidadesPage /></ProtectedRoute>} />
      <Route path="/mensalidades/:id" element={<ProtectedRoute><MensalidadeDetailPage /></ProtectedRoute>} />
      <Route path="/comprovantes" element={<ProfessorRoute><ComprovantesFilaPage /></ProfessorRoute>} />
      <Route path="/comprovantes/:id" element={<ProfessorRoute><ComprovanteValidacaoPage /></ProfessorRoute>} />
      <Route path="/turmas" element={<ProfessorRoute><TurmasPage /></ProfessorRoute>} />
      <Route path="/turmas/nova" element={<ProfessorRoute><NovaTurmaPage /></ProfessorRoute>} />
      <Route path="/turmas/:id" element={<ProfessorRoute><TurmaDetailPage /></ProfessorRoute>} />
      <Route path="/alunos" element={<ProfessorRoute><AlunosPage /></ProfessorRoute>} />
      <Route path="/alunos/:id" element={<ProfessorRoute><AlunoDetailPage /></ProfessorRoute>} />
      <Route path="/avisos" element={<ProfessorRoute><AvisosProfessorPage /></ProfessorRoute>} />
      <Route path="/minhas-turmas" element={<AlunoTurmasRoute><TurmasAlunoPage /></AlunoTurmasRoute>} />
      <Route path="/minhas-turmas/:id" element={<AlunoTurmasRoute><TurmaAlunoDetailPage /></AlunoTurmasRoute>} />
      <Route path="/gerir-turmas" element={<ProfessorRoute><GerirTurmasPage /></ProfessorRoute>} />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        <Route index element={<PerfilPage />} />
        <Route
          path="gerir-turmas"
          element={
            <ProfessorRoute>
              <GerirTurmasPage />
            </ProfessorRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
