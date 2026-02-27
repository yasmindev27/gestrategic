
-- Drop the old policy and recreate with seguranca support
DROP POLICY "Setores técnicos e Admin gerenciam produtos do seu setor" ON public.produtos;

CREATE POLICY "Setores técnicos e Admin gerenciam produtos do seu setor"
ON public.produtos
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'ti'::app_role) AND setor_responsavel = 'ti')
  OR (has_role(auth.uid(), 'manutencao'::app_role) AND setor_responsavel = 'manutencao')
  OR (has_role(auth.uid(), 'engenharia_clinica'::app_role) AND setor_responsavel = 'engenharia_clinica')
  OR (has_role(auth.uid(), 'laboratorio'::app_role) AND setor_responsavel = 'laboratorio')
  OR (has_role(auth.uid(), 'seguranca'::app_role) AND setor_responsavel IN ('seguranca_uniformes', 'seguranca_epis'))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'ti'::app_role) AND setor_responsavel = 'ti')
  OR (has_role(auth.uid(), 'manutencao'::app_role) AND setor_responsavel = 'manutencao')
  OR (has_role(auth.uid(), 'engenharia_clinica'::app_role) AND setor_responsavel = 'engenharia_clinica')
  OR (has_role(auth.uid(), 'laboratorio'::app_role) AND setor_responsavel = 'laboratorio')
  OR (has_role(auth.uid(), 'seguranca'::app_role) AND setor_responsavel IN ('seguranca_uniformes', 'seguranca_epis'))
);
