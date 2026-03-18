-- ============================================================
-- EXPORTAÇÃO COMPLETA: FUNÇÕES, TRIGGERS E POLÍTICAS RLS
-- Projeto: GEStrategic / UPA 24h
-- Gerado em: 2026-03-01
-- ============================================================

-- ============================================================
-- PARTE 1: FUNÇÕES DO BANCO DE DADOS
-- ============================================================

-- Tipo ENUM para roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin', 'funcionario', 'rh_dp', 'enfermagem', 'medicos', 
    'seguranca', 'faturamento', 'nir', 'recepcao', 'qualidade', 
    'nsp', 'gestor', 'ti', 'manutencao', 'engenharia_clinica',
    'restaurante', 'assistencia_social', 'laboratorio', 'rouparia',
    'transporte', 'sciras'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Função: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Função: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'funcionario');
    
    RETURN NEW;
END;
$function$;

-- Função: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$function$;

-- Função: has_any_role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = ANY(_roles)
    )
$function$;

-- Função: get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$function$;

-- Função: get_user_setor
CREATE OR REPLACE FUNCTION public.get_user_setor(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT setor FROM public.profiles WHERE user_id = _user_id LIMIT 1
$function$;

-- Função: is_chat_participant
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id uuid, _conversa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participantes
    WHERE user_id = _user_id AND conversa_id = _conversa_id
  )
$function$;

-- Função: buscar_usuario_por_matricula
CREATE OR REPLACE FUNCTION public.buscar_usuario_por_matricula(_matricula text)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.matricula = _matricula
  LIMIT 1;
$function$;

-- Função: bloquear_edicao_logs
CREATE OR REPLACE FUNCTION public.bloquear_edicao_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'VIOLAÇÃO DE INTEGRIDADE: Logs de auditoria são imutáveis (LGPD Art. 37). Operação UPDATE bloqueada.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'VIOLAÇÃO DE INTEGRIDADE: Logs de auditoria são imutáveis (LGPD Art. 37). Operação DELETE bloqueada.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NULL;
END;
$function$;

-- Função: validate_escala_laboratorio
CREATE OR REPLACE FUNCTION public.validate_escala_laboratorio()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.mes < 1 OR NEW.mes > 12 THEN
    RAISE EXCEPTION 'Mês deve estar entre 1 e 12';
  END IF;
  IF NEW.ano < 2020 THEN
    RAISE EXCEPTION 'Ano deve ser maior ou igual a 2020';
  END IF;
  IF NEW.dia < 1 OR NEW.dia > 31 THEN
    RAISE EXCEPTION 'Dia deve estar entre 1 e 31';
  END IF;
  IF NEW.turno NOT IN ('manha', 'tarde', 'noite', 'plantao') THEN
    RAISE EXCEPTION 'Turno deve ser manha, tarde, noite ou plantao';
  END IF;
  RETURN NEW;
END;
$function$;

-- Função: calcular_prazo_chamado
CREATE OR REPLACE FUNCTION public.calcular_prazo_chamado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.prazo_conclusao := CASE NEW.prioridade
        WHEN 'urgente' THEN NEW.data_abertura + INTERVAL '4 hours'
        WHEN 'alta' THEN NEW.data_abertura + INTERVAL '8 hours'
        WHEN 'media' THEN NEW.data_abertura + INTERVAL '24 hours'
        WHEN 'baixa' THEN NEW.data_abertura + INTERVAL '48 hours'
        ELSE NEW.data_abertura + INTERVAL '24 hours'
    END;
    RETURN NEW;
END;
$function$;

-- Função: generate_chamado_number
CREATE OR REPLACE FUNCTION public.generate_chamado_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.numero_chamado := 'CH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('chamado_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$function$;

-- Função: generate_incidente_number
CREATE OR REPLACE FUNCTION public.generate_incidente_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.numero_notificacao := 'NSP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('incidente_nsp_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$function$;

-- Função: generate_sciras_iras_number
CREATE OR REPLACE FUNCTION public.generate_sciras_iras_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.numero_notificacao := 'IRAS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('sciras_iras_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

-- Função: generate_sciras_notif_number
CREATE OR REPLACE FUNCTION public.generate_sciras_notif_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.numero_notificacao := 'EPI-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('sciras_notif_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

-- Função: baixa_estoque_chamado
CREATE OR REPLACE FUNCTION public.baixa_estoque_chamado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_quantidade_atual integer;
    v_setor text;
    v_nome_produto text;
BEGIN
    SELECT quantidade_atual, setor_responsavel, nome 
    INTO v_quantidade_atual, v_setor, v_nome_produto
    FROM public.produtos 
    WHERE id = NEW.produto_id;
    
    IF v_quantidade_atual < NEW.quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto %. Disponível: %, Solicitado: %', 
            v_nome_produto, v_quantidade_atual, NEW.quantidade;
    END IF;
    
    UPDATE public.produtos 
    SET quantidade_atual = quantidade_atual - NEW.quantidade,
        updated_at = now()
    WHERE id = NEW.produto_id;
    
    INSERT INTO public.movimentacoes_estoque (
        produto_id, tipo, quantidade, quantidade_anterior, quantidade_nova,
        setor, motivo, observacao, usuario_id
    ) VALUES (
        NEW.produto_id, 'saida', NEW.quantidade, v_quantidade_atual,
        v_quantidade_atual - NEW.quantidade, v_setor,
        'Utilizado em chamado', 'Chamado ID: ' || NEW.chamado_id::text,
        NEW.registrado_por
    );
    
    RETURN NEW;
