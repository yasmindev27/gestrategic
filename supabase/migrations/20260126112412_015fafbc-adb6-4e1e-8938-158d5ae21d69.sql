-- Criar tabela de conversas/canais de chat
CREATE TABLE public.chat_conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'grupo' CHECK (tipo IN ('grupo', 'privado')),
  criado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela de participantes da conversa
CREATE TABLE public.chat_participantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  adicionado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversa_id, user_id)
);

-- Criar tabela de mensagens
CREATE TABLE public.chat_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  remetente_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'arquivo')),
  arquivo_url TEXT,
  editado BOOLEAN DEFAULT false,
  excluido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela de denúncias/logs de moderação
CREATE TABLE public.chat_moderacao_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem_id UUID REFERENCES public.chat_mensagens(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  tipo_violacao VARCHAR(50) NOT NULL,
  conteudo_original TEXT,
  acao_tomada VARCHAR(50) NOT NULL,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_moderacao_logs ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário é participante de uma conversa
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id UUID, _conversa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participantes
    WHERE user_id = _user_id AND conversa_id = _conversa_id
  )
$$;

-- Políticas para chat_conversas
CREATE POLICY "Usuários podem ver conversas das quais participam"
ON public.chat_conversas FOR SELECT
TO authenticated
USING (public.is_chat_participant(auth.uid(), id) OR criado_por = auth.uid());

CREATE POLICY "Usuários autenticados podem criar conversas"
ON public.chat_conversas FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Criador pode atualizar conversa"
ON public.chat_conversas FOR UPDATE
TO authenticated
USING (criado_por = auth.uid());

-- Políticas para chat_participantes
CREATE POLICY "Participantes podem ver outros participantes"
ON public.chat_participantes FOR SELECT
TO authenticated
USING (public.is_chat_participant(auth.uid(), conversa_id));

CREATE POLICY "Criador pode adicionar participantes"
ON public.chat_participantes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_conversas
    WHERE id = conversa_id AND criado_por = auth.uid()
  ) OR auth.uid() = user_id
);

CREATE POLICY "Usuário pode sair da conversa"
ON public.chat_participantes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Políticas para chat_mensagens
CREATE POLICY "Participantes podem ver mensagens"
ON public.chat_mensagens FOR SELECT
TO authenticated
USING (public.is_chat_participant(auth.uid(), conversa_id));

CREATE POLICY "Participantes podem enviar mensagens"
ON public.chat_mensagens FOR INSERT
TO authenticated
WITH CHECK (
  public.is_chat_participant(auth.uid(), conversa_id) 
  AND auth.uid() = remetente_id
);

CREATE POLICY "Remetente pode editar/excluir mensagem"
ON public.chat_mensagens FOR UPDATE
TO authenticated
USING (remetente_id = auth.uid());

-- Políticas para chat_moderacao_logs (apenas admins)
CREATE POLICY "Admins podem ver logs de moderação"
ON public.chat_moderacao_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema pode inserir logs"
ON public.chat_moderacao_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;

-- Índices para performance
CREATE INDEX idx_chat_mensagens_conversa ON public.chat_mensagens(conversa_id, created_at DESC);
CREATE INDEX idx_chat_participantes_user ON public.chat_participantes(user_id);
CREATE INDEX idx_chat_participantes_conversa ON public.chat_participantes(conversa_id);

-- Criar canal geral automaticamente
INSERT INTO public.chat_conversas (id, nome, descricao, tipo, criado_por)
VALUES ('00000000-0000-0000-0000-000000000001', 'Geral', 'Canal geral da empresa para comunicação entre todos os colaboradores', 'grupo', '00000000-0000-0000-0000-000000000000');