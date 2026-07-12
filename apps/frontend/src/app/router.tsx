import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute, GuestRoute, ProfessorRoute, AlunoTurmasRoute, AdminRoute } from "./guards";
import { AdminDashboardPage } from "@/features/admin/AdminDashboardPage";
import { AdminProfessoresPage } from "@/features/admin/AdminProfessoresPage";
import { AdminNovoProfessorPage } from "@/features/admin/AdminNovoProfessorPage";
import { AdminProfessorDetailPage } from "@/features/admin/AdminProfessorDetailPage";
import { AdminPerfilPage } from "@/features/admin/AdminPerfilPage";
import { AdminAlunosPage } from "@/features/admin/AdminAlunosPage";
import { AdminAlunoDetailPage } from "@/features/admin/AdminAlunoDetailPage";
import { AdminTurmaDetailPage } from "@/features/admin/AdminTurmaDetailPage";
import { AdminEdicaoPage } from "@/features/admin/AdminEdicaoPage";
import { AdminEdicaoMatricularPage } from "@/features/admin/AdminEdicaoMatricularPage";
import { AdminEdicaoRemoverPage } from "@/features/admin/AdminEdicaoRemoverPage";
import { AdminEdicaoTrocarPage } from "@/features/admin/AdminEdicaoTrocarPage";
import { AdminEdicaoDesbloquearPage } from "@/features/admin/AdminEdicaoDesbloquearPage";
import { AdminEdicaoProfessoresPage } from "@/features/admin/AdminEdicaoProfessoresPage";
import { AdminChamadosPage, AdminChamadoDetailPage } from "@/features/admin/AdminChamadosPage";
import { AlunoChamadosPage } from "@/features/chamados/AlunoChamadosPage";
import { AlunoChamadoDetailPage } from "@/features/chamados/AlunoChamadoDetailPage";
import { AvisosProfessorPage } from "@/features/avisos/AvisosProfessorPage";
import { ProfileSelectPage } from "@/features/auth/ProfileSelectPage";
import { RedefinirSenhaTokenPage } from "@/features/auth/RedefinirSenhaTokenPage";
import { EsqueciSenhaPage } from "@/features/auth/EsqueciSenhaPage";
import { LoginFormPage } from "@/features/auth/LoginFormPage";
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
import { EventosProfessorPage } from "@/features/eventos/EventosProfessorPage";
import { EventosAlunoPage } from "@/features/eventos/EventosAlunoPage";
import { TermosDeUsoPage } from "@/features/legal/TermosDeUsoPage";
import { PoliticaPrivacidadePage } from "@/features/legal/PoliticaPrivacidadePage";

function HomePage() {
  const { user } = useAuth();
  if (user?.perfil === "ADM") return <Navigate to="/admin" replace />;
  if (user?.perfil === "ALUNO") return <DashboardAlunoPage />;
  return <DashboardProfessorPage />;
}

function EventosPage() {
  const { user } = useAuth();
  if (user?.perfil === "ALUNO") return <EventosAlunoPage />;
  return <EventosProfessorPage />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><ProfileSelectPage /></GuestRoute>} />
      <Route path="/login/admin" element={<Navigate to="/login/professor" replace />} />
      <Route path="/login/professor" element={<GuestRoute><LoginFormPage perfil="PROFESSOR" title="Login Treinador" esqueciSenhaPath="/login/professor/esqueci-senha" /></GuestRoute>} />
      <Route path="/login/aluno" element={<GuestRoute><LoginFormPage perfil="ALUNO" title="Login Aluno" cadastroPath="/cadastro/aluno" esqueciSenhaPath="/login/aluno/esqueci-senha" /></GuestRoute>} />
      <Route
        path="/login/professor/esqueci-senha"
        element={
          <GuestRoute>
            <EsqueciSenhaPage
              perfil="PROFESSOR"
              title="Recuperar senha"
              loginPath="/login/professor"
            />
          </GuestRoute>
        }
      />
      <Route
        path="/login/aluno/esqueci-senha"
        element={
          <GuestRoute>
            <EsqueciSenhaPage
              perfil="ALUNO"
              title="Recuperar senha"
              loginPath="/login/aluno"
              cadastroPath="/cadastro/aluno"
            />
          </GuestRoute>
        }
      />
      <Route
        path="/login/professor/redefinir-senha/:token"
        element={
          <GuestRoute>
            <RedefinirSenhaTokenPage
              loginPath="/login/professor"
              esqueciSenhaPath="/login/professor/esqueci-senha"
            />
          </GuestRoute>
        }
      />
      <Route
        path="/login/aluno/redefinir-senha/:token"
        element={
          <GuestRoute>
            <RedefinirSenhaTokenPage
              loginPath="/login/aluno"
              esqueciSenhaPath="/login/aluno/esqueci-senha"
            />
          </GuestRoute>
        }
      />
      <Route path="/cadastro/aluno" element={<GuestRoute><RegisterAlunoPage /></GuestRoute>} />
      <Route path="/termos" element={<TermosDeUsoPage />} />
      <Route path="/privacidade" element={<PoliticaPrivacidadePage />} />

      <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/professores" element={<AdminRoute><AdminProfessoresPage /></AdminRoute>} />
      <Route path="/admin/professores/novo" element={<AdminRoute><AdminNovoProfessorPage /></AdminRoute>} />
      <Route path="/admin/professores/:id" element={<AdminRoute><AdminProfessorDetailPage /></AdminRoute>} />
      <Route path="/admin/alunos" element={<AdminRoute><AdminAlunosPage /></AdminRoute>} />
      <Route path="/admin/alunos/:id" element={<AdminRoute><AdminAlunoDetailPage /></AdminRoute>} />
      <Route path="/admin/turmas/:id" element={<AdminRoute><AdminTurmaDetailPage /></AdminRoute>} />
      <Route path="/admin/edicao" element={<AdminRoute><AdminEdicaoPage /></AdminRoute>} />
      <Route path="/admin/edicao/matricular" element={<AdminRoute><AdminEdicaoMatricularPage /></AdminRoute>} />
      <Route path="/admin/edicao/remover" element={<AdminRoute><AdminEdicaoRemoverPage /></AdminRoute>} />
      <Route path="/admin/edicao/trocar" element={<AdminRoute><AdminEdicaoTrocarPage /></AdminRoute>} />
      <Route path="/admin/edicao/desbloquear" element={<AdminRoute><AdminEdicaoDesbloquearPage /></AdminRoute>} />
      <Route path="/admin/edicao/professores" element={<AdminRoute><AdminEdicaoProfessoresPage /></AdminRoute>} />
      <Route path="/admin/chamados" element={<AdminRoute><AdminChamadosPage /></AdminRoute>} />
      <Route path="/admin/chamados/:id" element={<AdminRoute><AdminChamadoDetailPage /></AdminRoute>} />
      <Route path="/admin/perfil" element={<AdminRoute><AdminPerfilPage /></AdminRoute>} />

      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/chamados" element={<ProtectedRoute><AlunoChamadosPage /></ProtectedRoute>} />
      <Route path="/chamados/:id" element={<ProtectedRoute><AlunoChamadoDetailPage /></ProtectedRoute>} />
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
      <Route path="/eventos" element={<ProtectedRoute><EventosPage /></ProtectedRoute>} />
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
