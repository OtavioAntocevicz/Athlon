import { z } from "zod";
import { registerProfessorSchema } from "./auth.js";

export const createProfessorAdminSchema = registerProfessorSchema;

export const updateProfessorStatusSchema = z.object({
  ativo: z.boolean(),
});

export const adminMatricularSchema = z.object({
  turmaId: z.string().min(1),
});

export const adminAfastarSchema = z.object({
  turmaId: z.string().min(1),
});

export const adminTrocarTurmaSchema = z.object({
  turmaOrigemId: z.string().min(1),
  turmaDestinoId: z.string().min(1),
});

export const adminDesbloquearSchema = z.object({
  turmaId: z.string().min(1),
});

export type CreateProfessorAdminInput = z.infer<typeof createProfessorAdminSchema>;
export type UpdateProfessorStatusInput = z.infer<typeof updateProfessorStatusSchema>;
export type AdminMatricularInput = z.infer<typeof adminMatricularSchema>;
export type AdminAfastarInput = z.infer<typeof adminAfastarSchema>;
export type AdminTrocarTurmaInput = z.infer<typeof adminTrocarTurmaSchema>;
export type AdminDesbloquearInput = z.infer<typeof adminDesbloquearSchema>;

export interface AdminDashboard {
  professoresAtivos: number;
  totalTurmas: number;
  totalAlunos: number;
  alunosSemTurma: number;
  professores: AdminProfessorResumo[];
}

export interface AdminProfessorResumo {
  id: string;
  usuarioId: string;
  nome: string;
  email: string;
  ativo: boolean;
  totalTurmas: number;
  totalAlunos: number;
  criadoEm: string;
}

export interface AdminProfessorDetalhe {
  id: string;
  usuarioId: string;
  nome: string;
  email: string;
  chavePix: string | null;
  ativo: boolean;
  criadoEm: string;
  totalTurmas: number;
  totalAlunos: number;
  turmas: AdminTurmaResumo[];
  alunos: AdminAlunoResumo[];
}

export interface AdminTurmaResumo {
  id: string;
  nome: string;
  modalidade: string;
  totalAlunos: number;
  codigoConvite: string;
  criadoEm: string;
}

export interface AdminAlunoResumo {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  turmas: { id: string; nome: string }[];
  statusFinanceiro: string;
}

export interface AdminAlunoListaItem {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  rg: string | null;
  turmas: { id: string; nome: string }[];
  statusFinanceiro: string;
  semTurma: boolean;
}

export interface AdminTurmaDetalhe {
  id: string;
  nome: string;
  modalidade: string;
  nivel: string;
  codigoConvite: string;
  local: string | null;
  horarioInicio: string | null;
  horarioFim: string | null;
  mensalidadeCentavos: number;
  diaVencimento: number;
  fotoUrl: string | null;
  criadoEm: string;
  professor: { id: string; nome: string };
  totalAlunos: number;
  alunos: AdminAlunoResumo[];
}

export interface AdminAlunoDetalhe {
  id: string;
  nome: string;
  sobrenome: string;
  telefone: string | null;
  email: string | null;
  rg: string | null;
  cpf: string | null;
  /** Quando o registro/conta do aluno foi criado */
  criadoEm: string;
  /** Quando a conta de usuário foi criada (null se ainda não tem login) */
  contaCriadaEm: string | null;
  turmas: {
    id: string;
    nome: string;
    professorId: string;
    professorNome: string;
    numeroCamisa: number | null;
    posicao: string | null;
    bloqueadoInadimplencia: boolean;
    /** Quando o aluno entrou na turma */
    matriculadoEm: string;
  }[];
  mensalidades: {
    id: string;
    mesReferencia: string;
    valorCentavos: number;
    status: string;
    vencimento: string | null;
  }[];
}

export interface AdminProfessorCriado {
  id: string;
  usuarioId: string;
  nome: string;
  email: string;
}

export interface AdminTurmaListaItem {
  id: string;
  nome: string;
  modalidade: string;
  professorId: string;
  professorNome: string;
  totalAlunos: number;
  codigoConvite: string;
}

export interface AdminBloqueioItem {
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  turmaNome: string;
  professorNome: string;
}
