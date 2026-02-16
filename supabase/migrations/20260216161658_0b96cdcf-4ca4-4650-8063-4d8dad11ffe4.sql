
-- Add calibration fields to manutencoes_preventivas
ALTER TABLE public.manutencoes_preventivas 
  ADD COLUMN IF NOT EXISTS tipo_manutencao TEXT NOT NULL DEFAULT 'preventiva',
  ADD COLUMN IF NOT EXISTS requer_calibracao BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificado_calibracao TEXT,
  ADD COLUMN IF NOT EXISTS data_vencimento_calibracao DATE;

-- Create index for calibration lookups
CREATE INDEX IF NOT EXISTS idx_preventivas_calibracao ON public.manutencoes_preventivas(data_vencimento_calibracao) WHERE requer_calibracao = true;

-- Table: Pedidos de Compra
CREATE TABLE public.pedidos_compra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES public.produtos(id),
  ativo_id UUID REFERENCES public.ativos(id),
  setor_solicitante TEXT NOT NULL,
  solicitante_id UUID REFERENCES auth.users(id),
  solicitante_nome TEXT NOT NULL,
  item_nome TEXT NOT NULL,
  item_descricao TEXT,
  quantidade_solicitada INTEGER NOT NULL DEFAULT 1,
  unidade_medida TEXT DEFAULT 'UN',
  justificativa TEXT NOT NULL,
  urgencia TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'pendente',
  aprovado_por TEXT,
  aprovado_em TIMESTAMPTZ,
  observacoes_gerencia TEXT,
  data_estimada_entrega DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sector pedidos" ON public.pedidos_compra
  FOR SELECT TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[])
    OR setor_solicitante = public.get_user_setor(auth.uid())
  );

CREATE POLICY "Tech users can create pedidos" ON public.pedidos_compra
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','ti','manutencao','engenharia_clinica']::app_role[])
  );

CREATE POLICY "Admin/gestor can update pedidos" ON public.pedidos_compra
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[])
    OR solicitante_id = auth.uid()
  );

CREATE INDEX idx_pedidos_compra_setor ON public.pedidos_compra(setor_solicitante);
CREATE INDEX idx_pedidos_compra_status ON public.pedidos_compra(status);

CREATE TRIGGER update_pedidos_compra_updated_at
  BEFORE UPDATE ON public.pedidos_compra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