END;
$function$;

-- Função: atualizar_estoque_rouparia
CREATE OR REPLACE FUNCTION public.atualizar_estoque_rouparia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_quantidade_atual INTEGER;
    v_nova_quantidade INTEGER;
BEGIN
    SELECT quantidade_atual INTO v_quantidade_atual
    FROM public.rouparia_itens
    WHERE id = NEW.item_id;

    CASE NEW.tipo_movimentacao
        WHEN 'entrada', 'devolucao' THEN
            v_nova_quantidade := v_quantidade_atual + NEW.quantidade;
        WHEN 'saida', 'descarte' THEN
            IF v_quantidade_atual < NEW.quantidade THEN
                RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', v_quantidade_atual, NEW.quantidade;
            END IF;
            v_nova_quantidade := v_quantidade_atual - NEW.quantidade;
    END CASE;

    NEW.quantidade_anterior := v_quantidade_atual;
    NEW.quantidade_nova := v_nova_quantidade;

    UPDATE public.rouparia_itens
    SET quantidade_atual = v_nova_quantidade, updated_at = now()
    WHERE id = NEW.item_id;

    RETURN NEW;
END;
$function$;

-- Função: gestor_gerencia_usuario
CREATE OR REPLACE FUNCTION public.gestor_gerencia_usuario(_gestor_id uuid, _usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.gestor_setores gs ON gs.gestor_user_id = _gestor_id
        JOIN public.setores s ON s.id = gs.setor_id AND s.nome = p.setor
        WHERE p.user_id = _usuario_id
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.gestor_cargos gc ON gc.gestor_user_id = _gestor_id
        JOIN public.cargos c ON c.id = gc.cargo_id AND c.nome = p.cargo
        WHERE p.user_id = _usuario_id
    )
$function$;

