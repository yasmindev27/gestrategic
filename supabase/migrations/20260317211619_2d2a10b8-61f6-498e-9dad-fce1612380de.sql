
-- Atualizar a função trigger para usar URL e chave diretamente
CREATE OR REPLACE FUNCTION public.trigger_replicar_externo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_payload jsonb;
    v_url text := 'https://lypkliuanenevghglxcq.supabase.co';
    v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cGtsaXVhbmVuZXZnaGdseGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzA5NzIsImV4cCI6MjA4MzgwNjk3Mn0.dCfjm7FjjS3_pyKvxVEE0Xq-8qBqW4FLYB4WR8f8Kz8';
BEGIN
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
