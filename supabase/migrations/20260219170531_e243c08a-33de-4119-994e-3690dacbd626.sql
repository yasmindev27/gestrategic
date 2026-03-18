
-- Table to store GPS coordinates during missions
CREATE TABLE public.transferencia_coordenadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.transferencia_solicitacoes(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  registrado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for quick lookup by mission
CREATE INDEX idx_transferencia_coordenadas_solicitacao ON public.transferencia_coordenadas(solicitacao_id, registrado_em);

-- Enable RLS
ALTER TABLE public.transferencia_coordenadas ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert coordinates (drivers tracking themselves)
CREATE POLICY "Authenticated users can insert coordinates"
ON public.transferencia_coordenadas FOR INSERT
TO authenticated
WITH CHECK (true);

-- Any authenticated user can read coordinates
CREATE POLICY "Authenticated users can read coordinates"
ON public.transferencia_coordenadas FOR SELECT
TO authenticated
USING (true);