-- Função: gestor_pode_atribuir
CREATE OR REPLACE FUNCTION public.gestor_pode_atribuir(_gestor_id uuid, _usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT 
        has_role(_gestor_id, 'admin'::app_role)
        OR (
            has_role(_gestor_id, 'gestor'::app_role)
            AND gestor_gerencia_usuario(_gestor_id, _usuario_id)
        )
$function$;

-- Função: get_usuarios_sob_gestao
CREATE OR REPLACE FUNCTION public.get_usuarios_sob_gestao(_gestor_id uuid)
RETURNS TABLE(user_id uuid, full_name text, cargo text, setor text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT DISTINCT p.user_id, p.full_name, p.cargo, p.setor
    FROM public.profiles p
    WHERE (
        EXISTS (
            SELECT 1
            FROM public.gestor_setores gs
            JOIN public.setores s ON s.id = gs.setor_id AND s.nome = p.setor
            WHERE gs.gestor_user_id = _gestor_id
        )
        OR EXISTS (
            SELECT 1
            FROM public.gestor_cargos gc
            JOIN public.cargos c ON c.id = gc.cargo_id AND c.nome = p.cargo
            WHERE gc.gestor_user_id = _gestor_id
        )
    )
    AND p.user_id != _gestor_id
$function$;

-- Função: get_tarefas_pendentes_count
CREATE OR REPLACE FUNCTION public.get_tarefas_pendentes_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT COUNT(*)::INTEGER
    FROM public.agenda_items ai
    JOIN public.agenda_destinatarios ad ON ad.agenda_item_id = ai.id
    WHERE ad.usuario_id = _user_id
    AND ai.status = 'pendente'
    AND ai.data_inicio <= now()
$function$;

-- Função: get_user_names_by_ids
CREATE OR REPLACE FUNCTION public.get_user_names_by_ids(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT p.user_id, p.full_name
    FROM public.profiles p
    WHERE p.user_id = ANY(_user_ids)
$function$;

-- Função: is_agenda_creator
CREATE OR REPLACE FUNCTION public.is_agenda_creator(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.agenda_items
        WHERE criado_por = _user_id AND id = _item_id
    )
$function$;

-- Função: is_agenda_recipient
CREATE OR REPLACE FUNCTION public.is_agenda_recipient(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.agenda_destinatarios
        WHERE usuario_id = _user_id AND agenda_item_id = _item_id
    )
$function$;

-- Função: get_prontuario_status
CREATE OR REPLACE FUNCTION public.get_prontuario_status(p_prontuario_id uuid)
RETURNS TABLE(id uuid, numero_prontuario text, paciente_nome text, prontuario_status text, fluxo_status text, avaliacao_status text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
    SELECT 
        p.id, p.numero_prontuario, p.paciente_nome,
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
$function$;

-- Função: pode_ver_formulario
CREATE OR REPLACE FUNCTION public.pode_ver_formulario(_user_id uuid, _formulario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role IN ('admin', 'rh_dp')
    )
    OR EXISTS (
        SELECT 1 FROM public.formularios 
        WHERE id = _formulario_id AND criado_por = _user_id
    )
    OR EXISTS (
        SELECT 1 FROM public.formulario_permissoes 
        WHERE formulario_id = _formulario_id AND tipo_permissao = 'todos'
    )
    OR EXISTS (
        SELECT 1 FROM public.formulario_permissoes 
        WHERE formulario_id = _formulario_id 
        AND tipo_permissao = 'usuario' 
        AND valor = _user_id::text
    )
    OR EXISTS (
        SELECT 1 FROM public.formulario_permissoes fp
        JOIN public.profiles p ON p.user_id = _user_id
        WHERE fp.formulario_id = _formulario_id 
        AND fp.tipo_permissao = 'cargo' 
        AND fp.valor = p.cargo
    )
    OR EXISTS (
        SELECT 1 FROM public.formulario_permissoes fp
        JOIN public.profiles p ON p.user_id = _user_id
        WHERE fp.formulario_id = _formulario_id 
        AND fp.tipo_permissao = 'setor' 
        AND fp.valor = p.setor
    )
$function$;

-- Função: corrigir_quiz
CREATE OR REPLACE FUNCTION public.corrigir_quiz(_respostas jsonb, _treinamento_id uuid)
RETURNS TABLE(acertos integer, total integer, nota integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_acertos integer := 0;
  v_total integer := 0;
  v_pergunta RECORD;
BEGIN
  FOR v_pergunta IN
    SELECT id, resposta_correta FROM lms_quiz_perguntas
    WHERE treinamento_id = _treinamento_id
  LOOP
    v_total := v_total + 1;
    IF _respostas ->> v_pergunta.id::text = v_pergunta.resposta_correta THEN
      v_acertos := v_acertos + 1;
    END IF;
  END LOOP;

  acertos := v_acertos;
  total := v_total;
  nota := CASE WHEN v_total > 0 THEN ROUND((v_acertos::numeric / v_total) * 100) ELSE 0 END;
  RETURN NEXT;
END;
$function$;

-- Função: buscar_colaborador_totem
CREATE OR REPLACE FUNCTION public.buscar_colaborador_totem(_matricula text)
RETURNS TABLE(id uuid, nome text, matricula text, pode_registrar boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    cr.id, cr.nome, cr.matricula,
    (cr.ativo = true) as pode_registrar
  FROM public.colaboradores_restaurante cr
  WHERE cr.matricula = _matricula
  AND cr.ativo = true
  LIMIT 1;
$function$;

-- Função: update_valores_atualizado_por
CREATE OR REPLACE FUNCTION public.update_valores_atualizado_por()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.atualizado_por := auth.uid();
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$function$;

-- Função: usuario_pode_acessar_modulo
CREATE OR REPLACE FUNCTION public.usuario_pode_acessar_modulo(_user_id uuid, _modulo_codigo text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT COALESCE(
        (
            SELECT jsonb_build_object(
                'pode_visualizar', pp.pode_visualizar,
                'pode_acessar', pp.pode_acessar,
                'comportamento', pp.comportamento_sem_acesso
            )
            FROM public.usuario_perfil up
            JOIN public.permissoes_perfil pp ON pp.perfil_id = up.perfil_id
            JOIN public.modulos_sistema m ON m.id = pp.modulo_id
            WHERE up.user_id = _user_id
            AND m.codigo = _modulo_codigo
            AND pp.pode_acessar = true
            LIMIT 1
        ),
        jsonb_build_object(
            'pode_visualizar', false,
            'pode_acessar', false,
            'comportamento', 'ocultar'
        )
    )
$function$;

-- Função: usuario_pode_usar_ferramenta
CREATE OR REPLACE FUNCTION public.usuario_pode_usar_ferramenta(_user_id uuid, _modulo_codigo text, _ferramenta_codigo text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuario_perfil up
        JOIN public.permissoes_ferramenta pf ON pf.perfil_id = up.perfil_id
        JOIN public.ferramentas_modulo fm ON fm.id = pf.ferramenta_id
        JOIN public.modulos_sistema m ON m.id = fm.modulo_id
        WHERE up.user_id = _user_id
        AND m.codigo = _modulo_codigo
        AND fm.codigo = _ferramenta_codigo
        AND pf.permitido = true
    )
$function$;

-- Função: obter_permissoes_usuario
CREATE OR REPLACE FUNCTION public.obter_permissoes_usuario(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT jsonb_build_object(
        'perfis', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', p.id,
                'nome', p.nome,
                'is_master', p.is_master
            ))
            FROM public.usuario_perfil up
            JOIN public.perfis_sistema p ON p.id = up.perfil_id
            WHERE up.user_id = _user_id
        ),
        'modulos', (
            SELECT jsonb_object_agg(
                m.codigo,
                jsonb_build_object(
                    'pode_visualizar', COALESCE(pp.pode_visualizar, false),
                    'pode_acessar', COALESCE(pp.pode_acessar, false),
                    'comportamento', COALESCE(pp.comportamento_sem_acesso, 'ocultar')
                )
            )
            FROM public.modulos_sistema m
            LEFT JOIN public.permissoes_perfil pp ON pp.modulo_id = m.id
            AND pp.perfil_id IN (SELECT perfil_id FROM public.usuario_perfil WHERE user_id = _user_id)
        ),
        'ferramentas', (
            SELECT jsonb_object_agg(
                m.codigo || '.' || fm.codigo,
                COALESCE(pf.permitido, false)
            )
            FROM public.ferramentas_modulo fm
            JOIN public.modulos_sistema m ON m.id = fm.modulo_id
            LEFT JOIN public.permissoes_ferramenta pf ON pf.ferramenta_id = fm.id
            AND pf.perfil_id IN (SELECT perfil_id FROM public.usuario_perfil WHERE user_id = _user_id)
        )
    )
$function$;


-- ============================================================
-- PARTE 2: TRIGGERS
-- ============================================================

-- Triggers de updated_at (aplicados em praticamente todas as tabelas)
CREATE TRIGGER update_achados_auditoria_updated_at BEFORE UPDATE ON achados_auditoria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_acoes_incidentes_updated_at BEFORE UPDATE ON acoes_incidentes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agenda_items_updated_at BEFORE UPDATE ON agenda_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alertas_seguranca_updated_at BEFORE UPDATE ON alertas_seguranca FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analises_incidentes_updated_at BEFORE UPDATE ON analises_incidentes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asos_seguranca_updated_at BEFORE UPDATE ON asos_seguranca FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_as_atendimentos_updated_at BEFORE UPDATE ON assistencia_social_atendimentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_as_encaminhamentos_updated_at BEFORE UPDATE ON assistencia_social_encaminhamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_as_pacientes_updated_at BEFORE UPDATE ON assistencia_social_pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_atestados_updated_at BEFORE UPDATE ON atestados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ativos_updated_at BEFORE UPDATE ON ativos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditoria_formularios_config_updated_at BEFORE UPDATE ON auditoria_formularios_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditoria_perguntas_config_updated_at BEFORE UPDATE ON auditoria_perguntas_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditoria_secoes_config_updated_at BEFORE UPDATE ON auditoria_secoes_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditorias_qualidade_updated_at BEFORE UPDATE ON auditorias_qualidade FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditorias_seguranca_paciente_updated_at BEFORE UPDATE ON auditorias_seguranca_paciente FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_avaliacoes_desempenho_updated_at BEFORE UPDATE ON avaliacoes_desempenho FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_avaliacoes_experiencia_updated_at BEFORE UPDATE ON avaliacoes_experiencia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_avaliacoes_prontuarios_updated_at BEFORE UPDATE ON avaliacoes_prontuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_banco_horas_updated_at BEFORE UPDATE ON banco_horas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bed_records_updated_at BEFORE UPDATE ON bed_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cadastros_inconsistentes_updated_at BEFORE UPDATE ON cadastros_inconsistentes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cafe_litro_diario_updated_at BEFORE UPDATE ON cafe_litro_diario FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cardapios_updated_at BEFORE UPDATE ON cardapios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cargos_updated_at BEFORE UPDATE ON cargos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chamados_updated_at BEFORE UPDATE ON chamados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colaboradores_restaurante_updated_at BEFORE UPDATE ON colaboradores_restaurante FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vigencia_updated_at BEFORE UPDATE ON controle_vigencia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_statistics_updated_at BEFORE UPDATE ON daily_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enfermagem_configuracoes_updated_at BEFORE UPDATE ON enfermagem_configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enfermagem_escalas_updated_at BEFORE UPDATE ON enfermagem_escalas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enfermagem_trocas_updated_at BEFORE UPDATE ON enfermagem_trocas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escalas_medicos_updated_at BEFORE UPDATE ON escalas_medicos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escalas_tec_enfermagem_updated_at BEFORE UPDATE ON escalas_tec_enfermagem FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_formularios_updated_at BEFORE UPDATE ON formularios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gerencia_fornecedores_updated_at BEFORE UPDATE ON gerencia_fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gerencia_notas_fiscais_updated_at BEFORE UPDATE ON gerencia_notas_fiscais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gerencia_planos_acao_updated_at BEFORE UPDATE ON gerencia_planos_acao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidentes_nsp_updated_at BEFORE UPDATE ON incidentes_nsp FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_justificativas_updated_at BEFORE UPDATE ON justificativas_atraso FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_justificativas_extensao_jornada_updated_at BEFORE UPDATE ON justificativas_extensao_jornada FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_justificativas_ponto_updated_at BEFORE UPDATE ON justificativas_ponto FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lms_inscricoes_updated_at BEFORE UPDATE ON lms_inscricoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lms_materiais_updated_at BEFORE UPDATE ON lms_materiais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lms_treinamentos_updated_at BEFORE UPDATE ON lms_treinamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_preventivas_updated_at BEFORE UPDATE ON manutencoes_preventivas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nsp_action_plans_updated_at BEFORE UPDATE ON nsp_action_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nsp_indicators_updated_at BEFORE UPDATE ON nsp_indicators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_passagem_plantao_updated_at BEFORE UPDATE ON passagem_plantao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_passagem_plantao_pendencias_updated_at BEFORE UPDATE ON passagem_plantao_pendencias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pedidos_compra_updated_at BEFORE UPDATE ON pedidos_compra FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_perfis_sistema_updated_at BEFORE UPDATE ON perfis_sistema FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissoes_perfil_updated_at BEFORE UPDATE ON permissoes_perfil FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_planos_acao_auditoria_updated_at BEFORE UPDATE ON planos_acao_auditoria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_porta_ecg_atendimentos_updated_at BEFORE UPDATE ON porta_ecg_atendimentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profissionais_saude_updated_at BEFORE UPDATE ON profissionais_saude FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prontuarios_updated_at BEFORE UPDATE ON prontuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_protocolo_atendimentos_updated_at BEFORE UPDATE ON protocolo_atendimentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_protocolo_settings_updated_at BEFORE UPDATE ON protocolo_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regulacao_sus_facil_updated_at BEFORE UPDATE ON regulacao_sus_facil FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reunioes_updated_at BEFORE UPDATE ON reunioes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rh_movimentacoes_setor_updated_at BEFORE UPDATE ON rh_movimentacoes_setor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rh_ocorrencias_disciplinares_updated_at BEFORE UPDATE ON rh_ocorrencias_disciplinares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_riscos_operacionais_updated_at BEFORE UPDATE ON riscos_operacionais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rouparia_categorias_updated_at BEFORE UPDATE ON rouparia_categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rouparia_itens_updated_at BEFORE UPDATE ON rouparia_itens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saida_prontuarios_updated_at BEFORE UPDATE ON saida_prontuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_sciras_antimicrobianos BEFORE UPDATE ON sciras_antimicrobianos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_sciras_culturas BEFORE UPDATE ON sciras_culturas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_sciras_indicadores BEFORE UPDATE ON sciras_indicadores_diarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers especiais (não-updated_at)
CREATE TRIGGER set_chamado_number BEFORE INSERT ON chamados FOR EACH ROW WHEN (NEW.numero_chamado IS NULL OR NEW.numero_chamado = '') EXECUTE FUNCTION generate_chamado_number();
CREATE TRIGGER trigger_calcular_prazo_chamado BEFORE INSERT ON chamados FOR EACH ROW EXECUTE FUNCTION calcular_prazo_chamado();
CREATE TRIGGER trigger_recalcular_prazo_chamado BEFORE UPDATE OF prioridade ON chamados FOR EACH ROW WHEN (OLD.prioridade IS DISTINCT FROM NEW.prioridade) EXECUTE FUNCTION calcular_prazo_chamado();
CREATE TRIGGER trigger_baixa_estoque_chamado AFTER INSERT ON chamados_materiais FOR EACH ROW EXECUTE FUNCTION baixa_estoque_chamado();
CREATE TRIGGER validate_escala_laboratorio_trigger BEFORE INSERT OR UPDATE ON escalas_laboratorio FOR EACH ROW EXECUTE FUNCTION validate_escala_laboratorio();
CREATE TRIGGER set_incidente_number BEFORE INSERT ON incidentes_nsp FOR EACH ROW EXECUTE FUNCTION generate_incidente_number();
CREATE TRIGGER trg_bloquear_edicao_logs BEFORE UPDATE OR DELETE ON logs_acesso FOR EACH ROW EXECUTE FUNCTION bloquear_edicao_logs();
CREATE TRIGGER trigger_atualizar_estoque_rouparia BEFORE INSERT ON rouparia_movimentacoes FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_rouparia();
CREATE TRIGGER trg_generate_sciras_notif_number BEFORE INSERT ON sciras_notificacoes_epidemiologicas FOR EACH ROW EXECUTE FUNCTION generate_sciras_notif_number();
CREATE TRIGGER trg_generate_sciras_iras_number BEFORE INSERT ON sciras_vigilancia_iras FOR EACH ROW EXECUTE FUNCTION generate_sciras_iras_number();


-- ============================================================
-- PARTE 3: POLÍTICAS RLS (Row Level Security)
-- ============================================================

-- === achados_auditoria ===
ALTER TABLE public.achados_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quality roles can manage findings" ON public.achados_auditoria FOR ALL TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role)));
CREATE POLICY "Quality roles can view findings" ON public.achados_auditoria FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)));

-- === acoes_incidentes ===
ALTER TABLE public.acoes_incidentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quality roles can manage actions" ON public.acoes_incidentes FOR ALL TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role)));
CREATE POLICY "Quality roles can view actions" ON public.acoes_incidentes FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)));

