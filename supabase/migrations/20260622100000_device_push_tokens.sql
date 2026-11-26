-- Table des tokens Push FCM par appareil pour les notifications critiques Android/iOS
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  role text NOT NULL,
  fcm_token text NOT NULL,
  platform text NOT NULL DEFAULT 'android',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index unique sur fcm_token (upsert idempotent par appareil)
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_push_tokens_fcm_token
  ON public.device_push_tokens (fcm_token);

-- Index sur role pour cibler rapidement executant / admin / ingenieur
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_role
  ON public.device_push_tokens (role);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent enregistrer et mettre à jour leur token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'device_push_tokens'
      AND policyname = 'Authenticated users can upsert push tokens'
  ) THEN
    CREATE POLICY "Authenticated users can upsert push tokens"
      ON public.device_push_tokens
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
