-- Tabela para controle de uniformes
CREATE TABLE public.uniformes_seguranca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  usuario_nome TEXT NOT NULL,
  tipo_uniforme TEXT NOT NULL,
  tamanho TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_entrega DATE NOT NULL,
  data_devolucao DATE,
  status TEXT NOT NULL DEFAULT 'entregue',
  observacao TEXT,
  registrado_por UUID NOT NULL,
  registrado_por_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para controle de EPIs
CREATE TABLE public.epis_seguranca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  usuario_nome TEXT NOT NULL,
  tipo_epi TEXT NOT NULL,
  ca_numero TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_entrega DATE NOT NULL,
  data_validade DATE,
  status TEXT NOT NULL DEFAULT 'em_uso',
  observacao TEXT,
  registrado_por UUID NOT NULL,
  registrado_por_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para controle de vacinação
CREATE TABLE public.vacinas_seguranca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  usuario_nome TEXT NOT NULL,
  tipo_vacina TEXT NOT NULL,
  dose TEXT,
  data_aplicacao DATE NOT NULL,
  data_proxima_dose DATE,
  lote TEXT,
  local_aplicacao TEXT,
  status TEXT NOT NULL DEFAULT 'aplicada',
  observacao TEXT,
  registrado_por UUID NOT NULL,
  registrado_por_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para rondas diárias
CREATE TABLE public.rondas_seguranca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_ronda DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_ronda TIME NOT NULL DEFAULT CURRENT_TIME,
  responsavel_id UUID NOT NULL,
  responsavel_nome TEXT NOT NULL,
  setor TEXT NOT NULL,
  checklist JSONB NOT NULL DEFAULT '{}',
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para notificações geradas nas rondas
CREATE TABLE public.notificacoes_seguranca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ronda_id UUID REFERENCES public.rondas_seguranca(id) ON DELETE CASCADE,
  tipo_notificacao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  setor TEXT NOT NULL,
  responsavel_notificado TEXT,
  prioridade TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'pendente',
  resolvido_em TIMESTAMP WITH TIME ZONE,
  resolvido_por UUID,
  resolvido_por_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.uniformes_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epis_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacinas_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rondas_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_seguranca ENABLE ROW LEVEL SECURITY;

-- Políticas para uniformes
CREATE POLICY "Usuários autenticados podem ver uniformes" ON public.uniformes_seguranca
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir uniformes" ON public.uniformes_seguranca
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar uniformes" ON public.uniformes_seguranca
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar uniformes" ON public.uniformes_seguranca
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para EPIs
CREATE POLICY "Usuários autenticados podem ver EPIs" ON public.epis_seguranca
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir EPIs" ON public.epis_seguranca
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar EPIs" ON public.epis_seguranca
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar EPIs" ON public.epis_seguranca
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para vacinas
CREATE POLICY "Usuários autenticados podem ver vacinas" ON public.vacinas_seguranca
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir vacinas" ON public.vacinas_seguranca
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar vacinas" ON public.vacinas_seguranca
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar vacinas" ON public.vacinas_seguranca
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para rondas
CREATE POLICY "Usuários autenticados podem ver rondas" ON public.rondas_seguranca
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir rondas" ON public.rondas_seguranca
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar rondas" ON public.rondas_seguranca
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar rondas" ON public.rondas_seguranca
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Políticas para notificações
CREATE POLICY "Usuários autenticados podem ver notificações" ON public.notificacoes_seguranca
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir notificações" ON public.notificacoes_seguranca
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar notificações" ON public.notificacoes_seguranca
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar notificações" ON public.notificacoes_seguranca
  FOR DELETE USING (auth.uid() IS NOT NULL);