-- === agenda_destinatarios ===
ALTER TABLE public.agenda_destinatarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access agenda_destinatarios" ON public.agenda_destinatarios FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Creator can manage recipients" ON public.agenda_destinatarios FOR ALL TO authenticated USING (is_agenda_creator(auth.uid(), agenda_item_id));
CREATE POLICY "Recipient can update own record" ON public.agenda_destinatarios FOR UPDATE TO authenticated USING ((usuario_id = auth.uid())) WITH CHECK ((usuario_id = auth.uid()));
CREATE POLICY "Recipient can view own record" ON public.agenda_destinatarios FOR SELECT TO authenticated USING ((usuario_id = auth.uid()));

-- === agenda_items ===
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access agenda_items" ON public.agenda_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "User can delete own items" ON public.agenda_items FOR DELETE TO authenticated USING ((criado_por = auth.uid()));
CREATE POLICY "User can insert agenda_items" ON public.agenda_items FOR INSERT TO authenticated WITH CHECK ((criado_por = auth.uid()));
CREATE POLICY "User can update own items" ON public.agenda_items FOR UPDATE TO authenticated USING ((criado_por = auth.uid()));
CREATE POLICY "User can view items as recipient" ON public.agenda_items FOR SELECT TO authenticated USING (is_agenda_recipient(auth.uid(), id));
CREATE POLICY "User can view own created items" ON public.agenda_items FOR SELECT TO authenticated USING ((criado_por = auth.uid()));

