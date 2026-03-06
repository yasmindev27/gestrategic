
DO $$
DECLARE
  form_id uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  s3 uuid := gen_random_uuid();
  s4 uuid := gen_random_uuid();
  s5 uuid := gen_random_uuid();
  s6 uuid := gen_random_uuid();
BEGIN
  -- Formulário
  INSERT INTO public.auditoria_formularios_config (id, nome, tipo, ativo, ordem, setores, icone)
  VALUES (form_id, 'Auditoria de Segurança do Paciente', 'seguranca_paciente', true, 1,
    ARRAY['Internação','Urgência','Medicação','Classificação','Observação'], 'ShieldCheck');

  -- Seção 1
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s1, form_id, 'Meta 1 – Identificação Correta do Paciente', 1);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s1, 'M1_01', 'Paciente com pulseira de identificação?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s1, 'M1_02', 'Pulseira legível e com dados corretos (nome completo, data de nascimento, nº prontuário)?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s1, 'M1_03', 'Conferência de identificação antes de administrar medicamentos?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s1, 'M1_04', 'Conferência de identificação antes de procedimentos?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4),
    (s1, 'M1_05', 'Conferência de identificação antes de coleta de exames?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 5);

  -- Seção 2
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s2, form_id, 'Meta 2 – Comunicação Efetiva', 2);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s2, 'M2_01', 'Prescrição médica legível e sem abreviaturas proibidas?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s2, 'M2_02', 'Ordens verbais com read-back confirmado?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s2, 'M2_03', 'Passagem de plantão estruturada (SBAR/I-PASS)?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s2, 'M2_04', 'Resultados críticos comunicados em tempo hábil?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4);

  -- Seção 3
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s3, form_id, 'Meta 3 – Segurança de Medicamentos de Alta Vigilância', 3);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s3, 'M3_01', 'Medicamentos de alta vigilância identificados e armazenados separadamente?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s3, 'M3_02', 'Dupla checagem realizada para medicamentos de alta vigilância?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s3, 'M3_03', 'Eletrólitos concentrados não acessíveis em áreas assistenciais?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s3, 'M3_04', 'Certos (paciente, medicamento, dose, via, horário) conferidos na administração?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4);

  -- Seção 4
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s4, form_id, 'Meta 4 – Cirurgia Segura', 4);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s4, 'M4_01', 'Checklist de cirurgia segura (OMS) aplicado?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s4, 'M4_02', 'Lateralidade demarcada quando aplicável?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s4, 'M4_03', 'Time-out realizado com toda a equipe?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3);

  -- Seção 5
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s5, form_id, 'Meta 5 – Prevenção de Infecções Relacionadas à Assistência', 5);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s5, 'M5_01', 'Higienização das mãos nos 5 momentos preconizados pela OMS?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s5, 'M5_02', 'Disponibilidade de álcool gel nos pontos de assistência?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s5, 'M5_03', 'Precauções de isolamento seguidas conforme indicação?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s5, 'M5_04', 'Bundle de prevenção de infecção de cateter central aplicado?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4),
    (s5, 'M5_05', 'Bundle de prevenção de ITU associada a cateter vesical aplicado?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 5);

  -- Seção 6
  INSERT INTO public.auditoria_secoes_config (id, formulario_id, nome, ordem) VALUES (s6, form_id, 'Meta 6 – Prevenção de Quedas e Lesão por Pressão', 6);
  INSERT INTO public.auditoria_perguntas_config (secao_id, codigo, label, opcoes, ativo, ordem) VALUES
    (s6, 'M6_01', 'Escala de risco de queda (Morse/Humpty Dumpty) aplicada na admissão?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 1),
    (s6, 'M6_02', 'Grades de proteção elevadas para pacientes de risco?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 2),
    (s6, 'M6_03', 'Escala de Braden aplicada para risco de lesão por pressão?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 3),
    (s6, 'M6_04', 'Mudança de decúbito registrada conforme protocolo?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 4),
    (s6, 'M6_05', 'Sinalização visual de risco de queda no leito?', ARRAY['conforme','nao_conforme','nao_aplica'], true, 5);
END $$;
