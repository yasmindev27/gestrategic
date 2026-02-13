
-- =============================================
-- LMS (Learning Management System) Tables
-- =============================================

-- Treinamentos (courses)
CREATE TABLE public.lms_treinamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  objetivo TEXT,
  tipo_treinamento TEXT NOT NULL DEFAULT 'Conhecimento', -- Conhecimento, Habilidade, Atitude
  metodo_identificacao TEXT,
  competencia TEXT,
  indicador_competencia TEXT,
  instrutor TEXT,
  carga_horaria TEXT,
  setor_responsavel TEXT,
  setores_alvo TEXT[] DEFAULT '{}',
  publico_alvo TEXT,
  data_limite DATE,
  mes_planejado INTEGER,
  ano INTEGER DEFAULT 2026,
  status TEXT NOT NULL DEFAULT 'planejado', -- planejado, em_andamento, realizado, cancelado, postergado
  nota_minima_aprovacao NUMERIC DEFAULT 70,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Materiais de treinamento
CREATE TABLE public.lms_materiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treinamento_id UUID NOT NULL REFERENCES public.lms_treinamentos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'pdf', -- pdf, video, link
  url TEXT,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz perguntas
CREATE TABLE public.lms_quiz_perguntas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treinamento_id UUID NOT NULL REFERENCES public.lms_treinamentos(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  opcao_a TEXT NOT NULL,
  opcao_b TEXT NOT NULL,
  opcao_c TEXT NOT NULL,
  opcao_d TEXT NOT NULL,
  resposta_correta TEXT NOT NULL, -- 'a', 'b', 'c', 'd'
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inscrições / vínculos de colaboradores com treinamentos
CREATE TABLE public.lms_inscricoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treinamento_id UUID NOT NULL REFERENCES public.lms_treinamentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usuario_nome TEXT NOT NULL,
  setor TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, material_acessado, em_avaliacao, capacitado, reprovado
  nota NUMERIC,
  data_conclusao TIMESTAMPTZ,
  material_acessado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(treinamento_id, usuario_id)
);

-- Tentativas de quiz
CREATE TABLE public.lms_tentativas_quiz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inscricao_id UUID NOT NULL REFERENCES public.lms_inscricoes(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES public.lms_treinamentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  respostas JSONB NOT NULL DEFAULT '{}',
  acertos INTEGER NOT NULL DEFAULT 0,
  total_perguntas INTEGER NOT NULL DEFAULT 0,
  nota NUMERIC NOT NULL DEFAULT 0,
  aprovado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lms_treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_tentativas_quiz ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lms_treinamentos
CREATE POLICY "Authenticated users can view trainings"
ON public.lms_treinamentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Gestor/RH/Quality can manage trainings"
ON public.lms_treinamentos FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','gestor','rh_dp','qualidade']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','gestor','rh_dp','qualidade']::app_role[]));

-- RLS Policies for lms_materiais
CREATE POLICY "Authenticated users can view materials"
ON public.lms_materiais FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Gestor/RH/Quality can manage materials"
ON public.lms_materiais FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','gestor','rh_dp','qualidade']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','gestor','rh_dp','qualidade']::app_role[]));

-- RLS Policies for lms_quiz_perguntas
CREATE POLICY "Authenticated users can view quiz questions"
ON public.lms_quiz_perguntas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Gestor/RH/Quality can manage quiz questions"
ON public.lms_quiz_perguntas FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','gestor','rh_dp','qualidade']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','gestor','rh_dp','qualidade']::app_role[]));

