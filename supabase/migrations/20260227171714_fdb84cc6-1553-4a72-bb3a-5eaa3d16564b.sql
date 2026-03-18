
-- Table to track individual pendências with timestamps
CREATE TABLE public.passagem_plantao_pendencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  passagem_id UUID NOT NULL REFERENCES public.passagem_plantao(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  registrado_por_id UUID REFERENCES auth.users(id),
  registrado_por_nome TEXT NOT NULL,
  destinatario_id UUID REFERENCES auth.users(id),
  destinatario_nome TEXT,
  data_hora_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_hora_resolucao TIMESTAMPTZ,
  resolvido_por_id UUID REFERENCES auth.users(id),
  resolvido_por_nome TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvida')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for in-app push notifications
CREATE TABLE public.notificacoes_pendencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pendencia_id UUID NOT NULL REFERENCES public.passagem_plantao_pendencias(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  respondida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.passagem_plantao_pendencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_pendencias ENABLE ROW LEVEL SECURITY;

-- RLS policies for pendencias
CREATE POLICY "Authenticated users can view pendencias" ON public.passagem_plantao_pendencias
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pendencias" ON public.passagem_plantao_pendencias
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pendencias" ON public.passagem_plantao_pendencias
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notificacoes_pendencias
  FOR SELECT USING (destinatario_id = auth.uid());

CREATE POLICY "Authenticated users can insert notifications" ON public.notificacoes_pendencias
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their notifications" ON public.notificacoes_pendencias
  FOR UPDATE USING (destinatario_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes_pendencias;

-- Trigger for updated_at
CREATE TRIGGER update_passagem_plantao_pendencias_updated_at
  BEFORE UPDATE ON public.passagem_plantao_pendencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
