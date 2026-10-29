
-- 1. Énumérations
DO $$ BEGIN
  CREATE TYPE public.task_kind AS ENUM (
    'generale', 'irrigation', 'fertilisation', 'pulverisation',
    'maintenance', 'recolte', 'correction_anomalie'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('basse', 'normale', 'haute', 'urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM (
    'a_faire', 'en_cours', 'fait', 'rejete', 'annule'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.program_status AS ENUM (
    'planifie', 'en_cours', 'execute', 'annule'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'vue';
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'assignee';
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'validee';
ALTER TYPE public.alert_kind ADD VALUE IF NOT EXISTS 'casse';

-- 2. farm_id sur les tables existantes
ALTER TABLE public.parcels         ADD COLUMN IF NOT EXISTS farm_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.trees           ADD COLUMN IF NOT EXISTS farm_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.alerts          ADD COLUMN IF NOT EXISTS farm_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.module_records  ADD COLUMN IF NOT EXISTS farm_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- 3. module_records étendu
ALTER TABLE public.module_records
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS executed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS executed_by  uuid,
  ADD COLUMN IF NOT EXISTS assigned_to  uuid,
  ADD COLUMN IF NOT EXISTS status       public.program_status NOT NULL DEFAULT 'execute';

CREATE INDEX IF NOT EXISTS idx_module_records_assigned_to ON public.module_records(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_module_records_scheduled_at ON public.module_records(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_module_records_status ON public.module_records(status);

DROP POLICY IF EXISTS "records executant update assigned" ON public.module_records;
CREATE POLICY "records executant update assigned"
  ON public.module_records FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 4. alerts étendu
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS type        public.alert_kind,
  ADD COLUMN IF NOT EXISTS photo_urls  text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS comment     text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

UPDATE public.alerts SET type = kind WHERE type IS NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON public.alerts(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_parcel_id ON public.alerts(parcel_id);

DROP TRIGGER IF EXISTS alerts_touch_updated_at ON public.alerts;
CREATE TRIGGER alerts_touch_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "alerts executant update assigned" ON public.alerts;
CREATE POLICY "alerts executant update assigned"
  ON public.alerts FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 5. tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  parcel_id text REFERENCES public.parcels(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind public.task_kind NOT NULL DEFAULT 'generale',
  priority public.task_priority NOT NULL DEFAULT 'normale',
  status public.task_status NOT NULL DEFAULT 'a_faire',
  due_date timestamptz,
  assigned_to uuid,
  created_by uuid NOT NULL,
  linked_alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  recurrence jsonb,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parcel_id ON public.tasks(parcel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS tasks_touch_updated_at ON public.tasks;
CREATE TRIGGER tasks_touch_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "tasks read auth" ON public.tasks;
CREATE POLICY "tasks read auth" ON public.tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tasks admin insert" ON public.tasks;
CREATE POLICY "tasks admin insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

DROP POLICY IF EXISTS "tasks admin update" ON public.tasks;
CREATE POLICY "tasks admin update" ON public.tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "tasks admin delete" ON public.tasks;
CREATE POLICY "tasks admin delete" ON public.tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "tasks executant update assigned" ON public.tasks;
CREATE POLICY "tasks executant update assigned" ON public.tasks FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 6. task_executions
CREATE TABLE IF NOT EXISTS public.task_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  module_record_id uuid REFERENCES public.module_records(id) ON DELETE CASCADE,
  executed_by uuid NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  duration_min integer,
  actual_quantity numeric,
  actual_unit text,
  comment text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  weather_snapshot jsonb,
  rejected boolean NOT NULL DEFAULT false,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_executions_target CHECK (
    (task_id IS NOT NULL AND module_record_id IS NULL) OR
    (task_id IS NULL AND module_record_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON public.task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_module_record_id ON public.task_executions(module_record_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_executed_by ON public.task_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_task_executions_executed_at ON public.task_executions(executed_at DESC);

ALTER TABLE public.task_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "executions read auth" ON public.task_executions;
CREATE POLICY "executions read auth" ON public.task_executions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "executions insert own" ON public.task_executions;
CREATE POLICY "executions insert own" ON public.task_executions FOR INSERT TO authenticated
  WITH CHECK (executed_by = auth.uid());

DROP POLICY IF EXISTS "executions admin update" ON public.task_executions;
CREATE POLICY "executions admin update" ON public.task_executions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "executions admin delete" ON public.task_executions;
CREATE POLICY "executions admin delete" ON public.task_executions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.task_executions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.module_records; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_executions REPLICA IDENTITY FULL;
ALTER TABLE public.module_records REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;

-- 8. Storage policies sur parcel-photos
DROP POLICY IF EXISTS "parcel-photos read auth" ON storage.objects;
CREATE POLICY "parcel-photos read auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'parcel-photos');

DROP POLICY IF EXISTS "parcel-photos insert own folder" ON storage.objects;
CREATE POLICY "parcel-photos insert own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'parcel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "parcel-photos update own" ON storage.objects;
CREATE POLICY "parcel-photos update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'parcel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "parcel-photos delete own" ON storage.objects;
CREATE POLICY "parcel-photos delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'parcel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
