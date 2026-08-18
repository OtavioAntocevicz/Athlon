-- Códigos de backup MFA em texto para consulta no banco (pedido do dono).
-- codigo_hash continua sendo o usado na validação do login.
ALTER TABLE "MfaBackupCode" ADD COLUMN IF NOT EXISTS codigo TEXT;