-- RLS Policies for lms_inscricoes
CREATE POLICY "Users can view own enrollments"
ON public.lms_inscricoes FOR SELECT TO authenticated
USING (usuario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin','gestor','rh_dp','qualidade']::app_role[]));

CREATE POLICY "Admin/Gestor/RH can manage enrollments"
ON public.lms_inscricoes FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin','gestor','rh_dp','qualidade']::app_role[]));

CREATE POLICY "Users or admin can update enrollments"
ON public.lms_inscricoes FOR UPDATE TO authenticated
USING (usuario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin','gestor','rh_dp','qualidade']::app_role[]));

-- RLS Policies for lms_tentativas_quiz
CREATE POLICY "Users can view own attempts"
ON public.lms_tentativas_quiz FOR SELECT TO authenticated
USING (usuario_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin','gestor','rh_dp','qualidade']::app_role[]));

CREATE POLICY "Users can create own attempts"
ON public.lms_tentativas_quiz FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_lms_treinamentos_updated_at
BEFORE UPDATE ON public.lms_treinamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lms_materiais_updated_at
BEFORE UPDATE ON public.lms_materiais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lms_inscricoes_updated_at
BEFORE UPDATE ON public.lms_inscricoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial data from LNTD spreadsheet
INSERT INTO public.lms_treinamentos (titulo, objetivo, tipo_treinamento, metodo_identificacao, competencia, indicador_competencia, instrutor, setores_alvo, publico_alvo, data_limite, status, setor_responsavel) VALUES
('Notificação NSP', 'Capacitar os colaboradores quanto à importância, correta identificação, registro e classificação das notificações de incidentes, eventos adversos, quase falhas e circunstâncias de risco.', 'Conhecimento', 'Segurança do Paciente', 'FOCO NO CLIENTE', 'Atua com foco na segurança do paciente', 'Camilla', ARRAY['Administrativos','Assistenciais','Terceirizados','PJ'], 'Todos os colaboradores', '2026-02-06', 'realizado', 'NSP / Qualidade'),
('Política de Registro Seguro', 'Capacitar os colaboradores para a realização de registros assistenciais completos, claros, fidedignos e oportunos.', 'Conhecimento', 'Demanda Legal', 'FOCO NO CLIENTE', 'Realiza o melhor procedimento para o paciente', 'Camilla', ARRAY['Administrativos','Assistenciais','Terceirizados','PJ'], 'Todos os colaboradores', '2026-03-06', 'planejado', 'NSP / Qualidade'),
('Protocolo de Prevenção de Retirada Acidental de SNE', 'Capacitar os colaboradores para identificar fatores de risco e adotar medidas preventivas na manutenção da sonda nasoenteral.', 'Habilidade (Técnico)', 'Desenvolvimento Técnico', 'FOCO NO CLIENTE', 'Tem foco na segurança da dieta do paciente', 'Camilla', ARRAY['Assistenciais'], 'Enfermagem', '2026-04-06', 'planejado', 'NSP / Qualidade'),
('Protocolo de Prevenção de Broncoaspiração', 'Capacitar os colaboradores para identificar pacientes de risco e adotar medidas seguras na prevenção da broncoaspiração.', 'Habilidade (Técnico)', 'Desenvolvimento Técnico', 'FOCO NO CLIENTE', 'Atua com foco na segurança do paciente', 'Camilla', ARRAY['Assistenciais'], 'Enfermagem e Médicos', '2026-05-08', 'planejado', 'NSP / Qualidade'),
('Transporte Intra e Extra Hospitalar', 'Capacitar os colaboradores para realizar o transporte intra e extra-hospitalar de forma segura e padronizada.', 'Conhecimento', 'Segurança do Paciente', 'FOCO NO CLIENTE', 'Atua com foco na segurança do paciente', 'Camilla', ARRAY['Assistenciais'], 'Enfermagem e Médicos', '2026-06-08', 'planejado', 'NSP / Qualidade'),
('Atitude e Conduta Comportamental da Enfermagem', 'Treinamento voltado ao desenvolvimento de atitudes comportamentais seguras da equipe de enfermagem diante de situações críticas.', 'Atitude (Comportamental)', 'Segurança do Paciente', 'HUMANIZAÇÃO', 'Resolve as dúvidas e situações de atendimento com acolhimento', 'Camilla', ARRAY['Assistenciais'], 'Enfermagem', '2026-07-06', 'planejado', 'NSP / Qualidade'),
('NSP - Farmácia', 'Treinamento de segurança do paciente para equipe de farmácia.', 'Conhecimento', 'Segurança do Paciente', 'FOCO NO CLIENTE', 'Atua com foco na segurança do paciente', 'Farmacêutico RT', ARRAY['Assistenciais'], 'Farmácia', '2026-07-30', 'planejado', 'Farmácia'),
('Dispensação de materiais e medicamentos', 'Capacitar equipe multidisciplinar sobre dispensação correta.', 'Conhecimento', 'Desenvolvimento Técnico', 'FOCO NO CLIENTE', 'Atua com foco na segurança do paciente', 'Farmacêutico RT', ARRAY['Institucional'], 'Equipe Multidisciplinar', '2026-08-31', 'planejado', 'Farmácia'),
('Identificação e segregação de materiais e medicamentos', 'Identificação correta e segregação de materiais e medicamentos.', 'Habilidade (Técnico)', 'Desenvolvimento Técnico', 'FOCO NO CLIENTE', 'Atua com foco na segurança do paciente', 'Farmacêutica RT', ARRAY['Assistenciais'], 'Farmácia e Almoxarifado', '2026-09-29', 'planejado', 'Farmácia'),
('Carrinho de emergência e maleta', 'Treinamento sobre uso do carrinho de emergência e maleta.', 'Habilidade (Técnico)', 'Segurança do Paciente', 'FOCO NO CLIENTE', 'Atua com foco na segurança do paciente', 'Farmacêutico RT', ARRAY['Assistenciais'], 'Farmácia', '2026-10-26', 'planejado', 'Farmácia');
