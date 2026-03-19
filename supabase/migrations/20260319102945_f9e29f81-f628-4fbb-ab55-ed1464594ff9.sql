-- Add new role values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente_administrativo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'farmaceutico_rt';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador_medico';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor_operacional';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador_enfermagem';

-- Create perfis_sistema entries for roles that don't exist yet
INSERT INTO public.perfis_sistema (nome, descricao, cor, is_master)
VALUES 
  ('Gerente Administrativo', 'Gestão administrativa com acesso a RH/DP, Faturamento, Gerência e dashboards estratégicos', '#1d4ed8', false),
  ('Farmacêutico RT', 'Responsável Técnico farmacêutico com acesso a medicações, qualidade e protocolos clínicos', '#16a34a', false),
  ('Supervisor de Serviços Operacionais', 'Supervisão de serviços operacionais: Manutenção, Rouparia, Restaurante e Segurança Patrimonial', '#d97706', false)
ON CONFLICT DO NOTHING;