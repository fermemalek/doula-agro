
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
