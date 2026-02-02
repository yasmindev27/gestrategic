-- Add new roles for quality module
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'qualidade';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nsp';