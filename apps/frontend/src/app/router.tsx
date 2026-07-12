import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import {
  ProtectedRoute,
  GuestRoute,
  ProfessorRoute,
  AlunoTurmasRoute,
  AdminRoute,
  LoadingScreen,
} from "./guards";
import { ProfileSelectPage } from "@/features/auth/ProfileSelectPage";
import { LoginFormPage } from "@/features/auth/LoginFormPage";

function lazyNamed(
  factory: () => Promise<Record<string, ComponentType<any>>>,
  name: string,
) {
  return lazy(async () => {
    const mod = await factory();
    return { default: mod[name]! };
  });
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

const EsqueciSenhaPage = lazyNamed(
  () => import("@/features/auth/EsqueciSenhaPage"),
  "EsqueciSenhaPage",
);
const RedefinirSenhaTokenPage = lazyNamed(
  () => import("@/features/auth/RedefinirSenhaTokenPage"),
  "RedefinirSenhaTokenPage",
);
const RegisterAlunoPage = lazyNamed(
  () => import("@/features/auth/RegisterAlunoPage"),
  "RegisterAlunoPage",
);
const TermosDeUsoPage = lazyNamed(
  () => import("@/features/legal/TermosDeUsoPage"),
  "TermosDeUsoPage",
);
const PoliticaPrivacidadePage = lazyNamed(
  () => import("@/features/legal/PoliticaPrivacidadePage"),
  "PoliticaPrivacidadePage",
);

const DashboardAlunoPage = lazyNamed(
  () => import("@/features/dashboard/DashboardAlunoPage"),
  "DashboardAlunoPage",
);
const DashboardProfessorPage = lazyNamed(
  () => import("@/features/dashboard/DashboardProfessorPage"),
  "DashboardProfessorPage",
);
const EventosAlunoPage = lazyNamed(
  () => import("@/features/eventos/EventosAlunoPage"),
  "EventosAlunoPage",
);
const EventosProfessorPage = lazyNamed(
  () => import("@/features/eventos/EventosProfessorPage"),
  "EventosProfessorPage",
);

const MensalidadesPage = lazyNamed(
  () => import("@/features/mensalidades/MensalidadesPage"),
  "MensalidadesPage",
);
const MensalidadeDetailPage = lazyNamed(
  () => import("@/features/mensalidades/MensalidadeDetailPage"),
  "MensalidadeDetailPage",
);
const AlunoChamadosPage = lazyNamed(
  () => import("@/features/chamados/AlunoChamadosPage"),
  "AlunoChamadosPage",
);
const AlunoChamadoDetailPage = lazyNamed(
  () => import("@/features/chamados/AlunoChamadoDetailPage"),
  "AlunoChamadoDetailPage",
);
const TurmasAlunoPage = lazyNamed(
  () => import("@/features/turmas/TurmasAlunoPage"),
  "TurmasAlunoPage",
);
const TurmaAlunoDetailPage = lazyNamed(
  () => import("@/features/turmas/TurmaAlunoDetailPage"),
  "TurmaAlunoDetailPage",
);
const PerfilPage = lazyNamed(() => import("@/features/perfil/PerfilPage"), "PerfilPage");
const GerirTurmasPage = lazyNamed(
  () => import("@/features/turmas/GerirTurmasPage"),
  "GerirTurmasPage",
);

const TurmasPage = lazyNamed(() => import("@/features/turmas/TurmasPage"), "TurmasPage");
const NovaTurmaPage = lazyNamed(
  () => import("@/features/turmas/NovaTurmaPage"),
  "NovaTurmaPage",
);
const TurmaDetailPage = lazyNamed(
  () => import("@/features/turmas/TurmaDetailPage"),
  "TurmaDetailPage",
);
const AlunosPage = lazyNamed(() => import("@/features/alunos/AlunosPage"), "AlunosPage");
const AlunoDetailPage = lazyNamed(
  () => import("@/features/alunos/AlunoDetailPage"),
  "AlunoDetailPage",
);
const ComprovantesFilaPage = lazyNamed(
  () => import("@/features/comprovantes/ComprovantesFilaPage"),
  "ComprovantesFilaPage",
);
const ComprovanteValidacaoPage = lazyNamed(
  () => import("@/features/comprovantes/ComprovanteValidacaoPage"),
  "ComprovanteValidacaoPage",
);
const AvisosProfessorPage = lazyNamed(
  () => import("@/features/avisos/AvisosProfessorPage"),
  "AvisosProfessorPage",
);

const AdminDashboardPage = lazyNamed(
  () => import("@/features/admin/AdminDashboardPage"),
  "AdminDashboardPage",
);
const AdminProfessoresPage = lazyNamed(
  () => import("@/features/admin/AdminProfessoresPage"),
  "AdminProfessoresPage",
);
const AdminNovoProfessorPage = lazyNamed(
  () => import("@/features/admin/AdminNovoProfessorPage"),
  "AdminNovoProfessorPage",
);
const AdminProfessorDetailPage = lazyNamed(
  () => import("@/features/admin/AdminProfessorDetailPage"),
  "AdminProfessorDetailPage",
);
const AdminPerfilPage = lazyNamed(
  () => import("@/features/admin/AdminPerfilPage"),
  "AdminPerfilPage",
);
const AdminAlunosPage = lazyNamed(
  () => import("@/features/admin/AdminAlunosPage"),
  "AdminAlunosPage",
);
const AdminAlunoDetailPage = lazyNamed(
  () => import("@/features/admin/AdminAlunoDetailPage"),
  "AdminAlunoDetailPage",
);
const AdminTurmaDetailPage = lazyNamed(
  () => import("@/features/admin/AdminTurmaDetailPage"),
  "AdminTurmaDetailPage",
);
const AdminEdicaoPage = lazyNamed(
  () => import("@/features/admin/AdminEdicaoPage"),
  "AdminEdicaoPage",
);
const AdminEdicaoMatricularPage = lazyNamed(
  () => import("@/features/admin/AdminEdicaoMatricularPage"),
  "AdminEdicaoMatricularPage",
);
const AdminEdicaoRemoverPage = lazyNamed(
  () => import("@/features/admin/AdminEdicaoRemoverPage"),
  "AdminEdicaoRemoverPage",
);
const AdminEdicaoTrocarPage = lazyNamed(
  () => import("@/features/admin/AdminEdicaoTrocarPage"),
  "AdminEdicaoTrocarPage",
);
const AdminEdicaoDesbloquearPage = lazyNamed(
  () => import("@/features/admin/AdminEdicaoDesbloquearPage"),
  "AdminEdicaoDesbloquearPage",
);
const AdminEdicaoProfessoresPage = lazyNamed(
  () => import("@/features/admin/AdminEdicaoProfessoresPage"),
  "AdminEdicaoProfessoresPage",
);
const AdminChamadosPage = lazyNamed(
  () => import("@/features/admin/AdminChamadosPage"),
  "AdminChamadosPage",
);
const AdminChamadoDetailPage = lazyNamed(
  () => import("@/features/admin/AdminChamadosPage"),
  "AdminChamadoDetailPage",
);

function HomePage() {
  const { user } = useAuth();
  if (user?.perfil === "ADM") return <Navigate to="/admin" replace />;
  if (user?.perfil === "ALUNO") {
    return (
      <LazyRoute>
        <DashboardAlunoPage />
      </LazyRoute>
    );
  }
  return (
    <LazyRoute>
      <DashboardProfessorPage />
    </LazyRoute>
  );
}

function EventosPage() {
  const { user } = useAuth();
  if (user?.perfil === "ALUNO") {
    return (
      <LazyRoute>
        <EventosAlunoPage />
      </LazyRoute>
    );
  }
  return (
    <LazyRoute>
      <EventosProfessorPage />
    </LazyRoute>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><ProfileSelectPage /></GuestRoute>} />
      <Route path="/login/admin" element={<Navigate to="/login/professor" replace />} />
      <Route
        path="/login/professor"
        element={
          <GuestRoute>
            <LoginFormPage
              perfil="PROFESSOR"
              title="Login Treinador"
              esqueciSenhaPath="/login/professor/esqueci-senha"
            />
          </GuestRoute>
        }
      />
      <Route
        path="/login/aluno"
        element={
          <GuestRoute>
            <LoginFormPage
              perfil="ALUNO"
              title="Login Aluno"
              cadastroPath="/cadastro/aluno"
              esqueciSenhaPath="/login/aluno/esqueci-senha"
            />
          </GuestRoute>
        }
      />
      <Route
        path="/login/professor/esqueci-senha"
        element={
          <GuestRoute>
            <LazyRoute>
              <EsqueciSenhaPage
                perfil="PROFESSOR"
                title="Recuperar senha"
                loginPath="/login/professor"
              />
            </LazyRoute>
          </GuestRoute>
        }
      />
      <Route
        path="/login/aluno/esqueci-senha"
        element={
          <GuestRoute>
            <LazyRoute>
              <EsqueciSenhaPage
                perfil="ALUNO"
                title="Recuperar senha"
                loginPath="/login/aluno"
                cadastroPath="/cadastro/aluno"
              />
            </LazyRoute>
          </GuestRoute>
        }
      />
      <Route
        path="/login/professor/redefinir-senha/:token"
        element={
          <GuestRoute>
            <LazyRoute>
              <RedefinirSenhaTokenPage
                loginPath="/login/professor"
                esqueciSenhaPath="/login/professor/esqueci-senha"
              />
            </LazyRoute>
          </GuestRoute>
        }
      />
      <Route
        path="/login/aluno/redefinir-senha/:token"
        element={
          <GuestRoute>
            <LazyRoute>
              <RedefinirSenhaTokenPage
                loginPath="/login/aluno"
                esqueciSenhaPath="/login/aluno/esqueci-senha"
              />
            </LazyRoute>
          </GuestRoute>
        }
      />
      <Route
        path="/cadastro/aluno"
        element={
          <GuestRoute>
            <LazyRoute>
              <RegisterAlunoPage />
            </LazyRoute>
          </GuestRoute>
        }
      />
      <Route
        path="/termos"
        element={
          <LazyRoute>
            <TermosDeUsoPage />
          </LazyRoute>
        }
      />
      <Route
        path="/privacidade"
        element={
          <LazyRoute>
            <PoliticaPrivacidadePage />
          </LazyRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminDashboardPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/professores"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminProfessoresPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/professores/novo"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminNovoProfessorPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/professores/:id"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminProfessorDetailPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/alunos"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminAlunosPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/alunos/:id"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminAlunoDetailPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/turmas/:id"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminTurmaDetailPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/edicao"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminEdicaoPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/edicao/matricular"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminEdicaoMatricularPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/edicao/remover"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminEdicaoRemoverPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/edicao/trocar"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminEdicaoTrocarPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/edicao/desbloquear"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminEdicaoDesbloquearPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/edicao/professores"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminEdicaoProfessoresPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/chamados"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminChamadosPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/chamados/:id"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminChamadoDetailPage />
            </LazyRoute>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/perfil"
        element={
          <AdminRoute>
            <LazyRoute>
              <AdminPerfilPage />
            </LazyRoute>
          </AdminRoute>
        }
      />

      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route
        path="/chamados"
        element={
          <ProtectedRoute>
            <LazyRoute>
              <AlunoChamadosPage />
            </LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chamados/:id"
        element={
          <ProtectedRoute>
            <LazyRoute>
              <AlunoChamadoDetailPage />
            </LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mensalidades"
        element={
          <ProtectedRoute>
            <LazyRoute>
              <MensalidadesPage />
            </LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mensalidades/:id"
        element={
          <ProtectedRoute>
            <LazyRoute>
              <MensalidadeDetailPage />
            </LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/comprovantes"
        element={
          <ProfessorRoute>
            <LazyRoute>
              <ComprovantesFilaPage />
            </LazyRoute>
          </ProfessorRoute>
        }
      />
      <Route
        path="/comprovantes/:id"
        element={
          <ProfessorRoute>
            <LazyRoute>
              <ComprovanteValidacaoPage />
            </LazyRoute>
          </ProfessorRoute>
        }
      />
      <Route
        path="/turmas"
        element={
          <ProfessorRoute>
            <LazyRoute>
              <TurmasPage />
            </LazyRoute>
          </ProfessorRoute>
        }
      />
      <Route
        path="/turmas/nova"
        element={
          <ProfessorRoute>
            <LazyRoute>
              <NovaTurmaPage />
            </LazyRoute>
          </ProfessorRoute>
        }
      />
      <Route
        path="/turmas/:id"
        element={
          <ProfessorRoute>
            <LazyRoute>
              <TurmaDetailPage />
            </LazyRoute>
          </ProfessorRoute>
        }
      />
      <Route
        path="/alunos"
        element={
          <ProfessorRoute>
            <LazyRoute>
              <AlunosPage />
            </LazyRoute>
          </ProfessorRoute>
        }
      />
      <Route
        path="/alunos/:id"
        element={
          <ProfessorRoute>
            <LazyRoute>
              <AlunoDetailPage />
            </LazyRoute>
          </ProfessorRoute>
        }
      />
      <Route
        path="/avisos"
        element={
          <ProfessorRoute>
            <LazyRoute>
              <AvisosProfessorPage />
            </LazyRoute>
          </ProfessorRoute>
        }
      />
      <Route path="/eventos" element={<ProtectedRoute><EventosPage /></ProtectedRoute>} />
      <Route
        path="/minhas-turmas"
        element={
          <AlunoTurmasRoute>
            <LazyRoute>
              <TurmasAlunoPage />
            </LazyRoute>
          </AlunoTurmasRoute>
        }
      />
      <Route
        path="/minhas-turmas/:id"
        element={
          <AlunoTurmasRoute>
            <LazyRoute>
              <TurmaAlunoDetailPage />
            </LazyRoute>
          </AlunoTurmasRoute>
        }
      />
      <Route
        path="/gerir-turmas"
        element={
          <ProfessorRoute>
            <LazyRoute>
              <GerirTurmasPage />
            </LazyRoute>
          </ProfessorRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <LazyRoute>
              <PerfilPage />
            </LazyRoute>
          }
        />
        <Route
          path="gerir-turmas"
          element={
            <ProfessorRoute>
              <LazyRoute>
                <GerirTurmasPage />
              </LazyRoute>
            </ProfessorRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
