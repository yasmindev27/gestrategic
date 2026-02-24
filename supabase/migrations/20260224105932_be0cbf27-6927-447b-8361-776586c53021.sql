
CREATE TABLE public.asos_seguranca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_nome TEXT NOT NULL,
  colaborador_user_id UUID,
  tipo_aso TEXT NOT NULL CHECK (tipo_aso IN ('admissional', 'periodico', 'retorno_trabalho', 'mudanca_funcao', 'demissional')),
  data_exame DATE NOT NULL,
  data_validade DATE,
  resultado TEXT NOT NULL DEFAULT 'apto' CHECK (resultado IN ('apto', 'inapto', 'apto_com_restricao')),
  medico_nome TEXT,
  crm TEXT,
  cargo_atual TEXT,
  cargo_novo TEXT,
  setor TEXT,
  riscos_ocupacionais TEXT,
  exames_realizados TEXT,
  restricoes TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente', 'vencido', 'cancelado')),
  registrado_por UUID DEFAULT auth.uid(),
  registrado_por_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asos_seguranca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e seguranca podem ver ASOs" ON public.asos_seguranca
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin', 'seguranca']::app_role[]));

CREATE POLICY "Admin e seguranca podem inserir ASOs" ON public.asos_seguranca
  FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'seguranca']::app_role[]));

CREATE POLICY "Admin e seguranca podem atualizar ASOs" ON public.asos_seguranca
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['admin', 'seguranca']::app_role[]));

CREATE POLICY "Admin e seguranca podem deletar ASOs" ON public.asos_seguranca
  FOR DELETE USING (has_any_role(auth.uid(), ARRAY['admin', 'seguranca']::app_role[]));

CREATE TRIGGER update_asos_seguranca_updated_at
  BEFORE UPDATE ON public.asos_seguranca
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
