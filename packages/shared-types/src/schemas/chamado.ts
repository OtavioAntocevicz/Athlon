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

export interface ChamadoResumo {
  id: string;
  assunto: string;
  status: string;
  criadoEm: string;
  atualizadoEm: string;
  alunoNome?: string;
}

export interface ChamadoDetalhe {
  id: string;
  alunoId: string;
  alunoNome: string;
  assunto: string;
  mensagem: string;
  status: string;
  respostaAdmin: string | null;
  respondidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}
