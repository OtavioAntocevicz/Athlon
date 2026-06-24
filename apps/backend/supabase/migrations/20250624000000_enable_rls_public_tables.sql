-- Habilita RLS em todas as tabelas do schema public expostas ao PostgREST.
-- O ATHLON acessa o banco somente via service_role no backend (bypassa RLS).
-- Sem policies: anon/authenticated ficam bloqueados (defesa em profundidade junto com REVOKE ALL).

ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Professor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Turma" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Aluno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatriculaTurma" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pagamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comprovante" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Evento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Presenca" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notificacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TokenPushFcm" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvisoProfessor" ENABLE ROW LEVEL SECURITY;

-- Ja habilitado em 20250615000000_cron_avisos.sql; idempotente:
ALTER TABLE "_athlon_cron_config" ENABLE ROW LEVEL SECURITY;
