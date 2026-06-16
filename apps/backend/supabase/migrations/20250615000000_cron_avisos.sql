-- Cron horario de avisos agendados (Supabase pg_cron + pg_net).
-- O plano Hobby da Vercel so permite crons no maximo 1x por dia; avisos rodam aqui.
--
-- Apos o deploy na Vercel, execute no SQL Editor (substitua URL e segredo):
--
-- INSERT INTO "_athlon_cron_config" (vercel_url, cron_secret)
-- VALUES ('https://seu-app.vercel.app', 'mesmo-CRON_SECRET-da-vercel')
-- ON CONFLICT (id) DO UPDATE SET
--   vercel_url = EXCLUDED.vercel_url,
--   cron_secret = EXCLUDED.cron_secret;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS "_athlon_cron_config" (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  vercel_url text,
  cron_secret text
);

ALTER TABLE "_athlon_cron_config" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.trigger_avisos_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg record;
BEGIN
  SELECT vercel_url, cron_secret INTO cfg
  FROM "_athlon_cron_config"
  WHERE id = 1;

  IF cfg.vercel_url IS NULL OR cfg.cron_secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := rtrim(cfg.vercel_url, '/') || '/api/cron/avisos',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cfg.cron_secret
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_avisos_cron() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_avisos_cron() TO postgres;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'athlon-avisos-hourly') THEN
    PERFORM cron.unschedule('athlon-avisos-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'athlon-avisos-hourly',
  '0 * * * *',
  $$SELECT public.trigger_avisos_cron();$$
);
