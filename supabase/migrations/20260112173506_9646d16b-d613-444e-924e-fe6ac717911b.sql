
-- Primeira migração: Adicionar novos roles ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recepcao';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'classificacao';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nir';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'faturamento';
