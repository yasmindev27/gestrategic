
DO $$
DECLARE
  form_id uuid;
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  s3 uuid := gen_random_uuid();
  s4 uuid := gen_random_uuid();
  s5 uuid := gen_random_uuid();
  s6 uuid := gen_random_uuid();
BEGIN
  SELECT id INTO form_id FROM public.auditoria_formularios_config WHERE tipo = 'seguranca_paciente' LIMIT 1;

  -- Limpar seções e perguntas existentes
  DELETE FROM public.auditoria_perguntas_config WHERE secao_id IN (
    SELECT id FROM public.auditoria_secoes_config WHERE formulario_id = form_id
  );
  DELETE FROM public.auditoria_secoes_config WHERE formulario_id = form_id;

  -- Meta 1 – Identificação Correta do Paciente
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s1, form_id, 'Meta 1 – Identificação Correta do Paciente', 1);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s1, 'M1_01', 'Paciente com pulseira de identificação?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s1, 'M1_02', 'Pulseira legível e com dados corretos (nome completo, data de nascimento, nº prontuário)?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s1, 'M1_03', 'Conferência de identificação antes de administrar medicamentos?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s1, 'M1_04', 'Conferência de identificação antes de procedimentos?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4),
    (s1, 'M1_05', 'Conferência de identificação antes de coleta de exames?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 5);

  -- Meta 2 – Comunicação Efetiva
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s2, form_id, 'Meta 2 – Comunicação Efetiva', 2);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s2, 'M2_01', 'Prescrição médica legível e sem abreviaturas proibidas?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s2, 'M2_02', 'Ordens verbais com read-back confirmado?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s2, 'M2_03', 'Passagem de plantão estruturada (SBAR/I-PASS)?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s2, 'M2_04', 'Resultados críticos comunicados em tempo hábil?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4);

  -- Meta 3 – Segurança da Cadeia Medicamentosa
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s3, form_id, 'Meta 3 – Segurança da Cadeia Medicamentosa', 3);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s3, 'M3_01', 'Medicamentos de alta vigilância identificados e armazenados separadamente?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s3, 'M3_02', 'Dupla checagem realizada para medicamentos de alta vigilância?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s3, 'M3_03', 'Eletrólitos concentrados não acessíveis em áreas assistenciais?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s3, 'M3_04', '9 certos conferidos na administração (paciente, medicamento, dose, via, horário, registro, orientação, forma, resposta)?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4),
    (s3, 'M3_05', 'Rótulo de soro/medicamento com identificação completa?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 5);

  -- Meta 4 – Prevenção de Queda
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s4, form_id, 'Meta 4 – Prevenção de Queda', 4);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s4, 'M4_01', 'Escala de risco de queda (Morse/Humpty Dumpty) aplicada na admissão?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s4, 'M4_02', 'Grades de proteção elevadas para pacientes de risco?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s4, 'M4_03', 'Sinalização visual de risco de queda no leito?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s4, 'M4_04', 'Orientação ao paciente/acompanhante sobre prevenção de queda?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4),
    (s4, 'M4_05', 'Ambiente seguro (piso seco, iluminação, campainha acessível)?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 5);

  -- Meta 5 – Higiene das Mãos
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s5, form_id, 'Meta 5 – Higiene das Mãos', 5);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s5, 'M5_01', 'Higienização das mãos nos 5 momentos preconizados pela OMS?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s5, 'M5_02', 'Disponibilidade de álcool gel 70% nos pontos de assistência?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s5, 'M5_03', 'Técnica correta de higienização (fricção mínima 20-30s)?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s5, 'M5_04', 'Precauções de isolamento seguidas conforme indicação?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4);

  -- Meta 6 – Prevenção Lesão por Pressão
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s6, form_id, 'Meta 6 – Prevenção Lesão por Pressão', 6);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s6, 'M6_01', 'Escala de Braden aplicada na admissão e reavaliada conforme protocolo?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s6, 'M6_02', 'Mudança de decúbito registrada conforme protocolo (2/2h)?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s6, 'M6_03', 'Uso de superfície de redistribuição de pressão quando indicado?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s6, 'M6_04', 'Inspeção da pele registrada (admissão e diariamente)?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4),
    (s6, 'M6_05', 'Hidratação da pele e cuidados nutricionais registrados?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 5);
END $$;