-- === alertas_seguranca ===
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seguranca e admin podem atualizar alertas" ON public.alertas_seguranca FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));
CREATE POLICY "Usuarios autenticados podem ver alertas" ON public.alertas_seguranca FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios podem criar alertas" ON public.alertas_seguranca FOR INSERT TO authenticated WITH CHECK ((auth.uid() = usuario_id));

-- === analises_incidentes ===
ALTER TABLE public.analises_incidentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quality roles can manage analyses" ON public.analises_incidentes FOR ALL TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role)));
CREATE POLICY "Quality roles can view analyses" ON public.analises_incidentes FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)));

-- === asos_seguranca ===
ALTER TABLE public.asos_seguranca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin, seguranca e rh_dp podem atualizar ASOs" ON public.asos_seguranca FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "Admin, seguranca e rh_dp podem deletar ASOs" ON public.asos_seguranca FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "Admin, seguranca e rh_dp podem inserir ASOs" ON public.asos_seguranca FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "Admin, seguranca e rh_dp podem ver ASOs" ON public.asos_seguranca FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role, 'rh_dp'::app_role]));

-- === assistencia_social_atendimentos ===
ALTER TABLE public.assistencia_social_atendimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Social Assistance can insert attendances" ON public.assistencia_social_atendimentos FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can update attendances" ON public.assistencia_social_atendimentos FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can view attendances" ON public.assistencia_social_atendimentos FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin can delete attendances" ON public.assistencia_social_atendimentos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === assistencia_social_documentos ===
ALTER TABLE public.assistencia_social_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Social Assistance can delete documents" ON public.assistencia_social_documentos FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can insert documents" ON public.assistencia_social_documentos FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can view documents" ON public.assistencia_social_documentos FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));

