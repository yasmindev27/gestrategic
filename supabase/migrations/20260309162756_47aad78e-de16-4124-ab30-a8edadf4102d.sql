
-- FIX 1: SECURITY INVOKER views
DROP VIEW IF EXISTS public.lms_quiz_perguntas_aluno;
CREATE VIEW public.lms_quiz_perguntas_aluno WITH (security_invoker = true) AS
SELECT id, treinamento_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, ordem, created_at FROM lms_quiz_perguntas;

DROP VIEW IF EXISTS public.escala_dia_view;
CREATE VIEW public.escala_dia_view WITH (security_invoker = true) AS
SELECT em.id, 'medico'::text AS tipo_profissional, ps.nome, ps.registro_profissional, ps.especialidade,
    em.data_plantao, em.hora_inicio, em.hora_fim, em.setor, em.tipo_plantao, em.status, em.observacoes,
    CASE WHEN em.data_plantao = CURRENT_DATE AND CURRENT_TIME >= em.hora_inicio::time with time zone AND CURRENT_TIME <= em.hora_fim::time with time zone THEN true ELSE false END AS de_plantao_agora
FROM escalas_medicos em JOIN profissionais_saude ps ON ps.id = em.profissional_id WHERE ps.status = 'ativo'::text
UNION ALL
SELECT ee.id, 'enfermagem'::text AS tipo_profissional, COALESCE(ps.nome, ee.profissional_nome) AS nome, ps.registro_profissional, ps.especialidade,
    ee.data_plantao, ee.hora_inicio, ee.hora_fim, ee.setor, ee.tipo_plantao, ee.status, ee.observacoes,
    CASE WHEN ee.data_plantao = CURRENT_DATE AND CURRENT_TIME >= ee.hora_inicio::time with time zone AND CURRENT_TIME <= ee.hora_fim::time with time zone THEN true ELSE false END AS de_plantao_agora
FROM enfermagem_escalas ee LEFT JOIN profissionais_saude ps ON ps.id = ee.profissional_saude_id WHERE ee.status = 'confirmado'::text;

-- FIX 2: Remove duplicate indexes
DROP INDEX IF EXISTS public.idx_atestados_data;
DROP INDEX IF EXISTS public.idx_atestados_funcionario;

-- FIX 3: Core indexes (only tables with verified columns)
CREATE INDEX IF NOT EXISTS idx_asos_colaborador ON public.asos_seguranca (colaborador_user_id);
CREATE INDEX IF NOT EXISTS idx_asos_data_exame ON public.asos_seguranca (data_exame);
CREATE INDEX IF NOT EXISTS idx_aval_desemp_data ON public.avaliacoes_desempenho (data_avaliacao);
CREATE INDEX IF NOT EXISTS idx_aval_exp_data ON public.avaliacoes_experiencia (data_avaliacao);
CREATE INDEX IF NOT EXISTS idx_chat_conversas_criado ON public.chat_conversas (criado_por);
CREATE INDEX IF NOT EXISTS idx_chat_moderacao_created ON public.chat_moderacao_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_disc_results_setor ON public.disc_results (setor);
CREATE INDEX IF NOT EXISTS idx_enf_trocas_hist_troca ON public.enfermagem_trocas_historico (troca_id);
CREATE INDEX IF NOT EXISTS idx_epis_usuario ON public.epis_seguranca (usuario_id);
CREATE INDEX IF NOT EXISTS idx_escala_tec_prof_escala ON public.escala_tec_enf_profissionais (escala_id);
CREATE INDEX IF NOT EXISTS idx_gerencia_nf_fornecedor ON public.gerencia_notas_fiscais (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_gerencia_planos_status ON public.gerencia_planos_acao (status);
CREATE INDEX IF NOT EXISTS idx_just_atraso_responsavel ON public.justificativas_atraso (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_just_extensao_colab ON public.justificativas_extensao_jornada (colaborador_user_id);
CREATE INDEX IF NOT EXISTS idx_just_extensao_status ON public.justificativas_extensao_jornada (status);
CREATE INDEX IF NOT EXISTS idx_logs_perm_user ON public.logs_permissoes (user_id);
CREATE INDEX IF NOT EXISTS idx_nir_reg_data ON public.nir_registros_producao (data);
CREATE INDEX IF NOT EXISTS idx_notif_seg_ronda ON public.notificacoes_seguranca (ronda_id);
CREATE INDEX IF NOT EXISTS idx_notif_seg_status ON public.notificacoes_seguranca (status);
CREATE INDEX IF NOT EXISTS idx_nsp_plans_indicator ON public.nsp_action_plans (indicator_id);
CREATE INDEX IF NOT EXISTS idx_nsp_ind_mes ON public.nsp_indicators (mes, ano);
CREATE INDEX IF NOT EXISTS idx_passagem_shift_date ON public.passagem_plantao (shift_date);
CREATE INDEX IF NOT EXISTS idx_passagem_pend_plantao ON public.passagem_plantao_pendencias (passagem_id);
CREATE INDEX IF NOT EXISTS idx_porta_ecg_month ON public.porta_ecg_atendimentos (competence_month, competence_year);
CREATE INDEX IF NOT EXISTS idx_rh_mov_data ON public.rh_movimentacoes_setor (data_mudanca);
CREATE INDEX IF NOT EXISTS idx_rh_ocorr_data ON public.rh_ocorrencias_disciplinares (data_ocorrencia);
CREATE INDEX IF NOT EXISTS idx_rondas_seg_data ON public.rondas_seguranca (data_ronda);
CREATE INDEX IF NOT EXISTS idx_sciras_anti_setor ON public.sciras_antimicrobianos (setor);
CREATE INDEX IF NOT EXISTS idx_sciras_cult_setor ON public.sciras_culturas (setor);
CREATE INDEX IF NOT EXISTS idx_solic_dieta_status ON public.solicitacoes_dieta (status);
CREATE INDEX IF NOT EXISTS idx_transf_solic_status ON public.transferencia_solicitacoes (status);
CREATE INDEX IF NOT EXISTS idx_uniformes_usuario ON public.uniformes_seguranca (usuario_id);
CREATE INDEX IF NOT EXISTS idx_upa_plans_indicator ON public.upa_action_plans (indicator_id);
CREATE INDEX IF NOT EXISTS idx_upa_ind_mes ON public.upa_indicators (mes, ano);
CREATE INDEX IF NOT EXISTS idx_vacinas_usuario ON public.vacinas_seguranca (usuario_id);
CREATE INDEX IF NOT EXISTS idx_seg_conflitos_created ON public.seg_patrimonial_conflitos (created_at);
CREATE INDEX IF NOT EXISTS idx_seg_danos_created ON public.seg_patrimonial_danos (created_at);
CREATE INDEX IF NOT EXISTS idx_seg_visitantes_created ON public.seg_patrimonial_visitantes (created_at);
