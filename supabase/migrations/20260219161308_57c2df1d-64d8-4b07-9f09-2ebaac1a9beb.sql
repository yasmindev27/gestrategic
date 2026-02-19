
-- Motoristas e veículos
CREATE TABLE public.transferencia_veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placa TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'ambulancia',
  motorista_nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponivel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transferencia_veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicles" ON public.transferencia_veiculos
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin/NIR can manage vehicles" ON public.transferencia_veiculos
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['admin','nir']::app_role[]));

-- Solicitações de transferência
CREATE TABLE public.transferencia_solicitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_nome TEXT NOT NULL,
  setor_origem TEXT NOT NULL,
  destino TEXT NOT NULL,
  motivo TEXT,
  prioridade TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pendente',
  veiculo_id UUID REFERENCES public.transferencia_veiculos(id),
  hora_saida TIMESTAMPTZ,
  hora_chegada TIMESTAMPTZ,
  solicitado_por UUID REFERENCES auth.users(id),
  solicitado_por_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transferencia_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfers" ON public.transferencia_solicitacoes
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert transfers" ON public.transferencia_solicitacoes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin/NIR can update transfers" ON public.transferencia_solicitacoes
  FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['admin','nir']::app_role[]));

CREATE TRIGGER update_transferencia_veiculos_updated_at BEFORE UPDATE ON public.transferencia_veiculos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transferencia_solicitacoes_updated_at BEFORE UPDATE ON public.transferencia_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
