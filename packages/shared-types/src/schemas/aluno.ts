import { z } from "zod";

export const createAlunoSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  senha: z.string().min(6).optional(),
});

export const entrarTurmaSchema = z.object({
  codigoConvite: z.string().min(4),
});

export const updateAlunoSchema = z.object({
  nome: z.string().min(2).optional(),
  sobrenome: z.string().min(2).optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
  rg: z.string().optional(),
  cpf: z.string().optional(),
});

export const updateMatriculaSchema = z.object({
  numeroCamisa: z.number().int().min(1).max(99).nullable().optional(),
  posicao: z.string().max(50).nullable().optional(),
});

export const afastarTurmaSchema = z.object({
  turmaId: z.string().min(1),
});

export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
export type EntrarTurmaInput = z.infer<typeof entrarTurmaSchema>;
export type UpdateAlunoInput = z.infer<typeof updateAlunoSchema>;
export type UpdateMatriculaInput = z.infer<typeof updateMatriculaSchema>;
export type AfastarTurmaInput = z.infer<typeof afastarTurmaSchema>;
