
-- 1. COLABORADORES_RESTAURANTE
DROP POLICY IF EXISTS "Colaboradores ativos são públicos para leitura" ON public.colaboradores_restaurante;
DROP POLICY IF EXISTS "Colaboradores são visíveis para todos autenticados" ON public.colaboradores_restaurante;
DROP POLICY IF EXISTS "Totem can view active employees only" ON public.colaboradores_restaurante;
DROP POLICY IF EXISTS "Gestão pode ver colaboradores restaurante" ON public.colaboradores_restaurante;

CREATE POLICY "Totem read active employees anon"
  ON public.colaboradores_restaurante FOR SELECT TO anon
  USING (ativo = true);

CREATE POLICY "Authenticated relevant roles view colaboradores"
  ON public.colaboradores_restaurante FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role, 'gestor'::app_role, 'rh_dp'::app_role, 'enfermagem'::app_role])
  );

-- 2. MOVIMENTACOES_ESTOQUE
DROP POLICY IF EXISTS "Usuários autenticados visualizam movimentações" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Setores técnicos e Admin inserem movimentações do seu setor" ON public.movimentacoes_estoque;

CREATE POLICY "Setores tecnicos Admin insert movimentacoes"
  ON public.movimentacoes_estoque FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'ti'::app_role) AND setor = 'ti')
    OR (has_role(auth.uid(), 'manutencao'::app_role) AND setor = 'manutencao')
    OR (has_role(auth.uid(), 'engenharia_clinica'::app_role) AND setor = 'engenharia_clinica')
    OR (has_role(auth.uid(), 'laboratorio'::app_role) AND setor = 'laboratorio')
  );

-- 3. CHAMADOS_COMENTARIOS
DROP POLICY IF EXISTS "Usuários autenticados visualizam comentários" ON public.chamados_comentarios;
DROP POLICY IF EXISTS "Usuários autenticados podem comentar" ON public.chamados_comentarios;

CREATE POLICY "Authenticated users view comentarios"
  ON public.chamados_comentarios FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users insert comentarios"
  ON public.chamados_comentarios FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- 4. CHAMADOS_MATERIAIS
DROP POLICY IF EXISTS "Usuários autenticados visualizam materiais" ON public.chamados_materiais;
DROP POLICY IF EXISTS "TI Manutencao Engenharia e Admin inserem materiais" ON public.chamados_materiais;

CREATE POLICY "Authenticated users view materiais"
  ON public.chamados_materiais FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "TI Manutencao Engenharia Admin insert materiais"
  ON public.chamados_materiais FOR INSERT TO authenticated
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'ti'::app_role, 'manutencao'::app_role, 'engenharia_clinica'::app_role])
  );

-- 5. PROTOCOLO_ATENDIMENTOS
DROP POLICY IF EXISTS "Authenticated users can view protocol attendances" ON public.protocolo_atendimentos;
DROP POLICY IF EXISTS "Authenticated users can insert protocol attendances" ON public.protocolo_atendimentos;
DROP POLICY IF EXISTS "Users can update their own or admins can update all" ON public.protocolo_atendimentos;
DROP POLICY IF EXISTS "Admins can delete protocol attendances" ON public.protocolo_atendimentos;

CREATE POLICY "Clinical roles view protocolo_atendimentos"
  ON public.protocolo_atendimentos FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'enfermagem'::app_role, 'medicos'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role, 'coordenador_medico'::app_role, 'coordenador_enfermagem'::app_role, 'nir'::app_role])
    OR auth.uid() = created_by
  );

CREATE POLICY "Clinical roles insert protocolo_atendimentos"
  ON public.protocolo_atendimentos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or admin update protocolo_atendimentos"
  ON public.protocolo_atendimentos FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin delete protocolo_atendimentos"
  ON public.protocolo_atendimentos FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- 6. PORTA_ECG_ATENDIMENTOS
DROP POLICY IF EXISTS "Authenticated users can view porta_ecg_atendimentos" ON public.porta_ecg_atendimentos;

CREATE POLICY "Clinical roles view porta_ecg"
  ON public.porta_ecg_atendimentos FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'enfermagem'::app_role, 'medicos'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'nir'::app_role, 'coordenador_medico'::app_role, 'coordenador_enfermagem'::app_role])
    OR auth.uid() = created_by
  );

-- 7. NOTIFICACOES_ARBOVIROSES
DROP POLICY IF EXISTS "Authenticated users can view arboviroses" ON public.notificacoes_arboviroses;
DROP POLICY IF EXISTS "Authenticated users can insert arboviroses" ON public.notificacoes_arboviroses;
DROP POLICY IF EXISTS "Authenticated users can update arboviroses" ON public.notificacoes_arboviroses;

CREATE POLICY "Clinical roles view arboviroses"
  ON public.notificacoes_arboviroses FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'enfermagem'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role, 'coordenador_enfermagem'::app_role])
  );

CREATE POLICY "Clinical roles insert arboviroses"
  ON public.notificacoes_arboviroses FOR INSERT TO authenticated
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'enfermagem'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role, 'coordenador_enfermagem'::app_role])
  );

CREATE POLICY "Clinical roles update arboviroses"
  ON public.notificacoes_arboviroses FOR UPDATE TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'enfermagem'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role])
  );

-- 8. SCIRAS tables
DROP POLICY IF EXISTS "Auth users can view IRAS" ON public.sciras_vigilancia_iras;
CREATE POLICY "Clinical roles view IRAS"
  ON public.sciras_vigilancia_iras FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'enfermagem'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role, 'medicos'::app_role, 'coordenador_enfermagem'::app_role])
  );

DROP POLICY IF EXISTS "Auth users can view antimicrobianos" ON public.sciras_antimicrobianos;
CREATE POLICY "Clinical roles view antimicrobianos"
  ON public.sciras_antimicrobianos FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'enfermagem'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role, 'medicos'::app_role, 'farmaceutico_rt'::app_role])
  );

DROP POLICY IF EXISTS "Auth users can view culturas" ON public.sciras_culturas;
CREATE POLICY "Clinical roles view culturas"
  ON public.sciras_culturas FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'enfermagem'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role, 'medicos'::app_role, 'laboratorio'::app_role])
  );

DROP POLICY IF EXISTS "Auth users can view notificacoes epi" ON public.sciras_notificacoes_epidemiologicas;
CREATE POLICY "Clinical roles view notificacoes epi"
  ON public.sciras_notificacoes_epidemiologicas FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'enfermagem'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role, 'coordenador_enfermagem'::app_role])
  );

-- 9. SEG_PATRIMONIAL_VISITANTES
DROP POLICY IF EXISTS "Auth users can read visitantes" ON public.seg_patrimonial_visitantes;
CREATE POLICY "Security roles view visitantes"
  ON public.seg_patrimonial_visitantes FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role, 'gestor'::app_role])
    OR auth.uid() = registrado_por
  );
