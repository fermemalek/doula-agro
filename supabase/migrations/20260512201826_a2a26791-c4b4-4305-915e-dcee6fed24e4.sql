-- Table de journal des conflits (écrasements LWW)
CREATE TABLE IF NOT EXISTS public.conflict_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  base_updated_at timestamptz,
  server_updated_at timestamptz,
  previous_value jsonb,
  new_value jsonb,
  overwritten_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conflict_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conflict_log read auth"
ON public.conflict_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "conflict_log insert auth"
ON public.conflict_log FOR INSERT
TO authenticated
WITH CHECK (overwritten_by = auth.uid() OR overwritten_by IS NULL);

CREATE POLICY "conflict_log admin delete"
ON public.conflict_log FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS conflict_log_created_at_idx
  ON public.conflict_log (created_at DESC);
CREATE INDEX IF NOT EXISTS conflict_log_table_record_idx
  ON public.conflict_log (table_name, record_id);
