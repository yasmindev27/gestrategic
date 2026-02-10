
-- Drop permissive INSERT/UPDATE/DELETE policies for all 5 security tables
DROP POLICY IF EXISTS "Usuários autenticados podem inserir uniformes" ON public.uniformes_seguranca;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar uniformes" ON public.uniformes_seguranca;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar uniformes" ON public.uniformes_seguranca;

DROP POLICY IF EXISTS "Usuários autenticados podem inserir EPIs" ON public.epis_seguranca;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar EPIs" ON public.epis_seguranca;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar EPIs" ON public.epis_seguranca;

DROP POLICY IF EXISTS "Usuários autenticados podem inserir vacinas" ON public.vacinas_seguranca;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar vacinas" ON public.vacinas_seguranca;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar vacinas" ON public.vacinas_seguranca;

DROP POLICY IF EXISTS "Usuários autenticados podem inserir rondas" ON public.rondas_seguranca;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar rondas" ON public.rondas_seguranca;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar rondas" ON public.rondas_seguranca;

DROP POLICY IF EXISTS "Usuários autenticados podem inserir notificações" ON public.notificacoes_seguranca;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar notificações" ON public.notificacoes_seguranca;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar notificações" ON public.notificacoes_seguranca;

-- Role-restricted policies for uniformes_seguranca
CREATE POLICY "Admin e Segurança podem inserir uniformes"
ON public.uniformes_seguranca FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

CREATE POLICY "Admin e Segurança podem atualizar uniformes"
ON public.uniformes_seguranca FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

CREATE POLICY "Admin e Segurança podem deletar uniformes"
ON public.uniformes_seguranca FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

-- Role-restricted policies for epis_seguranca
CREATE POLICY "Admin e Segurança podem inserir EPIs"
ON public.epis_seguranca FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

CREATE POLICY "Admin e Segurança podem atualizar EPIs"
ON public.epis_seguranca FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

CREATE POLICY "Admin e Segurança podem deletar EPIs"
ON public.epis_seguranca FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

-- Role-restricted policies for vacinas_seguranca
CREATE POLICY "Admin e Segurança podem inserir vacinas"
ON public.vacinas_seguranca FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

CREATE POLICY "Admin e Segurança podem atualizar vacinas"
ON public.vacinas_seguranca FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

CREATE POLICY "Admin e Segurança podem deletar vacinas"
ON public.vacinas_seguranca FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

-- Role-restricted policies for rondas_seguranca
CREATE POLICY "Admin e Segurança podem inserir rondas"
ON public.rondas_seguranca FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

CREATE POLICY "Admin e Segurança podem atualizar rondas"
ON public.rondas_seguranca FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

CREATE POLICY "Admin e Segurança podem deletar rondas"
ON public.rondas_seguranca FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

-- Role-restricted policies for notificacoes_seguranca
CREATE POLICY "Admin e Segurança podem inserir notificações"
ON public.notificacoes_seguranca FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

CREATE POLICY "Admin e Segurança podem atualizar notificações"
ON public.notificacoes_seguranca FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));

CREATE POLICY "Admin e Segurança podem deletar notificações"
ON public.notificacoes_seguranca FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));
