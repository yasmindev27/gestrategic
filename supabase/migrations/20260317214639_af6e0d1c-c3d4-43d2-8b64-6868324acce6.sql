DROP TRIGGER IF EXISTS trg_replicar_assistencia_social_pacientes ON public.assistencia_social_pacientes;
DROP TRIGGER IF EXISTS trg_replicar_assistencia_social_atendimentos ON public.assistencia_social_atendimentos;
DROP TRIGGER IF EXISTS trg_replicar_prontuarios ON public.prontuarios;
DROP TRIGGER IF EXISTS trg_replicar_avaliacoes_prontuarios ON public.avaliacoes_prontuarios;
DROP TRIGGER IF EXISTS trg_replicar_logs_acesso ON public.logs_acesso;
DROP TRIGGER IF EXISTS trg_replicar_chamados ON public.chamados;
DROP TRIGGER IF EXISTS trg_replicar_incidentes_nsp ON public.incidentes_nsp;
DROP TRIGGER IF EXISTS trg_replicar_logs_permissoes ON public.logs_permissoes;
DROP FUNCTION IF EXISTS public.trigger_replicar_externo();