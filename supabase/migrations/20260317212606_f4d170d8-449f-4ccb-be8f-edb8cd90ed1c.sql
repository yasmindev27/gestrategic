
-- Trigger: replicar notificações da Segurança do Trabalho para incidentes_nsp (Qualidade)
CREATE OR REPLACE FUNCTION public.replicar_notificacao_para_nsp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_classificacao text;
BEGIN
    -- Mapear prioridade para classificação de risco
    v_classificacao := CASE NEW.prioridade
        WHEN 'critica' THEN 'Evento Adverso Grave'
        WHEN 'alta' THEN 'Evento Adverso'
        WHEN 'media' THEN 'Incidente sem dano'
        WHEN 'baixa' THEN 'Near miss'
        ELSE 'Incidente sem dano'
    END;

    INSERT INTO public.incidentes_nsp (
        tipo_incidente,
        classificacao_risco,
        descricao,
        setor,
        local_ocorrencia,
        data_ocorrencia,
        status,
        notificador_nome,
        notificacao_anonima,
        paciente_envolvido,
        setor_origem,
        categoria_operacional,
        observacoes
    ) VALUES (
        'Segurança do Trabalho - ' || NEW.tipo_notificacao,
        v_classificacao,
        NEW.descricao,
        NEW.setor,
        NEW.setor,
        CURRENT_DATE::text,
        'aberto',
        COALESCE(NEW.responsavel_notificado, 'Segurança do Trabalho'),
        false,
        false,
        'Segurança do Trabalho',
        'Segurança do Trabalho',
        'Gerado automaticamente a partir da notificação de Segurança do Trabalho (ID: ' || NEW.id || ')'
    );

    RETURN NEW;
END;
$$;

-- Criar trigger na tabela de notificações
DROP TRIGGER IF EXISTS trg_notificacao_para_nsp ON public.notificacoes_seguranca;
CREATE TRIGGER trg_notificacao_para_nsp
AFTER INSERT ON public.notificacoes_seguranca
FOR EACH ROW EXECUTE FUNCTION public.replicar_notificacao_para_nsp();
