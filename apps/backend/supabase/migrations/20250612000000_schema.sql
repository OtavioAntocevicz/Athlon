-- ATHLON - schema completo (banco novo)
-- Aplique no SQL Editor do Supabase ou via Supabase CLI.
-- Bancos já em produção foram migrados incrementalmente; não reaplique em banco com dados.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "PerfilUsuario" AS ENUM ('PROFESSOR', 'ALUNO');
CREATE TYPE "StatusMensalidade" AS ENUM ('PENDENTE', 'EM_ANALISE', 'PAGO', 'RECUSADO', 'ATRASADO');
CREATE TYPE "NivelTurma" AS ENUM ('INICIANTE', 'INTERMEDIARIO', 'AVANCADO');
CREATE TYPE "TipoEvento" AS ENUM ('TREINO', 'JOGO', 'TORNEIO');
CREATE TYPE "StatusPresenca" AS ENUM ('PENDENTE', 'CONFIRMADA', 'AUSENTE');

CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Professor" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "chave_pix" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Professor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Turma" (
    "id" TEXT NOT NULL,
    "professor_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "modalidade" TEXT NOT NULL DEFAULT 'VOLEI',
    "codigo_convite" TEXT NOT NULL,
    "nivel" "NivelTurma" NOT NULL DEFAULT 'INICIANTE',
    "dias_treino" JSONB,
    "horario_inicio" TEXT,
    "horario_fim" TEXT,
    "local" TEXT,
    "mensalidade_centavos" INTEGER,
    "dia_vencimento" INTEGER,
    "chave_pix" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Aluno" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "sobrenome" TEXT NOT NULL DEFAULT '',
    "data_nascimento" DATE,
    "cpf" TEXT,
    "rg" TEXT,
    "telefone" TEXT,
    "posicao_preferida" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatriculaTurma" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "matriculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posicao" TEXT,
    "numero_camisa" INTEGER,
    "afastado" BOOLEAN NOT NULL DEFAULT false,
    "bloqueado_inadimplencia" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MatriculaTurma_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "mes_referencia" TIMESTAMP(3) NOT NULL,
    "vencimento" DATE,
    "valor_centavos" INTEGER NOT NULL,
    "status" "StatusMensalidade" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "validado_por_id" TEXT,
    "validado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Comprovante" (
    "id" TEXT NOT NULL,
    "pagamento_id" TEXT NOT NULL,
    "arquivo_url" TEXT NOT NULL,
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisado_em" TIMESTAMP(3),
    "motivo_recusa" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Comprovante_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "local" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "permite_confirmacao_aluno" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Presenca" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "status" "StatusPresenca" NOT NULL DEFAULT 'PENDENTE',
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Presenca_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "tipo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TokenPushFcm" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenPushFcm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AvisoProfessor" (
    "id" TEXT NOT NULL,
    "professor_id" TEXT NOT NULL,
    "turma_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "agendado_para" TIMESTAMP(3),
    "enviado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvisoProfessor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Professor_usuario_id_key" ON "Professor"("usuario_id");
CREATE UNIQUE INDEX "Turma_codigo_convite_key" ON "Turma"("codigo_convite");
CREATE UNIQUE INDEX "Aluno_usuario_id_key" ON "Aluno"("usuario_id");
CREATE UNIQUE INDEX "MatriculaTurma_aluno_id_turma_id_key" ON "MatriculaTurma"("aluno_id", "turma_id");
CREATE UNIQUE INDEX "Pagamento_aluno_id_turma_id_mes_referencia_key" ON "Pagamento"("aluno_id", "turma_id", "mes_referencia");
CREATE INDEX "AvisoProfessor_professor_id_criado_em_idx" ON "AvisoProfessor"("professor_id", "criado_em" DESC);
CREATE INDEX "AvisoProfessor_agendado_pendente_idx" ON "AvisoProfessor"("agendado_para")
  WHERE "enviado_em" IS NULL AND "agendado_para" IS NOT NULL;

ALTER TABLE "Professor"
  ADD CONSTRAINT "Professor_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Turma"
  ADD CONSTRAINT "Turma_professor_id_fkey"
  FOREIGN KEY ("professor_id") REFERENCES "Professor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Aluno"
  ADD CONSTRAINT "Aluno_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatriculaTurma"
  ADD CONSTRAINT "MatriculaTurma_aluno_id_fkey"
  FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatriculaTurma"
  ADD CONSTRAINT "MatriculaTurma_turma_id_fkey"
  FOREIGN KEY ("turma_id") REFERENCES "Turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pagamento"
  ADD CONSTRAINT "Pagamento_aluno_id_fkey"
  FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Pagamento"
  ADD CONSTRAINT "Pagamento_turma_id_fkey"
  FOREIGN KEY ("turma_id") REFERENCES "Turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pagamento"
  ADD CONSTRAINT "Pagamento_validado_por_id_fkey"
  FOREIGN KEY ("validado_por_id") REFERENCES "Professor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Comprovante"
  ADD CONSTRAINT "Comprovante_pagamento_id_fkey"
  FOREIGN KEY ("pagamento_id") REFERENCES "Pagamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Evento"
  ADD CONSTRAINT "Evento_turma_id_fkey"
  FOREIGN KEY ("turma_id") REFERENCES "Turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Presenca"
  ADD CONSTRAINT "Presenca_evento_id_fkey"
  FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Presenca"
  ADD CONSTRAINT "Presenca_aluno_id_fkey"
  FOREIGN KEY ("aluno_id") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notificacao"
  ADD CONSTRAINT "Notificacao_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TokenPushFcm"
  ADD CONSTRAINT "TokenPushFcm_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvisoProfessor"
  ADD CONSTRAINT "AvisoProfessor_professor_id_fkey"
  FOREIGN KEY ("professor_id") REFERENCES "Professor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvisoProfessor"
  ADD CONSTRAINT "AvisoProfessor_turma_id_fkey"
  FOREIGN KEY ("turma_id") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Acesso apenas via service role (backend)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