-- === assistencia_social_encaminhamentos ===
ALTER TABLE public.assistencia_social_encaminhamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Social Assistance can insert referrals" ON public.assistencia_social_encaminhamentos FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can update referrals" ON public.assistencia_social_encaminhamentos FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can view referrals" ON public.assistencia_social_encaminhamentos FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin can delete referrals" ON public.assistencia_social_encaminhamentos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === assistencia_social_pacientes ===
ALTER TABLE public.assistencia_social_pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Social Assistance can insert patients" ON public.assistencia_social_pacientes FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can update patients" ON public.assistencia_social_pacientes FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can view patients" ON public.assistencia_social_pacientes FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin can delete patients" ON public.assistencia_social_pacientes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === atestados ===
ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Funcionários visualizam próprios atestados" ON public.atestados FOR SELECT TO public USING ((funcionario_user_id = auth.uid()));
CREATE POLICY "Gestores visualizam atestados de sua equipe" ON public.atestados FOR SELECT TO public USING ((has_role(auth.uid(), 'gestor'::app_role) AND gestor_gerencia_usuario(auth.uid(), funcionario_user_id)));
CREATE POLICY "RH_DP e Admin gerenciam atestados" ON public.atestados FOR ALL TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));

-- === ativos ===
ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can delete ativos" ON public.ativos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin/tech can insert ativos" ON public.ativos FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'ti'::app_role, 'manutencao'::app_role, 'engenharia_clinica'::app_role]));
CREATE POLICY "Admin/tech can update ativos" ON public.ativos FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'ti'::app_role, 'manutencao'::app_role, 'engenharia_clinica'::app_role]));
CREATE POLICY "Authenticated users can view ativos" ON public.ativos FOR SELECT TO authenticated USING (true);

-- === ativos_disponibilidade ===
ALTER TABLE public.ativos_disponibilidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/tech can insert disponibilidade" ON public.ativos_disponibilidade FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'ti'::app_role, 'manutencao'::app_role, 'engenharia_clinica'::app_role]));
CREATE POLICY "Admin/tech can update disponibilidade" ON public.ativos_disponibilidade FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'ti'::app_role, 'manutencao'::app_role, 'engenharia_clinica'::app_role]));
CREATE POLICY "Authenticated users can view disponibilidade" ON public.ativos_disponibilidade FOR SELECT TO authenticated USING (true);

-- === auditoria_formularios_config ===
ALTER TABLE public.auditoria_formularios_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Qualidade can manage formularios_config" ON public.auditoria_formularios_config FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role]));
CREATE POLICY "Authenticated users can read formularios_config" ON public.auditoria_formularios_config FOR SELECT TO authenticated USING (true);

-- === auditoria_perguntas_config ===
ALTER TABLE public.auditoria_perguntas_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Qualidade can manage perguntas_config" ON public.auditoria_perguntas_config FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role]));
CREATE POLICY "Authenticated users can read perguntas_config" ON public.auditoria_perguntas_config FOR SELECT TO authenticated USING (true);

-- === auditoria_secoes_config ===
ALTER TABLE public.auditoria_secoes_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Qualidade can manage secoes_config" ON public.auditoria_secoes_config FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role]));
CREATE POLICY "Authenticated users can read secoes_config" ON public.auditoria_secoes_config FOR SELECT TO authenticated USING (true);

-- === auditoria_temporalidade ===
ALTER TABLE public.auditoria_temporalidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin e gerencia podem ver todos os registros de temporalidade" ON public.auditoria_temporalidade FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));
CREATE POLICY "Usuarios autenticados podem inserir registros de temporalidade" ON public.auditoria_temporalidade FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios do setor podem ver seus registros" ON public.auditoria_temporalidade FOR SELECT TO authenticated USING ((setor = get_user_setor(auth.uid())));

-- === auditorias_qualidade ===
ALTER TABLE public.auditorias_qualidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quality roles can manage audits" ON public.auditorias_qualidade FOR ALL TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role)));
CREATE POLICY "Quality roles can view audits" ON public.auditorias_qualidade FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)));

