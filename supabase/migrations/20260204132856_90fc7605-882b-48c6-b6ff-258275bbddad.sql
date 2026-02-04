-- Recriar a view sem SECURITY DEFINER (usar SECURITY INVOKER que é o padrão)
DROP VIEW IF EXISTS public.escala_dia_view;

CREATE VIEW public.escala_dia_view 
WITH (security_invoker = on)
AS
SELECT 
    em.id,
    'medico' as tipo_profissional,
    ps.nome,
    ps.registro_profissional,
    ps.especialidade,
    em.data_plantao,
    em.hora_inicio,
    em.hora_fim,
    em.setor,
    em.tipo_plantao,
    em.status,
    em.observacoes,
    CASE 
        WHEN em.data_plantao = CURRENT_DATE 
             AND CURRENT_TIME BETWEEN em.hora_inicio AND em.hora_fim 
        THEN true 
        ELSE false 
    END as de_plantao_agora
FROM public.escalas_medicos em
JOIN public.profissionais_saude ps ON ps.id = em.profissional_id
WHERE ps.status = 'ativo'

UNION ALL

SELECT 
    ee.id,
    'enfermagem' as tipo_profissional,
    COALESCE(ps.nome, ee.profissional_nome) as nome,
    ps.registro_profissional,
    ps.especialidade,
    ee.data_plantao,
    ee.hora_inicio::TIME,
    ee.hora_fim::TIME,
    ee.setor,
    ee.tipo_plantao,
    ee.status,
    ee.observacoes,
    CASE 
        WHEN ee.data_plantao = CURRENT_DATE 
             AND CURRENT_TIME BETWEEN ee.hora_inicio::TIME AND ee.hora_fim::TIME 
        THEN true 
        ELSE false 
    END as de_plantao_agora
FROM public.enfermagem_escalas ee
LEFT JOIN public.profissionais_saude ps ON ps.id = ee.profissional_saude_id
WHERE ee.status = 'confirmado';