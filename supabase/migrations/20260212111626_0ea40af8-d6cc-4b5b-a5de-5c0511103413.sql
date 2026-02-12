-- Fix all NO ACTION foreign keys to auth.users → SET NULL to allow user deletion

-- achados_auditoria
ALTER TABLE public.achados_auditoria DROP CONSTRAINT achados_auditoria_registrado_por_fkey;
ALTER TABLE public.achados_auditoria ALTER COLUMN registrado_por DROP NOT NULL;
ALTER TABLE public.achados_auditoria ADD CONSTRAINT achados_auditoria_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

-- acoes_incidentes
ALTER TABLE public.acoes_incidentes DROP CONSTRAINT acoes_incidentes_responsavel_id_fkey;
ALTER TABLE public.acoes_incidentes ADD CONSTRAINT acoes_incidentes_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.acoes_incidentes DROP CONSTRAINT acoes_incidentes_registrado_por_fkey;
ALTER TABLE public.acoes_incidentes ALTER COLUMN registrado_por DROP NOT NULL;
ALTER TABLE public.acoes_incidentes ADD CONSTRAINT acoes_incidentes_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

-- analises_incidentes
ALTER TABLE public.analises_incidentes DROP CONSTRAINT analises_incidentes_analisado_por_fkey;
ALTER TABLE public.analises_incidentes ALTER COLUMN analisado_por DROP NOT NULL;
ALTER TABLE public.analises_incidentes ADD CONSTRAINT analises_incidentes_analisado_por_fkey FOREIGN KEY (analisado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

-- assistencia_social_atendimentos
ALTER TABLE public.assistencia_social_atendimentos DROP CONSTRAINT assistencia_social_atendimentos_profissional_id_fkey;
ALTER TABLE public.assistencia_social_atendimentos ALTER COLUMN profissional_id DROP NOT NULL;
ALTER TABLE public.assistencia_social_atendimentos ADD CONSTRAINT assistencia_social_atendimentos_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- assistencia_social_documentos
ALTER TABLE public.assistencia_social_documentos DROP CONSTRAINT assistencia_social_documentos_uploaded_by_fkey;
ALTER TABLE public.assistencia_social_documentos ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.assistencia_social_documentos ADD CONSTRAINT assistencia_social_documentos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- assistencia_social_encaminhamentos
ALTER TABLE public.assistencia_social_encaminhamentos DROP CONSTRAINT assistencia_social_encaminhamentos_registrado_por_fkey;
ALTER TABLE public.assistencia_social_encaminhamentos ALTER COLUMN registrado_por DROP NOT NULL;
ALTER TABLE public.assistencia_social_encaminhamentos ADD CONSTRAINT assistencia_social_encaminhamentos_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

-- assistencia_social_pacientes
ALTER TABLE public.assistencia_social_pacientes DROP CONSTRAINT assistencia_social_pacientes_created_by_fkey;
ALTER TABLE public.assistencia_social_pacientes ADD CONSTRAINT assistencia_social_pacientes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- auditorias_qualidade
ALTER TABLE public.auditorias_qualidade DROP CONSTRAINT auditorias_qualidade_created_by_fkey;
ALTER TABLE public.auditorias_qualidade ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.auditorias_qualidade ADD CONSTRAINT auditorias_qualidade_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- avaliacoes_historico
ALTER TABLE public.avaliacoes_historico DROP CONSTRAINT avaliacoes_historico_executado_por_fkey;
ALTER TABLE public.avaliacoes_historico ADD CONSTRAINT avaliacoes_historico_executado_por_fkey FOREIGN KEY (executado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

-- avaliacoes_prontuarios
ALTER TABLE public.avaliacoes_prontuarios DROP CONSTRAINT avaliacoes_prontuarios_avaliador_id_fkey;
ALTER TABLE public.avaliacoes_prontuarios ALTER COLUMN avaliador_id DROP NOT NULL;
ALTER TABLE public.avaliacoes_prontuarios ADD CONSTRAINT avaliacoes_prontuarios_avaliador_id_fkey FOREIGN KEY (avaliador_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- cadastros_inconsistentes
ALTER TABLE public.cadastros_inconsistentes DROP CONSTRAINT cadastros_inconsistentes_resolvido_por_fkey;
ALTER TABLE public.cadastros_inconsistentes ADD CONSTRAINT cadastros_inconsistentes_resolvido_por_fkey FOREIGN KEY (resolvido_por) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.cadastros_inconsistentes DROP CONSTRAINT cadastros_inconsistentes_registrado_por_fkey;
ALTER TABLE public.cadastros_inconsistentes ADD CONSTRAINT cadastros_inconsistentes_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

-- escalas_medicos
ALTER TABLE public.escalas_medicos DROP CONSTRAINT escalas_medicos_created_by_fkey;
ALTER TABLE public.escalas_medicos ADD CONSTRAINT escalas_medicos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- incidentes_nsp
ALTER TABLE public.incidentes_nsp DROP CONSTRAINT incidentes_nsp_notificador_id_fkey;
ALTER TABLE public.incidentes_nsp ADD CONSTRAINT incidentes_nsp_notificador_id_fkey FOREIGN KEY (notificador_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- logs_permissoes
ALTER TABLE public.logs_permissoes DROP CONSTRAINT logs_permissoes_user_id_fkey;
ALTER TABLE public.logs_permissoes ADD CONSTRAINT logs_permissoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- perfis_sistema
ALTER TABLE public.perfis_sistema DROP CONSTRAINT perfis_sistema_created_by_fkey;
ALTER TABLE public.perfis_sistema ADD CONSTRAINT perfis_sistema_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- planos_acao_auditoria
ALTER TABLE public.planos_acao_auditoria DROP CONSTRAINT planos_acao_auditoria_registrado_por_fkey;
ALTER TABLE public.planos_acao_auditoria ALTER COLUMN registrado_por DROP NOT NULL;
ALTER TABLE public.planos_acao_auditoria ADD CONSTRAINT planos_acao_auditoria_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

-- profissionais_saude
ALTER TABLE public.profissionais_saude DROP CONSTRAINT profissionais_saude_created_by_fkey;
ALTER TABLE public.profissionais_saude ADD CONSTRAINT profissionais_saude_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- prontuarios
ALTER TABLE public.prontuarios DROP CONSTRAINT prontuarios_created_by_fkey;
ALTER TABLE public.prontuarios ADD CONSTRAINT prontuarios_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- regulacao_sus_facil
ALTER TABLE public.regulacao_sus_facil DROP CONSTRAINT regulacao_sus_facil_created_by_fkey;
ALTER TABLE public.regulacao_sus_facil ADD CONSTRAINT regulacao_sus_facil_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- saida_prontuarios
ALTER TABLE public.saida_prontuarios DROP CONSTRAINT saida_prontuarios_registrado_recepcao_por_fkey;
ALTER TABLE public.saida_prontuarios ADD CONSTRAINT saida_prontuarios_registrado_recepcao_por_fkey FOREIGN KEY (registrado_recepcao_por) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.saida_prontuarios DROP CONSTRAINT saida_prontuarios_validado_classificacao_por_fkey;
ALTER TABLE public.saida_prontuarios ADD CONSTRAINT saida_prontuarios_validado_classificacao_por_fkey FOREIGN KEY (validado_classificacao_por) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.saida_prontuarios DROP CONSTRAINT saida_prontuarios_conferido_nir_por_fkey;
ALTER TABLE public.saida_prontuarios ADD CONSTRAINT saida_prontuarios_conferido_nir_por_fkey FOREIGN KEY (conferido_nir_por) REFERENCES auth.users(id) ON DELETE SET NULL;

-- usuario_perfil
ALTER TABLE public.usuario_perfil DROP CONSTRAINT usuario_perfil_created_by_fkey;
ALTER TABLE public.usuario_perfil ADD CONSTRAINT usuario_perfil_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;