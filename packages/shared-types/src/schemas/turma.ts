import { z } from "zod";

export const createTurmaSchema = z.object({
  nome: z.string().min(2),
  modalidade: z.enum(["VOLEI", "FUTEBOL", "BASQUETE", "FUTSAL", "HANDEBOL", "OUTRO"]).default("VOLEI"),
  nivel: z.enum(["INICIANTE", "INTERMEDIARIO", "AVANCADO"]).default("INICIANTE"),
  mensalidadeCentavos: z.number().int().positive(),
  diaVencimento: z.number().int().min(1).max(28),
  chavePix: z.string().min(1, "Chave PIX é obrigatória"),
  local: z.string().optional(),
  horarioInicio: z.string().optional(),
  horarioFim: z.string().optional(),
  diasTreino: z.array(z.string()).optional(),
});

export const updateTurmaSchema = createTurmaSchema.partial();

export const updateTurmaBasicoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  modalidade: z.enum(["VOLEI", "FUTEBOL", "BASQUETE", "FUTSAL", "HANDEBOL", "OUTRO"]),
  nivel: z.enum(["INICIANTE", "INTERMEDIARIO", "AVANCADO"]),
  mensalidadeCentavos: z.number().int().positive("Mensalidade inválida"),
  diaVencimento: z.number().int().min(1).max(28),
  chavePix: z.string().min(1, "Chave PIX é obrigatória"),
  local: z.string().optional(),
  horarioInicio: z.string().optional(),
  horarioFim: z.string().optional(),
});

export type CreateTurmaInput = z.infer<typeof createTurmaSchema>;
export type UpdateTurmaInput = z.infer<typeof updateTurmaSchema>;
export type UpdateTurmaBasicoInput = z.infer<typeof updateTurmaBasicoSchema>;
