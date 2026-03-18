
-- Create reunioes table
CREATE TABLE public.reunioes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  pauta TEXT,
  participantes UUID[] DEFAULT '{}',
  transcricao TEXT,
  ata_gerada JSONB,
  gravacao_url TEXT,
  status TEXT NOT NULL DEFAULT 'agendada',
  criado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view reunioes they created or participate in"
ON public.reunioes FOR SELECT
USING (auth.uid() = criado_por OR auth.uid() = ANY(participantes));

CREATE POLICY "Authenticated users can create reunioes"
ON public.reunioes FOR INSERT
WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Creators can update their reunioes"
ON public.reunioes FOR UPDATE
USING (auth.uid() = criado_por);

CREATE POLICY "Creators can delete their reunioes"
ON public.reunioes FOR DELETE
USING (auth.uid() = criado_por);

-- Trigger for updated_at
CREATE TRIGGER update_reunioes_updated_at
BEFORE UPDATE ON public.reunioes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('reunioes', 'reunioes', false);

-- Storage RLS policies
CREATE POLICY "Users can upload reuniao recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reunioes' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view reuniao recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'reunioes' AND auth.uid() IS NOT NULL);
