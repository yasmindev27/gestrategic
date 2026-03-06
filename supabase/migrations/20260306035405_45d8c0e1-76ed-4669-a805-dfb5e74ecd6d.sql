
-- OTIMIZAÇÃO BANCO DE DADOS - ÍNDICES FINAIS

-- saida_prontuarios (37K rows)
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_prontuario_id ON public.saida_prontuarios(prontuario_id);
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_status ON public.saida_prontuarios(status);
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_created_at ON public.saida_prontuarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_status_data ON public.saida_prontuarios(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_data_atend ON public.saida_prontuarios(data_atendimento DESC);

-- avaliacoes_prontuarios (23K rows)
CREATE INDEX IF NOT EXISTS idx_avaliacoes_prontuarios_prontuario_id ON public.avaliacoes_prontuarios(prontuario_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_prontuarios_status ON public.avaliacoes_prontuarios(status);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_prontuarios_avaliador ON public.avaliacoes_prontuarios(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_prontuarios_finalizada ON public.avaliacoes_prontuarios(is_finalizada);

-- logs_acesso (22K rows)
CREATE INDEX IF NOT EXISTS idx_logs_acesso_user_id ON public.logs_acesso(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_modulo ON public.logs_acesso(modulo);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_acao ON public.logs_acesso(acao);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_user_created ON public.logs_acesso(user_id, created_at DESC);

-- refeicoes_registros (5K rows)
CREATE INDEX IF NOT EXISTS idx_refeicoes_registros_user ON public.refeicoes_registros(colaborador_user_id);
CREATE INDEX IF NOT EXISTS idx_refeicoes_registros_data ON public.refeicoes_registros(data_registro);
CREATE INDEX IF NOT EXISTS idx_refeicoes_registros_tipo ON public.refeicoes_registros(tipo_refeicao);

-- entregas_prontuarios_itens (2K rows)
CREATE INDEX IF NOT EXISTS idx_entregas_itens_entrega ON public.entregas_prontuarios_itens(entrega_id);
CREATE INDEX IF NOT EXISTS idx_entregas_itens_saida ON public.entregas_prontuarios_itens(saida_prontuario_id);

-- escala_tec_enf_dias (1.6K rows)
CREATE INDEX IF NOT EXISTS idx_escala_tec_enf_dias_profissional ON public.escala_tec_enf_dias(profissional_id);
CREATE INDEX IF NOT EXISTS idx_escala_tec_enf_dias_dia ON public.escala_tec_enf_dias(dia);

-- rouparia_movimentacoes
CREATE INDEX IF NOT EXISTS idx_rouparia_mov_item ON public.rouparia_movimentacoes(item_id);
CREATE INDEX IF NOT EXISTS idx_rouparia_mov_tipo ON public.rouparia_movimentacoes(tipo_movimentacao);

-- prontuarios
CREATE INDEX IF NOT EXISTS idx_prontuarios_numero ON public.prontuarios(numero_prontuario);
CREATE INDEX IF NOT EXISTS idx_prontuarios_status ON public.prontuarios(status);

-- chamados FK
CREATE INDEX IF NOT EXISTS idx_chamados_comentarios_chamado ON public.chamados_comentarios(chamado_id);
CREATE INDEX IF NOT EXISTS idx_chamados_materiais_chamado ON public.chamados_materiais(chamado_id);

-- chat (realtime)
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_conversa ON public.chat_mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_created ON public.chat_mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participantes_user ON public.chat_participantes(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participantes_conversa ON public.chat_participantes(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_lidas_user ON public.chat_mensagens_lidas(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_lidas_msg ON public.chat_mensagens_lidas(mensagem_id);

-- enfermagem_escalas
CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_profissional ON public.enfermagem_escalas(profissional_id);
CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_data ON public.enfermagem_escalas(data_plantao);
CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_setor ON public.enfermagem_escalas(setor);

-- profissionais_saude
CREATE INDEX IF NOT EXISTS idx_profissionais_saude_nome ON public.profissionais_saude(nome);
CREATE INDEX IF NOT EXISTS idx_profissionais_saude_tipo ON public.profissionais_saude(tipo);

-- atestados
CREATE INDEX IF NOT EXISTS idx_atestados_funcionario ON public.atestados(funcionario_user_id);
CREATE INDEX IF NOT EXISTS idx_atestados_status ON public.atestados(status);

-- justificativas_ponto
CREATE INDEX IF NOT EXISTS idx_justificativas_ponto_user ON public.justificativas_ponto(colaborador_user_id);
CREATE INDEX IF NOT EXISTS idx_justificativas_ponto_status ON public.justificativas_ponto(status);

-- banco_horas
CREATE INDEX IF NOT EXISTS idx_banco_horas_funcionario ON public.banco_horas(funcionario_user_id);
CREATE INDEX IF NOT EXISTS idx_banco_horas_status ON public.banco_horas(status);

-- notificacoes
CREATE INDEX IF NOT EXISTS idx_notificacoes_pendencias_dest ON public.notificacoes_pendencias(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_pendencias_lida ON public.notificacoes_pendencias(lida);

-- protocolos
CREATE INDEX IF NOT EXISTS idx_protocolo_atend_tipo ON public.protocolo_atendimentos(tipo_protocolo);
CREATE INDEX IF NOT EXISTS idx_protocolo_atend_created ON public.protocolo_atendimentos(created_at DESC);

-- escalas_medicos
CREATE INDEX IF NOT EXISTS idx_escalas_medicos_prof ON public.escalas_medicos(profissional_id);
CREATE INDEX IF NOT EXISTS idx_escalas_medicos_data ON public.escalas_medicos(data_plantao);

-- user_roles (crítico para RLS)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);

-- bed_records
CREATE INDEX IF NOT EXISTS idx_bed_records_sector_shift ON public.bed_records(sector, shift_date, shift_type)
