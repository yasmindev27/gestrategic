
-- Tabela de alertas de segurança
CREATE TABLE public.alertas_seguranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'apoio' CHECK (tipo IN ('urgente', 'apoio')),
  setor TEXT NOT NULL,
  usuario_id UUID NOT NULL,
  usuario_nome TEXT NOT NULL,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_atendimento', 'atendido')),
  atendido_por UUID,
  atendido_por_nome TEXT,
  desfecho TEXT,
  atendido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem criar alertas
CREATE POLICY "Usuarios podem criar alertas"
ON public.alertas_seguranca FOR INSERT TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- Todos podem ver alertas (segurança precisa ver todos)
CREATE POLICY "Usuarios autenticados podem ver alertas"
ON public.alertas_seguranca FOR SELECT TO authenticated
USING (true);

-- Admin e segurança podem atualizar (atender)
CREATE POLICY "Seguranca e admin podem atualizar alertas"
ON public.alertas_seguranca FOR UPDATE TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'seguranca']::app_role[])
);

-- Trigger updated_at
CREATE TRIGGER update_alertas_seguranca_updated_at
BEFORE UPDATE ON public.alertas_seguranca
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas_seguranca;
