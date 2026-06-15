import { z } from "zod";

export const criarAvisoSchema = z.object({
  titulo: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
  descricao: z.string().min(5, "Descrição deve ter no mínimo 5 caracteres"),
  turmaId: z.string().min(1),
  agendadoPara: z.string().datetime().optional().nullable(),
});

export type CriarAvisoInput = z.infer<typeof criarAvisoSchema>;
