
update storage.buckets set public = false where id = 'parcel-photos';
revoke execute on function public.has_role(uuid, public.app_role) from authenticated;
