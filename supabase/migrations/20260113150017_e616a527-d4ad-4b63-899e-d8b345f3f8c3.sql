-- Drop existing problematic policies on agenda_items
DROP POLICY IF EXISTS "Admin gerencia todos os itens de agenda" ON public.agenda_items;
DROP POLICY IF EXISTS "Gestor pode criar itens de agenda" ON public.agenda_items;
DROP POLICY IF EXISTS "Usuário pode atualizar seus próprios itens" ON public.agenda_items;
DROP POLICY IF EXISTS "Usuário pode deletar seus próprios itens" ON public.agenda_items;
DROP POLICY IF EXISTS "Usuário visualiza itens destinados a ele" ON public.agenda_items;
DROP POLICY IF EXISTS "Usuário visualiza itens que criou" ON public.agenda_items;

-- Drop existing problematic policies on agenda_destinatarios
DROP POLICY IF EXISTS "Admin gerencia todos os destinatários" ON public.agenda_destinatarios;
DROP POLICY IF EXISTS "Criador pode gerenciar destinatários" ON public.agenda_destinatarios;
DROP POLICY IF EXISTS "Destinatário pode marcar como visualizado" ON public.agenda_destinatarios;
DROP POLICY IF EXISTS "Destinatário visualiza seu registro" ON public.agenda_destinatarios;

-- Create helper function to check if user is recipient of an agenda item (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_agenda_recipient(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.agenda_destinatarios
        WHERE usuario_id = _user_id AND agenda_item_id = _item_id
    )
$$;

-- Create helper function to check if user created the agenda item
CREATE OR REPLACE FUNCTION public.is_agenda_creator(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.agenda_items
        WHERE criado_por = _user_id AND id = _item_id
    )
$$;

-- Recreate policies for agenda_items
CREATE POLICY "Admin full access agenda_items"
ON public.agenda_items FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "User can insert agenda_items"
ON public.agenda_items FOR INSERT
TO authenticated
WITH CHECK (criado_por = auth.uid());

CREATE POLICY "User can view own created items"
ON public.agenda_items FOR SELECT
TO authenticated
USING (criado_por = auth.uid());

CREATE POLICY "User can view items as recipient"
ON public.agenda_items FOR SELECT
TO authenticated
USING (is_agenda_recipient(auth.uid(), id));

CREATE POLICY "User can update own items"
ON public.agenda_items FOR UPDATE
TO authenticated
USING (criado_por = auth.uid());

CREATE POLICY "User can delete own items"
ON public.agenda_items FOR DELETE
TO authenticated
USING (criado_por = auth.uid());

-- Recreate policies for agenda_destinatarios
CREATE POLICY "Admin full access agenda_destinatarios"
ON public.agenda_destinatarios FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creator can manage recipients"
ON public.agenda_destinatarios FOR ALL
TO authenticated
USING (is_agenda_creator(auth.uid(), agenda_item_id));

CREATE POLICY "Recipient can view own record"
ON public.agenda_destinatarios FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "Recipient can update own record"
ON public.agenda_destinatarios FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());