
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
