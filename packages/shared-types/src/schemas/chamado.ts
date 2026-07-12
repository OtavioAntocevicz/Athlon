import { z } from "zod";
import { StatusChamado } from "../enums.js";

export const criarChamadoSchema = z.object({
  assunto: z.string().min(3).max(120),
  mensagem: z.string().min(10).max(2000),
});

export const responderChamadoSchema = z.object({
  respostaAdmin: z.string().min(3).max(2000),
  status: z
    .enum([StatusChamado.RESPONDIDO, StatusChamado.FECHADO, StatusChamado.ABERTO])
    .optional(),
});

export type CriarChamadoInput = z.infer<typeof criarChamadoSchema>;
export type ResponderChamadoInput = z.infer<typeof responderChamadoSchema>;

export type AutorChamado = "ALUNO" | "PROFESSOR";

export interface ChamadoResumo {
  id: string;
  assunto: string;
  status: string;
  criadoEm: string;
  atualizadoEm: string;
  autorTipo?: AutorChamado;
  /** Nome de quem abriu (aluno ou professor) */
  autorNome?: string;
  /** @deprecated use autorNome */
  alunoNome?: string;
}

export interface ChamadoDetalhe {
  id: string;
  alunoId: string | null;
  professorId: string | null;
  autorTipo: AutorChamado;
  autorNome: string;
  /** @deprecated use autorNome */
  alunoNome: string;
  assunto: string;
  mensagem: string;
  status: string;
  respostaAdmin: string | null;
  respondidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}
