
-- Vincular Renata Fernanda ao perfil Enfermagem
INSERT INTO public.usuario_perfil (user_id, perfil_id)
VALUES ('4cfa4a4d-7979-4cce-bd5c-f5aa0667bbad', '01a994dc-fb71-4ee2-ac62-d483f380af71')
ON CONFLICT DO NOTHING;

-- Dar acesso ao módulo Restaurante para perfis Enfermagem e Coordenador de Enfermagem
INSERT INTO public.permissoes_perfil (perfil_id, modulo_id, pode_visualizar, pode_acessar, comportamento_sem_acesso)
VALUES 
  ('01a994dc-fb71-4ee2-ac62-d483f380af71', 'e63ffa47-b331-41a6-ac7d-afa9b62e143a', true, true, 'desabilitar'),
  ('d6ae9d19-10b5-4ad2-9515-2be81ba14cf9', 'e63ffa47-b331-41a6-ac7d-afa9b62e143a', true, true, 'desabilitar')
ON CONFLICT DO NOTHING;
