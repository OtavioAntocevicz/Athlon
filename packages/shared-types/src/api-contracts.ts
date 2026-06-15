import type { PerfilUsuario, StatusMensalidade } from "./enums.js";

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface AlunoPerfilDados {
  nome: string;
  sobrenome: string;
  telefone: string | null;
  rg: string | null;
  cpf: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  perfil: PerfilUsuario;
  professorId?: string;
  alunoId?: string;
  chavePix?: string | null;
  aluno?: AlunoPerfilDados | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface DashboardProfessor {
  recebidoMesCentavos: number;
  pendenteCentavos: number;
  comprovantesAguardando: number;
  inadimplentes: number;
  mensalidadesEmAberto: number;
  atividadesRecentes: AtividadeRecente[];
}

export interface AtividadeRecente {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  criadoEm: string;
}

export interface MensalidadeResumo {
  id: string;
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  turmaNome: string;
  mesReferencia: string;
  vencimento: string;
  valorCentavos: number;
  status: StatusMensalidade;
  comprovanteUrl?: string | null;
  comprovanteEmAnalise?: boolean;
  comprovantePreviewUrl?: string | null;
}

export interface InadimplenciaPrevisao {
  bloqueado: boolean;
  desbloquearaAoPagar: boolean;
}
