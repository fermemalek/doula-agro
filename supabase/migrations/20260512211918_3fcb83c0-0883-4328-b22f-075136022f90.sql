ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS source_role public.app_role;

-- Backfill: any existing alert created by a non-admin is treated as 'executant',
-- alerts created by an admin remain NULL (so they don't pollute the executant feed).
UPDATE public.alerts a
SET source_role = 'executant'::public.app_role
WHERE source_role IS NULL
  AND a.created_by IS NOT NULL
  AND NOT public.has_role(a.created_by, 'admin'::public.app_role);

CREATE INDEX IF NOT EXISTS idx_alerts_source_role ON public.alerts(source_role);