-- Eventos de turma: amistoso e campeonato

ALTER TYPE "TipoEvento" ADD VALUE IF NOT EXISTS 'AMISTOSO';
ALTER TYPE "TipoEvento" ADD VALUE IF NOT EXISTS 'CAMPEONATO';

ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "adversario" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Evento_turma_id_inicio_idx"
  ON "Evento"("turma_id", "inicio");

CREATE INDEX IF NOT EXISTS "Evento_ativo_inicio_idx"
  ON "Evento"("ativo", "inicio");
