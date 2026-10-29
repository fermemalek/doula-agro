-- Add new kind values to the module_kind enum for Taille and Amendement modules
ALTER TYPE public.module_kind ADD VALUE IF NOT EXISTS 'taille';
ALTER TYPE public.module_kind ADD VALUE IF NOT EXISTS 'amendement';
