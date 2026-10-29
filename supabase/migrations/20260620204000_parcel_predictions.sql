CREATE TABLE IF NOT EXISTS public.parcel_predictions (
  id text PRIMARY KEY, -- format: {parcel_id}-{line_number}-{tree_number}
  parcel_id text NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  tree_number integer NOT NULL,
  is_fruiting boolean NOT NULL DEFAULT false,
  estimated_qty double precision NOT NULL DEFAULT 0,
  tree_type text, -- 'gala' | 'golden' | 'granny'
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parcel_sections_config (
  id text PRIMARY KEY, -- format: {parcel_id}-{line_number}-{section_number}
  parcel_id text NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  section_number integer NOT NULL,
  tree_count integer NOT NULL DEFAULT 8,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parcel_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_sections_config ENABLE ROW LEVEL SECURITY;

-- Policies for predictions
DROP POLICY IF EXISTS "Allow authenticated select" ON public.parcel_predictions;
CREATE POLICY "Allow authenticated select"
  ON public.parcel_predictions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.parcel_predictions;
CREATE POLICY "Allow authenticated insert"
  ON public.parcel_predictions FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update" ON public.parcel_predictions;
CREATE POLICY "Allow authenticated update"
  ON public.parcel_predictions FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.parcel_predictions;
CREATE POLICY "Allow authenticated delete"
  ON public.parcel_predictions FOR DELETE TO authenticated
  USING (true);

-- Policies for sections config
DROP POLICY IF EXISTS "Allow authenticated select config" ON public.parcel_sections_config;
CREATE POLICY "Allow authenticated select config"
  ON public.parcel_sections_config FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert config" ON public.parcel_sections_config;
CREATE POLICY "Allow authenticated insert config"
  ON public.parcel_sections_config FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update config" ON public.parcel_sections_config;
CREATE POLICY "Allow authenticated update config"
  ON public.parcel_sections_config FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete config" ON public.parcel_sections_config;
CREATE POLICY "Allow authenticated delete config"
  ON public.parcel_sections_config FOR DELETE TO authenticated
  USING (true);

-- Enable realtime
alter publication supabase_realtime add table public.parcel_predictions;
alter publication supabase_realtime add table public.parcel_sections_config;