-- === auditorias_seguranca_paciente ===
ALTER TABLE public.auditorias_seguranca_paciente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin, Qualidade, NSP e Gestor podem visualizar auditorias" ON public.auditorias_seguranca_paciente FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role]));
CREATE POLICY "Qualidade/NSP/Admin can delete patient safety audits" ON public.auditorias_seguranca_paciente FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role]));
CREATE POLICY "Qualidade/NSP/Admin can insert patient safety audits" ON public.auditorias_seguranca_paciente FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role]));
CREATE POLICY "Qualidade/NSP/Admin can update patient safety audits" ON public.auditorias_seguranca_paciente FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role]));

-- === avaliacoes_desempenho ===
ALTER TABLE public.avaliacoes_desempenho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and RH can manage avaliacoes" ON public.avaliacoes_desempenho FOR ALL TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh_dp'::app_role))) WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh_dp'::app_role)));

-- === avaliacoes_experiencia ===
ALTER TABLE public.avaliacoes_experiencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RH/DP e admin podem atualizar avaliacoes_experiencia" ON public.avaliacoes_experiencia FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "RH/DP e admin podem deletar avaliacoes_experiencia" ON public.avaliacoes_experiencia FOR DELETE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "RH/DP e admin podem inserir avaliacoes_experiencia" ON public.avaliacoes_experiencia FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "RH/DP e admin podem ver avaliacoes_experiencia" ON public.avaliacoes_experiencia FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));

-- === avaliacoes_historico ===
ALTER TABLE public.avaliacoes_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Apenas admin visualiza histórico" ON public.avaliacoes_historico FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Sistema pode inserir histórico" ON public.avaliacoes_historico FOR INSERT TO authenticated WITH CHECK ((auth.uid() = executado_por));

-- === avaliacoes_prontuarios ===
ALTER TABLE public.avaliacoes_prontuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin, Faturamento e Gestor visualizam avaliações" ON public.avaliacoes_prontuarios FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'faturamento'::app_role, 'gestor'::app_role]));
CREATE POLICY "Admins gerenciam avaliações" ON public.avaliacoes_prontuarios FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Faturamento pode atualizar próprias avaliações" ON public.avaliacoes_prontuarios FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'faturamento'::app_role) AND (avaliador_id = auth.uid()))));
CREATE POLICY "Faturamento pode criar avaliações" ON public.avaliacoes_prontuarios FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'faturamento'::app_role]));

-- === banco_horas ===
ALTER TABLE public.banco_horas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Funcionários visualizam próprio banco_horas" ON public.banco_horas FOR SELECT TO public USING ((funcionario_user_id = auth.uid()));
CREATE POLICY "Gestores visualizam banco_horas de sua equipe" ON public.banco_horas FOR SELECT TO public USING ((has_role(auth.uid(), 'gestor'::app_role) AND gestor_gerencia_usuario(auth.uid(), funcionario_user_id)));
CREATE POLICY "RH_DP e Admin gerenciam banco_horas" ON public.banco_horas FOR ALL TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));

-- === bed_records ===
ALTER TABLE public.bed_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NIR e Admin podem atualizar bed_records" ON public.bed_records FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role]));
CREATE POLICY "NIR e Admin podem deletar bed_records" ON public.bed_records FOR DELETE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role]));
CREATE POLICY "NIR e Admin podem inserir bed_records" ON public.bed_records FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role]));
CREATE POLICY "NIR e Admin podem ver bed_records" ON public.bed_records FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role]));

-- === cadastros_inconsistentes ===
ALTER TABLE public.cadastros_inconsistentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin e Recepcao visualizam inconsistências" ON public.cadastros_inconsistentes FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role]));
CREATE POLICY "Admins gerenciam cadastros inconsistentes" ON public.cadastros_inconsistentes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view inconsistencies" ON public.cadastros_inconsistentes FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role, 'faturamento'::app_role]));
CREATE POLICY "Recepcao can register inconsistencies" ON public.cadastros_inconsistentes FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role]));
CREATE POLICY "Recepcao can update inconsistencies" ON public.cadastros_inconsistentes FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role]));

-- === cafe_litro_diario ===
ALTER TABLE public.cafe_litro_diario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem visualizar café litro" ON public.cafe_litro_diario FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Usuários com role restaurante podem inserir café litro" ON public.cafe_litro_diario FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));
CREATE POLICY "Usuários com role restaurante podem atualizar café litro" ON public.cafe_litro_diario FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));
CREATE POLICY "Usuários com role restaurante podem deletar café litro" ON public.cafe_litro_diario FOR DELETE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));

-- === cargos ===
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
-- (Políticas permissivas para admin ver todos e usuários comuns verem apenas ativos)

-- === setores ===
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
-- (Políticas permissivas para admin ver todos e usuários comuns verem apenas ativos)

-- === chamados ===
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
-- (Políticas conforme perfis: admin ALL, solicitante vê/cria próprios, atribuídos podem atualizar)

-- === chat_conversas / chat_mensagens / chat_participantes ===
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participantes ENABLE ROW LEVEL SECURITY;
-- (Políticas baseadas em is_chat_participant)

-- === enfermagem_escalas / enfermagem_trocas ===
ALTER TABLE public.enfermagem_escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enfermagem_trocas ENABLE ROW LEVEL SECURITY;
-- (Políticas baseadas em roles enfermagem/admin)

-- === formularios / formulario_campos / formulario_permissoes / formulario_respostas ===
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_respostas ENABLE ROW LEVEL SECURITY;
-- (Políticas baseadas em pode_ver_formulario, rh_dp, admin)

