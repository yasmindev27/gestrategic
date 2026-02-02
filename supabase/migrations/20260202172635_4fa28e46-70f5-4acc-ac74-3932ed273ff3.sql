-- Add new role for social assistance (separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'assistencia_social';