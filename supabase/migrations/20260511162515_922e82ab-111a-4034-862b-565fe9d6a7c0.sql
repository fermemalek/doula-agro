DO $$ BEGIN
  CREATE TYPE public.reco_kind AS ENUM ('fertilisation','phytosanitaire');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.reco_status AS ENUM ('envoyee','acceptee','rejetee','transferee');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  kind public.reco_kind NOT NULL,
  title text NOT NULL,
  comment text,
  parcel_ids text[] NOT NULL DEFAULT '{}',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  photo_urls text[] NOT NULL DEFAULT '{}',
  status public.reco_status NOT NULL DEFAULT 'envoyee',
  created_by uuid NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  transferred_record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reco read auth" ON public.recommendations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reco insert ingenieur" ON public.recommendations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (public.has_role(auth.uid(),'ingenieur'::public.app_role)
         OR public.has_role(auth.uid(),'admin'::public.app_role))
  );

CREATE POLICY "reco update admin" ON public.recommendations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "reco update own" ON public.recommendations
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status = 'envoyee'::public.reco_status)
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "reco delete admin" ON public.recommendations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER touch_recommendations
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.recommendations;