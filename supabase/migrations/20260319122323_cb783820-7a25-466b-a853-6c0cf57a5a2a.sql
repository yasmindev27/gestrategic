-- ==============================================
-- OTIMIZAÇÃO DE BANCO DE DADOS - ÍNDICES FALTANTES
-- ==============================================

-- 1. gestor_setores: 134K seq scans
CREATE INDEX IF NOT EXISTS idx_gestor_setores_gestor ON public.gestor_setores (gestor_user_id);
CREATE INDEX IF NOT EXISTS idx_gestor_setores_setor ON public.gestor_setores (setor_id);

-- 2. gestor_cargos: 133K seq scans
CREATE INDEX IF NOT EXISTS idx_gestor_cargos_gestor ON public.gestor_cargos (gestor_user_id);
CREATE INDEX IF NOT EXISTS idx_gestor_cargos_cargo ON public.gestor_cargos (cargo_id);

-- 3. passagem_plantao_pendencias: 102K seq scans
CREATE INDEX IF NOT EXISTS idx_pp_pendencias_plantao ON public.passagem_plantao_pendencias (passagem_id);
CREATE INDEX IF NOT EXISTS idx_pp_pendencias_status ON public.passagem_plantao_pendencias (status);
CREATE INDEX IF NOT EXISTS idx_pp_pendencias_destinatario ON public.passagem_plantao_pendencias (destinatario_id);

-- 4. notificacoes_pendencias: 102K seq scans
CREATE INDEX IF NOT EXISTS idx_notif_pendencias_destinatario ON public.notificacoes_pendencias (destinatario_id);
CREATE INDEX IF NOT EXISTS idx_notif_pendencias_lida ON public.notificacoes_pendencias (lida);

-- 5. chat_participantes: 22K seq scans
CREATE INDEX IF NOT EXISTS idx_chat_participantes_user ON public.chat_participantes (user_id);

-- 6. nir_colaboradores: ZERO índices não-PK
CREATE INDEX IF NOT EXISTS idx_nir_colaboradores_nome ON public.nir_colaboradores (nome);
CREATE INDEX IF NOT EXISTS idx_nir_colaboradores_ativo ON public.nir_colaboradores (ativo);

-- 7. chamados_materiais: sem índices não-PK
CREATE INDEX IF NOT EXISTS idx_chamados_materiais_chamado ON public.chamados_materiais (chamado_id);
CREATE INDEX IF NOT EXISTS idx_chamados_materiais_produto ON public.chamados_materiais (produto_id);

-- 8. lms_inscricoes: 4.8K seq scans
CREATE INDEX IF NOT EXISTS idx_lms_inscricoes_usuario ON public.lms_inscricoes (usuario_id);
CREATE INDEX IF NOT EXISTS idx_lms_inscricoes_treinamento ON public.lms_inscricoes (treinamento_id);

-- 9. solicitacoes_dieta: 3.8K seq scans
CREATE INDEX IF NOT EXISTS idx_solicitacoes_dieta_data ON public.solicitacoes_dieta (data_inicio);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_dieta_status ON public.solicitacoes_dieta (status);

-- 10. colaboradores_restaurante: sem índice em matricula (usado pelo totem)
CREATE INDEX IF NOT EXISTS idx_colab_restaurante_matricula ON public.colaboradores_restaurante (matricula);

-- 11. nir_registros_producao
CREATE INDEX IF NOT EXISTS idx_nir_registros_colaborador ON public.nir_registros_producao (colaborador);
CREATE INDEX IF NOT EXISTS idx_nir_registros_data ON public.nir_registros_producao (data);

-- 12. Tabelas SCIRAS/arboviroses
CREATE INDEX IF NOT EXISTS idx_notif_arboviroses_data ON public.notificacoes_arboviroses (data_notificacao);
CREATE INDEX IF NOT EXISTS idx_sciras_notif_data ON public.sciras_notificacoes_epidemiologicas (data_notificacao);
CREATE INDEX IF NOT EXISTS idx_sciras_iras_data ON public.sciras_vigilancia_iras (data_infeccao);
CREATE INDEX IF NOT EXISTS idx_reunioes_created ON public.reunioes (created_at);

-- 13. ANALYZE nas tabelas mais acessadas
ANALYZE public.saida_prontuarios;
ANALYZE public.avaliacoes_prontuarios;
ANALYZE public.user_roles;
ANALYZE public.profiles;
ANALYZE public.gestor_setores;
ANALYZE public.gestor_cargos;
ANALYZE public.passagem_plantao_pendencias;
ANALYZE public.notificacoes_pendencias;