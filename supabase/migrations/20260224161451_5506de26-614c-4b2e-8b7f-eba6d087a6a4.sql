-- Ativar Realtime nas tabelas críticas para sincronização entre módulos
ALTER PUBLICATION supabase_realtime ADD TABLE public.refeicoes_registros;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bed_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enfermagem_escalas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidentes_nsp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_statistics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prontuarios;