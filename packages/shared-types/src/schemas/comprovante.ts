import { z } from "zod";

export const recusarComprovanteSchema = z.object({
  motivo: z.string().min(3, "Informe o motivo da recusa"),
});

export const confirmarComprovanteSchema = z.object({
  arquivoUrl: z.string().url(),
});

export type RecusarComprovanteInput = z.infer<typeof recusarComprovanteSchema>;
export type ConfirmarComprovanteInput = z.infer<typeof confirmarComprovanteSchema>;
