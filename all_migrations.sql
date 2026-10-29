-- ==========================================
-- MIGRATION: 20260509172219_a32c9888-9bb7-48b4-aeff-7985c0da02db.sql
-- ==========================================


-- ============ ENUMS ============
create type public.app_role as enum ('admin','executant');
create type public.parcel_type as enum ('olivier','nectarine','pommier','vide');
create type public.parcel_status as enum ('sain','alerte','intervention');
create type public.vitality as enum ('sain','replante','faible','mort','oublie');
create type public.module_kind as enum (
  'pulverisation','phytosanitaire','recolte',
  'analyse_sol','analyse_eau','irrigation','fertilisation'
);
create type public.alert_kind as enum ('fuite','tuyau','maladie','autre');
create type public.alert_status as enum ('ouvert','en_cours','resolu');

-- ============ TABLES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

create table public.parcels (
  id text primary key,
  name text not null,
  type public.parcel_type not null,
  status public.parcel_status not null default 'sain',
  rows_count int not null default 0,
  trees_per_row int not null default 0,
  position int not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.module_records (
  id uuid primary key default gen_random_uuid(),
  parcel_id text not null references public.parcels(id) on delete cascade,
  kind public.module_kind not null,
  payload jsonb not null default '{}'::jsonb,
  total_cost numeric(12,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_module_records_parcel_kind on public.module_records(parcel_id, kind, created_at desc);

create table public.trees (
  id uuid primary key default gen_random_uuid(),
  parcel_id text not null references public.parcels(id) on delete cascade,
  l int not null,
  p int not null,
  vitality public.vitality not null default 'sain',
  height_cm int,
  trunk_mm int,
  pollinator boolean not null default false,
  photo_urls text[] not null default '{}',
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(parcel_id, l, p)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  parcel_id text not null references public.parcels(id) on delete cascade,
  tree_id uuid references public.trees(id) on delete set null,
  kind public.alert_kind not null,
  message text,
  status public.alert_status not null default 'ouvert',
  l int,
  p int,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_alerts_status on public.alerts(status, created_at desc);

-- ============ SECURITY DEFINER ROLE FN ============
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- ============ AUTO-PROFILE TRIGGER ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  -- default role: executant
  insert into public.user_roles (user_id, role)
  values (new.id, 'executant');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ UPDATED_AT TRIGGER ============
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_parcels_updated before update on public.parcels
  for each row execute function public.touch_updated_at();
create trigger trg_trees_updated before update on public.trees
  for each row execute function public.touch_updated_at();

-- ============ ENABLE RLS ============
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.parcels enable row level security;
alter table public.module_records enable row level security;
alter table public.trees enable row level security;
alter table public.alerts enable row level security;

-- ============ POLICIES ============
-- profiles
create policy "profiles self read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin update" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- user_roles
create policy "roles self read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles admin write" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- parcels
create policy "parcels read auth" on public.parcels for select to authenticated using (true);
create policy "parcels admin write" on public.parcels for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- module_records
create policy "records read auth" on public.module_records for select to authenticated using (true);
create policy "records admin write" on public.module_records for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- trees
create policy "trees read auth" on public.trees for select to authenticated using (true);
create policy "trees admin write" on public.trees for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- alerts
create policy "alerts read auth" on public.alerts for select to authenticated using (true);
create policy "alerts insert auth" on public.alerts for insert to authenticated
  with check (created_by = auth.uid());
create policy "alerts admin update" on public.alerts for update to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "alerts admin delete" on public.alerts for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- ============ STORAGE BUCKET ============
insert into storage.buckets (id, name, public)
values ('parcel-photos', 'parcel-photos', true)
on conflict (id) do nothing;

create policy "parcel photos public read" on storage.objects for select
  using (bucket_id = 'parcel-photos');
create policy "parcel photos auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'parcel-photos');
create policy "parcel photos admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'parcel-photos' and public.has_role(auth.uid(),'admin'));


-- ==========================================
-- MIGRATION: 20260509172238_daabb880-9e46-4874-a383-9fbb89bfee16.sql
-- ==========================================


-- Fix function search_path
create or replace function public.touch_updated_at()
returns trigger language plpgsql security definer set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

-- Revoke public/anon execute on SECURITY DEFINER fns
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Tighten storage list policy: only authenticated can list/select
drop policy "parcel photos public read" on storage.objects;
create policy "parcel photos auth read" on storage.objects for select to authenticated
  using (bucket_id = 'parcel-photos');


-- ==========================================
-- MIGRATION: 20260509172256_7a2680e5-3ec7-487f-9bcb-6e71b8b46239.sql
-- ==========================================


update storage.buckets set public = false where id = 'parcel-photos';
revoke execute on function public.has_role(uuid, public.app_role) from authenticated;


-- ==========================================
-- MIGRATION: 20260509172345_297f31a1-9a94-41ce-bfe6-684ba772e5bd.sql
-- ==========================================


create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare _is_first boolean;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  select count(*) = 0 into _is_first from public.user_roles;
  insert into public.user_roles (user_id, role)
  values (new.id, case when _is_first then 'admin'::public.app_role else 'executant'::public.app_role end);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- ==========================================
-- MIGRATION: 20260509194113_937d2c5b-2f49-4ccd-812d-ca99a2848477.sql
-- ==========================================

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- ==========================================
-- MIGRATION: 20260511074201_a5ef7bd0-3407-48e6-9649-aab12dbaba1a.sql
-- ==========================================


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


-- ==========================================
-- MIGRATION: 20260511162455_48005068-8a24-4ac2-a6fb-2e85ee6e44fc.sql
-- ==========================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ingenieur';

-- ==========================================
-- MIGRATION: 20260511162515_922e82ab-111a-4034-862b-565fe9d6a7c0.sql
-- ==========================================

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

-- ==========================================
-- MIGRATION: 20260511173432_6ad7d7f8-e57b-4fce-b6d7-e956fce009a4.sql
-- ==========================================

ALTER TYPE public.reco_kind ADD VALUE IF NOT EXISTS 'irrigation';

-- ==========================================
-- MIGRATION: 20260512162308_7f806c43-ef8f-4762-93ec-2eb78f5d9b09.sql
-- ==========================================

DELETE FROM public.task_executions;
DELETE FROM public.tasks;
DELETE FROM public.module_records;
DELETE FROM public.alerts;
DELETE FROM public.recommendations;

-- ==========================================
-- MIGRATION: 20260512201826_a2a26791-c4b4-4305-915e-dcee6fed24e4.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 20260512211918_3fcb83c0-0883-4328-b22f-075136022f90.sql
-- ==========================================

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

-- ==========================================
-- MIGRATION: 20260530130552_a94af07c-3c9d-4ae4-b43c-2571024bb6de.sql
-- ==========================================


CREATE POLICY "records ingenieur insert"
ON public.module_records
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ingenieur'::app_role)
  AND created_by = auth.uid()
);

CREATE POLICY "records ingenieur update"
ON public.module_records
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'ingenieur'::app_role))
WITH CHECK (has_role(auth.uid(), 'ingenieur'::app_role));


-- ==========================================
-- MIGRATION: 20260611115900_auto_confirm_users.sql
-- ==========================================

-- Trigger pour confirmer automatiquement l'e-mail des nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.auto_confirm_new_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  NEW.confirmed_at = COALESCE(NEW.confirmed_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_new_users ON auth.users;

CREATE TRIGGER trg_auto_confirm_new_users
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_users();


-- ==========================================
-- MIGRATION: 20260612084700_make_admin.sql
-- ==========================================

-- Promouvoir les deux comptes fermemalek@gmail.com et agri@farmfriendy.local au rôle d'administrateur
DO $$
DECLARE
  _id_abdou uuid;
  _id_admin uuid;
BEGIN
  -- 1. Récupérer les ID pour les deux comptes
  SELECT id INTO _id_abdou FROM auth.users WHERE email = 'fermemalek@gmail.com';
  SELECT id INTO _id_admin FROM auth.users WHERE email = 'agri@farmfriendy.local';
  
  -- 2. Traitement pour Abdou (fermemalek@gmail.com)
  IF _id_abdou IS NOT NULL THEN
    -- Supprimer le rôle existant
    DELETE FROM public.user_roles WHERE user_id = _id_abdou;
    -- Assigner le rôle admin
    INSERT INTO public.user_roles (user_id, role) VALUES (_id_abdou, 'admin');
    -- S'assurer que le profil est mis à jour
    UPDATE public.profiles SET full_name = 'Abdou' WHERE id = _id_abdou;
  END IF;

  -- 3. Traitement pour Administrateur (agri@farmfriendy.local)
  IF _id_admin IS NOT NULL THEN
    -- Supprimer le rôle existant
    DELETE FROM public.user_roles WHERE user_id = _id_admin;
    -- Assigner le rôle admin
    INSERT INTO public.user_roles (user_id, role) VALUES (_id_admin, 'admin');
    -- S'assurer que le profil est mis à jour
    UPDATE public.profiles SET full_name = 'Administrateur' WHERE id = _id_admin;
  END IF;
END $$;


