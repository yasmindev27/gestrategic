-- Inserir registro de -2h17min para Yelly Silva em banco_horas
-- 2 horas e 17 minutos = 2.2833... horas

-- Primeiro, buscar o user_id de Yelly Silva
-- Depois, inserir o registro

-- Inserir registro de débito (horas negativas)
INSERT INTO public.banco_horas (
  funcionario_user_id,
  funcionario_nome,
  data,
  tipo,
  horas,
  motivo,
  observacao,
  status,
  registrado_por,
  aprovado_por,
  aprovado_em
)
SELECT
  u.id as funcionario_user_id,
  'Yelly Silva' as funcionario_nome,
  '2026-03-20'::date as data,
  'debito' as tipo,
  -2.2833 as horas,  -- -2h17min
  'Atraso em plantões' as motivo,
  'Saldo negativo de banco de horas' as observacao,
  'pendente' as status,
  u.id as registrado_por,
  NULL as aprovado_por,
  NULL as aprovado_em
FROM auth.users u
WHERE u.raw_user_meta_data->>'full_name' ILIKE '%Yelly%' OR u.email ILIKE '%yelly%'
LIMIT 1;

-- Query para verificar se foi inserido
SELECT 
  id,
  funcionario_nome,
  data,
  tipo,
  horas,
  motivo,
  status
FROM public.banco_horas
WHERE funcionario_nome = 'Yelly Silva'
ORDER BY data DESC
LIMIT 5;
