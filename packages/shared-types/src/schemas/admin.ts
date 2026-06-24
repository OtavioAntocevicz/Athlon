import { z } from "zod";
import { registerProfessorSchema } from "./auth.js";

export const createProfessorAdminSchema = registerProfessorSchema;

export const updateProfessorStatusSchema = z.object({
  ativo: z.boolean(),
});

export type CreateProfessorAdminInput = z.infer<typeof createProfessorAdminSchema>;
export type UpdateProfessorStatusInput = z.infer<typeof updateProfessorStatusSchema>;

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

export interface AdminProfessorCriado {
  id: string;
  usuarioId: string;
  nome: string;
  email: string;
}