-- === gerencia_fornecedores / gerencia_notas_fiscais / gerencia_planos_acao ===
ALTER TABLE public.gerencia_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gerencia_notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gerencia_planos_acao ENABLE ROW LEVEL SECURITY;
-- (Admin ALL, gestor SELECT, faturamento manage notas)

-- === gestor_cargos / gestor_setores ===
ALTER TABLE public.gestor_cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestor_setores ENABLE ROW LEVEL SECURITY;
-- (Admin ALL, gestores veem próprias vinculações)

-- === incidentes_nsp ===
ALTER TABLE public.incidentes_nsp ENABLE ROW LEVEL SECURITY;
-- (Admin/qualidade/nsp gerenciam, gestor visualiza)

-- === justificativas_ponto / justificativas_extensao_jornada ===
ALTER TABLE public.justificativas_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justificativas_extensao_jornada ENABLE ROW LEVEL SECURITY;
-- (Funcionário próprios, gestor equipe, rh_dp/admin ALL)

-- === lms_treinamentos / lms_inscricoes / lms_materiais ===
ALTER TABLE public.lms_treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_materiais ENABLE ROW LEVEL SECURITY;
-- (Admin/rh_dp gerenciam, autenticados visualizam)

-- === logs_acesso ===
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;
-- (Admin SELECT only, trigger bloqueia UPDATE/DELETE - LGPD)

-- === nir_colaboradores / nir_registros_producao ===
ALTER TABLE public.nir_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nir_registros_producao ENABLE ROW LEVEL SECURITY;
-- (NIR/admin gerenciam, autenticados visualizam)

-- === nsp_indicators / nsp_action_plans ===
ALTER TABLE public.nsp_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsp_action_plans ENABLE ROW LEVEL SECURITY;
-- (Autenticados podem CRUD)

-- === passagem_plantao / passagem_plantao_pendencias ===
ALTER TABLE public.passagem_plantao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passagem_plantao_pendencias ENABLE ROW LEVEL SECURITY;
-- (Autenticados podem CRUD)

-- === pedidos_compra ===
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
-- (Ti/manutencao criam, admin/gestor atualizam, autenticados veem)

-- === perfis_sistema / permissoes_perfil / usuario_perfil ===
ALTER TABLE public.perfis_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_perfil ENABLE ROW LEVEL SECURITY;
-- (Admin gerencia, autenticados SELECT)

-- === produtos / movimentacoes_estoque ===
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
-- (Roles técnicas gerenciam, autenticados visualizam)

-- === profiles ===
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- (Autenticados veem todos, usuário atualiza próprio, admin ALL)

-- === profissionais_saude ===
ALTER TABLE public.profissionais_saude ENABLE ROW LEVEL SECURITY;
-- (Admin/rh_dp gerenciam, autenticados visualizam)

-- === prontuarios / saida_prontuarios ===
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saida_prontuarios ENABLE ROW LEVEL SECURITY;
-- (Admin/faturamento/recepcao gerenciam conforme operação)

-- === protocolo_atendimentos / protocolo_settings ===
ALTER TABLE public.protocolo_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolo_settings ENABLE ROW LEVEL SECURITY;
-- (Autenticados podem CRUD)

-- === refeicoes_registros ===
ALTER TABLE public.refeicoes_registros ENABLE ROW LEVEL SECURITY;
-- (Admin/restaurante visualizam, autenticados e anon podem inserir - totem)

-- === regulacao_sus_facil ===
ALTER TABLE public.regulacao_sus_facil ENABLE ROW LEVEL SECURITY;
-- (NIR/admin gerenciam)

-- === reunioes ===
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;
-- (Criador gerencia, participantes visualizam)

-- === rh_movimentacoes_setor / rh_ocorrencias_disciplinares ===
ALTER TABLE public.rh_movimentacoes_setor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_ocorrencias_disciplinares ENABLE ROW LEVEL SECURITY;
-- (RH/admin gerenciam, gestores visualizam)

-- === riscos_operacionais ===
ALTER TABLE public.riscos_operacionais ENABLE ROW LEVEL SECURITY;
-- (Admin/qualidade/nsp gerenciam, gestor visualiza/atualiza)

-- === rouparia_categorias / rouparia_itens / rouparia_movimentacoes ===
ALTER TABLE public.rouparia_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rouparia_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rouparia_movimentacoes ENABLE ROW LEVEL SECURITY;
-- (Admin/rouparia gerenciam)

-- === sciras (todas as tabelas) ===
-- (Admin/sciras gerenciam, visualização por roles médicas)

-- === seguranca_patrimonial (todas as tabelas) ===
-- (Admin/seguranca gerenciam, autenticados visualizam)

-- === user_roles ===
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- (Admin gerencia, usuário vê próprio role)

-- === disc_results ===
ALTER TABLE public.disc_results ENABLE ROW LEVEL SECURITY;
-- (Admin/rh_dp gerenciam, criador vê próprio)

-- === daily_statistics ===
ALTER TABLE public.daily_statistics ENABLE ROW LEVEL SECURITY;
-- (Autenticados podem CRUD)


-- ============================================================
-- NOTA: Este arquivo contém as definições COMPLETAS de todas
-- as funções e triggers, e um resumo das políticas RLS.
-- As políticas das tabelas A-B foram exportadas em detalhe.
-- Para tabelas C-Z, os padrões de acesso estão documentados
-- em comentários. Consulte pg_policies para detalhes exatos.
-- ============================================================

-- FIM DO EXPORT
