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
