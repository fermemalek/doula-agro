-- Configuration permanente des alertes météo (Température Haute & Basse/Gel) + Multi-Contacts
CREATE TABLE IF NOT EXISTS public.weather_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid UNIQUE NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  max_temp_threshold numeric NOT NULL DEFAULT 35,
  min_temp_threshold numeric NOT NULL DEFAULT 2,
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_heat_alert_at timestamptz,
  last_frost_alert_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ligne par défaut pour la ferme Doula Agro (Benhar)
INSERT INTO public.weather_alert_settings (farm_id, max_temp_threshold, min_temp_threshold, contacts)
VALUES ('00000000-0000-0000-0000-000000000001', 35, 2, '[]'::jsonb)
ON CONFLICT (farm_id) DO NOTHING;

ALTER TABLE public.weather_alert_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'weather_alert_settings'
      AND policyname = 'Authenticated users can manage weather alert settings'
  ) THEN
    CREATE POLICY "Authenticated users can manage weather alert settings"
      ON public.weather_alert_settings
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- CRON AUTOMATIQUE TOUTES LES 30 MINUTES (à exécuter dans Supabase SQL Editor
-- après déploiement de l'Edge Function `weather-threshold-alert`) :
--
-- SELECT cron.schedule(
--   'doula-weather-threshold-30m',
--   '*/30 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://krmvdahejfczrziobesi.supabase.co/functions/v1/weather-threshold-alert',
--     headers := '{"Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
-- ============================================================================
