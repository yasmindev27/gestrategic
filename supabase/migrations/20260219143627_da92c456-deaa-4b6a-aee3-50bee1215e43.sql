
-- Criar perfil Segurança do Trabalho
INSERT INTO public.perfis_sistema (nome, descricao, is_master)
VALUES ('Segurança do Trabalho', 'Perfil para profissionais de Segurança do Trabalho', false);

-- Dar acesso aos módulos básicos + segurança do trabalho
INSERT INTO public.permissoes_perfil (perfil_id, modulo_id, pode_visualizar, pode_acessar, comportamento_sem_acesso)
SELECT 
  ps.id,
  m.id,
  true,
  true,
  'ocultar'
FROM perfis_sistema ps
CROSS JOIN modulos_sistema m
WHERE ps.nome = 'Segurança do Trabalho'
AND m.codigo IN ('dashboard', 'agenda', 'seguranca-trabalho', 'chat', 'equipe');

-- Vincular Daniela ao novo perfil
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT 
  'ef33219d-9dab-4d1e-9008-398ef0e6eeb1'::uuid,
  id
FROM perfis_sistema
WHERE nome = 'Segurança do Trabalho';
