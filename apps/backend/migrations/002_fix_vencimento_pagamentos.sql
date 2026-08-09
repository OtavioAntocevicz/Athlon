-- Corrige Pagamento.vencimento que foi gravado como dia 1 (bug toMesReferenciaDate)
-- usando o dia_vencimento atual da turma.
UPDATE "Pagamento" AS p
SET
  vencimento = make_date(
    EXTRACT(YEAR FROM p.mes_referencia)::int,
    EXTRACT(MONTH FROM p.mes_referencia)::int,
    LEAST(t.dia_vencimento, 28)
  ),
  atualizado_em = CURRENT_TIMESTAMP
FROM "Turma" t
WHERE p.turma_id = t.id
  AND t.dia_vencimento IS NOT NULL
  AND p.status IN ('PENDENTE', 'ATRASADO', 'RECUSADO', 'EM_ANALISE');
