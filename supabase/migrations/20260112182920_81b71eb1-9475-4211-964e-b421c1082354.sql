-- Add new roles to the enum (separate migration)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ti';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manutencao';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'engenharia_clinica';