-- Seed static parcels data to prevent foreign key errors when inserting alerts or tasks
INSERT INTO public.parcels (id, name, type, status, position, farm_id)
VALUES
  ('p1', 'OLIVIER P1', 'olivier'::public.parcel_type, 'sain'::public.parcel_status, 1, '00000000-0000-0000-0000-000000000001'),
  ('p2', 'OLIVIER P2', 'olivier'::public.parcel_type, 'sain'::public.parcel_status, 2, '00000000-0000-0000-0000-000000000001'),
  ('p3', 'OLIVIER P3', 'olivier'::public.parcel_type, 'sain'::public.parcel_status, 3, '00000000-0000-0000-0000-000000000001'),
  ('p4', 'OLIVIER P4', 'olivier'::public.parcel_type, 'sain'::public.parcel_status, 4, '00000000-0000-0000-0000-000000000001'),
  ('nablara', 'NABLARA', 'nectarine'::public.parcel_type, 'sain'::public.parcel_status, 5, '00000000-0000-0000-0000-000000000001'),
  ('redix25', 'REDIX® 25', 'nectarine'::public.parcel_type, 'sain'::public.parcel_status, 6, '00000000-0000-0000-0000-000000000001'),
  ('pommier1', 'POMMIER 1', 'pommier'::public.parcel_type, 'sain'::public.parcel_status, 7, '00000000-0000-0000-0000-000000000001'),
  ('pommier2', 'POMMIER 2', 'pommier'::public.parcel_type, 'sain'::public.parcel_status, 8, '00000000-0000-0000-0000-000000000001'),
  ('p9', 'P9', 'vide'::public.parcel_type, 'sain'::public.parcel_status, 9, '00000000-0000-0000-0000-000000000001'),
  ('p10', 'P10', 'vide'::public.parcel_type, 'sain'::public.parcel_status, 10, '00000000-0000-0000-0000-000000000001'),
  ('p11', 'P11', 'vide'::public.parcel_type, 'sain'::public.parcel_status, 11, '00000000-0000-0000-0000-000000000001'),
  ('p12', 'P12', 'vide'::public.parcel_type, 'sain'::public.parcel_status, 12, '00000000-0000-0000-0000-000000000001'),
  ('brisevent', 'CASUARINA BRISE VENT', 'vide'::public.parcel_type, 'sain'::public.parcel_status, 13, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  position = EXCLUDED.position;
