-- Tabela para rastrear leitura de mensagens
CREATE TABLE public.chat_mensagens_lidas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID NOT NULL REFERENCES public.chat_mensagens(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    lido_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(mensagem_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.chat_mensagens_lidas ENABLE ROW LEVEL SECURITY;

-- Política para inserir leitura própria
CREATE POLICY "Usuários podem marcar suas próprias leituras"
ON public.chat_mensagens_lidas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política para visualizar leituras de mensagens em conversas que participa
CREATE POLICY "Usuários podem ver leituras de suas conversas"
ON public.chat_mensagens_lidas
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_mensagens m
        JOIN public.chat_participantes p ON p.conversa_id = m.conversa_id
        WHERE m.id = mensagem_id AND p.user_id = auth.uid()
    )
);

-- Habilitar realtime para atualizações de leitura
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens_lidas;

-- Índice para performance
CREATE INDEX idx_chat_mensagens_lidas_mensagem ON public.chat_mensagens_lidas(mensagem_id);
CREATE INDEX idx_chat_mensagens_lidas_user ON public.chat_mensagens_lidas(user_id);