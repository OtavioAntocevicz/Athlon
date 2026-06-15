import { z } from "zod";
import { PerfilUsuario } from "../enums.js";

const currentYear = new Date().getFullYear();

function digitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

const whatsappSchema = z
  .string()
  .min(1, "WhatsApp é obrigatório")
  .refine(
    (v) => digitCount(v) >= 10 && digitCount(v) <= 11,
    "WhatsApp inválido (10 ou 11 dígitos)",
  );

const cpfOpcionalSchema = z
  .string()
  .optional()
  .refine(
    (v) => !v?.trim() || digitCount(v) === 11,
    "CPF inválido (11 dígitos)",
  )
  .transform((v) => (v?.trim() ? v.trim() : undefined));

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  perfil: z.enum([PerfilUsuario.PROFESSOR, PerfilUsuario.ALUNO]),
});

export const registerProfessorSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  chavePix: z.string().min(1, "Chave PIX é obrigatória"),
});

export const registerAlunoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  sobrenome: z.string().min(2, "Sobrenome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  whatsapp: whatsappSchema,
  anoNascimento: z
    .number({ invalid_type_error: "Informe o ano de nascimento" })
    .int()
    .min(1920, "Ano inválido")
    .max(currentYear, "Ano não pode ser no futuro"),
  rg: z
    .string()
    .min(1, "RG é obrigatório")
    .refine((v) => digitCount(v) >= 7, "RG inválido"),
  cpf: cpfOpcionalSchema,
  codigoConvite: z.string().min(4, "Código da turma é obrigatório"),
});

export const updateProfessorPerfilSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  chavePix: z.string().min(1, "Chave PIX é obrigatória"),
});

export const updateAlunoPerfilSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  sobrenome: z.string().min(2, "Sobrenome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  whatsapp: whatsappSchema,
  rg: z
    .string()
    .min(1, "RG é obrigatório")
    .refine((v) => digitCount(v) >= 7, "RG inválido"),
  cpf: cpfOpcionalSchema,
});

export const changePasswordSchema = z
  .object({
    senhaAtual: z.string().min(1, "Senha atual é obrigatória"),
    senhaNova: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
    confirmarSenha: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((data) => data.senhaNova === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterProfessorInput = z.infer<typeof registerProfessorSchema>;
export type RegisterAlunoInput = z.infer<typeof registerAlunoSchema>;
export type UpdateProfessorPerfilInput = z.infer<typeof updateProfessorPerfilSchema>;
export type UpdateAlunoPerfilInput = z.infer<typeof updateAlunoPerfilSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
