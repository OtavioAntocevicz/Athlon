export const PerfilUsuario = {
  ADM: "ADM",
  PROFESSOR: "PROFESSOR",
  ALUNO: "ALUNO",
} as const;

export type PerfilUsuario = (typeof PerfilUsuario)[keyof typeof PerfilUsuario];

export const StatusMensalidade = {
  PENDENTE: "PENDENTE",
  EM_ANALISE: "EM_ANALISE",
  PAGO: "PAGO",
  RECUSADO: "RECUSADO",
  ATRASADO: "ATRASADO",
} as const;

export type StatusMensalidade =
  (typeof StatusMensalidade)[keyof typeof StatusMensalidade];

export const Modalidade = {
  VOLEI: "VOLEI",
  FUTEBOL: "FUTEBOL",
  BASQUETE: "BASQUETE",
  FUTSAL: "FUTSAL",
  HANDEBOL: "HANDEBOL",
  OUTRO: "OUTRO",
} as const;

export type Modalidade = (typeof Modalidade)[keyof typeof Modalidade];

export const NivelTurma = {
  INICIANTE: "INICIANTE",
  INTERMEDIARIO: "INTERMEDIARIO",
  AVANCADO: "AVANCADO",
} as const;

export type NivelTurma = (typeof NivelTurma)[keyof typeof NivelTurma];

export const TipoEvento = {
  AMISTOSO: "AMISTOSO",
  CAMPEONATO: "CAMPEONATO",
} as const;

export type TipoEvento = (typeof TipoEvento)[keyof typeof TipoEvento];
