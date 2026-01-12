
-- Remover view com security definer e criar versão segura
DROP VIEW IF EXISTS public.prontuarios_status;

-- Criar função security invoker para consultar status
CREATE OR REPLACE FUNCTION public.get_prontuario_status(p_prontuario_id uuid)
RETURNS TABLE (
    id uuid,
    numero_prontuario text,
    paciente_nome text,
    prontuario_status text,
    fluxo_status text,
    avaliacao_status text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT 
        p.id,
        p.numero_prontuario,
        p.paciente_nome,
        p.status as prontuario_status,
        sp.status as fluxo_status,
        CASE 
            WHEN ap.id IS NOT NULL AND ap.is_finalizada = true THEN 'avaliado'
            WHEN ap.id IS NOT NULL THEN 'em_avaliacao'
            ELSE 'pendente'
        END as avaliacao_status
    FROM public.prontuarios p
    LEFT JOIN public.saida_prontuarios sp ON sp.prontuario_id = p.id
    LEFT JOIN public.avaliacoes_prontuarios ap ON ap.prontuario_id = p.id
    WHERE p.id = p_prontuario_id;
$$;
