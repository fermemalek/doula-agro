
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
