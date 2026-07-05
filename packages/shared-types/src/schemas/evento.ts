import { z } from "zod";
import { TipoEvento } from "../enums.js";

const tipoEventoValues = [TipoEvento.AMISTOSO, TipoEvento.CAMPEONATO] as const;

const eventoCamposBase = {
  tipo: z.enum(tipoEventoValues, {
    errorMap: () => ({ message: "Tipo deve ser AMISTOSO ou CAMPEONATO" }),
  }),
  titulo: z.string().min(2, "Título deve ter no mínimo 2 caracteres").optional(),
  adversario: z.string().max(120).optional().nullable(),
  local: z.string().max(200).optional().nullable(),
  inicio: z.string().datetime({ message: "Data/hora inválida" }),
  descricao: z.string().max(500).optional().nullable(),
};

export const criarEventoSchema = z.object({
  ...eventoCamposBase,
  turmaId: z.string().min(1).optional(),
});

export const atualizarEventoSchema = z
  .object({
    tipo: z.enum(tipoEventoValues).optional(),
    titulo: z.string().min(2).optional(),
    adversario: z.string().max(120).optional().nullable(),
    local: z.string().max(200).optional().nullable(),
    inicio: z.string().datetime().optional(),
    descricao: z.string().max(500).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export type CriarEventoInput = z.infer<typeof criarEventoSchema>;
export type AtualizarEventoInput = z.infer<typeof atualizarEventoSchema>;
