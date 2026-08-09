import { z } from "zod";

export const recusarComprovanteSchema = z.object({
  motivo: z.string().min(3, "Informe o motivo da recusa"),
});

export const confirmarComprovanteSchema = z.object({
  // R2 pode devolver path relativo (comprovantes/...) ou URL pública.
  arquivoUrl: z.string().min(1, "Arquivo obrigatório"),
});

export const uploadComprovanteSchema = z.object({
  contentType: z
    .string()
    .min(1)
    .transform((v) => (v === "image/jpg" ? "image/jpeg" : v))
    .refine(
      (v) => ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(v),
      "Tipo de arquivo não permitido",
    ),
  dataBase64: z.string().min(1, "Arquivo inválido"),
});

export type RecusarComprovanteInput = z.infer<typeof recusarComprovanteSchema>;
export type ConfirmarComprovanteInput = z.infer<typeof confirmarComprovanteSchema>;
export type UploadComprovanteInput = z.infer<typeof uploadComprovanteSchema>;
