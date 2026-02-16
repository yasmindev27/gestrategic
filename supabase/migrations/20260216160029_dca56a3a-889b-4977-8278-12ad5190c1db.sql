
-- Storage bucket for professional documents
INSERT INTO storage.buckets (id, name, public) VALUES ('profissionais-docs', 'profissionais-docs', false);

-- RLS policies for the bucket
CREATE POLICY "Admin and RHDP can upload professional docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profissionais-docs'
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::public.app_role[])
);

CREATE POLICY "Admin and RHDP can view professional docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profissionais-docs'
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::public.app_role[])
);

CREATE POLICY "Admin and RHDP can delete professional docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profissionais-docs'
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::public.app_role[])
);

-- Table for professional documents
CREATE TABLE public.profissionais_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais_saude(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL, -- 'registro_classe', 'contrato', 'certificado', 'outro'
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  observacao TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profissionais_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and RHDP can manage professional docs"
ON public.profissionais_documentos FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::public.app_role[]));
