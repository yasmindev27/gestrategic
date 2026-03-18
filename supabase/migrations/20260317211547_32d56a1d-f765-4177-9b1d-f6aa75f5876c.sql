
-- 1. Tabela de fila de retry para replicação
CREATE TABLE IF NOT EXISTS public.replicacao_fila (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela text NOT NULL,
    operacao text NOT NULL,
    payload jsonb,
    erro text,
    tentativas integer DEFAULT 0,
    status text DEFAULT 'pendente',
    created_at timestamptz DEFAULT now(),
    processado_em timestamptz
);

-- Índice para buscar pendentes rapidamente
CREATE INDEX idx_replicacao_fila_status ON public.replicacao_fila(status) WHERE status = 'pendente';

-- RLS: somente service_role acessa
ALTER TABLE public.replicacao_fila ENABLE ROW LEVEL SECURITY;

-- 2. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3. Função genérica de trigger para replicação em tempo real
CREATE OR REPLACE FUNCTION public.trigger_replicar_externo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_payload jsonb;
    v_url text;
    v_anon_key text;
BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
    v_anon_key := current_setting('app.settings.supabase_anon_key', true);

    -- Montar payload
    v_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'type', TG_OP,
        'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
        'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
    );

    -- Disparar HTTP POST assíncrono via pg_net
    PERFORM extensions.http_post(
        url := v_url || '/functions/v1/replicar-externo',
        body := v_payload,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
        )
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- 4. Criar triggers nas tabelas prioritárias

-- Atendimentos (assistência social)
DROP TRIGGER IF EXISTS trg_replicar_assistencia_social_atendimentos ON public.assistencia_social_atendimentos;
CREATE TRIGGER trg_replicar_assistencia_social_atendimentos
AFTER INSERT OR UPDATE OR DELETE ON public.assistencia_social_atendimentos
FOR EACH ROW EXECUTE FUNCTION public.trigger_replicar_externo();

-- Pacientes (assistência social)
DROP TRIGGER IF EXISTS trg_replicar_assistencia_social_pacientes ON public.assistencia_social_pacientes;
CREATE TRIGGER trg_replicar_assistencia_social_pacientes
AFTER INSERT OR UPDATE OR DELETE ON public.assistencia_social_pacientes
FOR EACH ROW EXECUTE FUNCTION public.trigger_replicar_externo();

-- Prontuários (triagem/atendimento)
DROP TRIGGER IF EXISTS trg_replicar_prontuarios ON public.prontuarios;
CREATE TRIGGER trg_replicar_prontuarios
AFTER INSERT OR UPDATE OR DELETE ON public.prontuarios
FOR EACH ROW EXECUTE FUNCTION public.trigger_replicar_externo();

-- Avaliações de prontuários (triagem)
DROP TRIGGER IF EXISTS trg_replicar_avaliacoes_prontuarios ON public.avaliacoes_prontuarios;
CREATE TRIGGER trg_replicar_avaliacoes_prontuarios
AFTER INSERT OR UPDATE OR DELETE ON public.avaliacoes_prontuarios
FOR EACH ROW EXECUTE FUNCTION public.trigger_replicar_externo();

-- Logs de acesso (auditoria)
DROP TRIGGER IF EXISTS trg_replicar_logs_acesso ON public.logs_acesso;
CREATE TRIGGER trg_replicar_logs_acesso
AFTER INSERT ON public.logs_acesso
FOR EACH ROW EXECUTE FUNCTION public.trigger_replicar_externo();

-- Logs de permissões (auditoria)
DROP TRIGGER IF EXISTS trg_replicar_logs_permissoes ON public.logs_permissoes;
CREATE TRIGGER trg_replicar_logs_permissoes
AFTER INSERT ON public.logs_permissoes
FOR EACH ROW EXECUTE FUNCTION public.trigger_replicar_externo();

-- Incidentes NSP (qualidade/segurança)
DROP TRIGGER IF EXISTS trg_replicar_incidentes_nsp ON public.incidentes_nsp;
CREATE TRIGGER trg_replicar_incidentes_nsp
AFTER INSERT OR UPDATE OR DELETE ON public.incidentes_nsp
FOR EACH ROW EXECUTE FUNCTION public.trigger_replicar_externo();

-- Chamados
DROP TRIGGER IF EXISTS trg_replicar_chamados ON public.chamados;
CREATE TRIGGER trg_replicar_chamados
AFTER INSERT OR UPDATE OR DELETE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.trigger_replicar_externo();
