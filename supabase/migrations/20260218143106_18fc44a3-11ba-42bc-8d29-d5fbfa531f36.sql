
-- FIX 1: Make chat-anexos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-anexos';

-- Remove public read policy
DROP POLICY IF EXISTS "Public can view chat attachments" ON storage.objects;

-- Add authenticated read policy for chat participants
CREATE POLICY "Chat participants can read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-anexos' AND
  EXISTS (
    SELECT 1 FROM public.chat_mensagens cm
    JOIN public.chat_participantes cp ON cp.conversa_id = cm.conversa_id
    WHERE cm.arquivo_url LIKE '%' || storage.objects.name
    AND cp.user_id = auth.uid()
  )
);

-- FIX 2: Restrict quiz questions - only admins/gestors can see full data (including answers)
DROP POLICY IF EXISTS "Authenticated users can view quiz questions" ON public.lms_quiz_perguntas;

CREATE POLICY "Admin and managers can view full quiz questions"
ON public.lms_quiz_perguntas FOR SELECT TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role, 'rh_dp'::app_role, 'qualidade'::app_role])
);

-- Create a view without resposta_correta for regular users
CREATE OR REPLACE VIEW public.lms_quiz_perguntas_aluno AS
SELECT id, treinamento_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, ordem, created_at
FROM public.lms_quiz_perguntas;

GRANT SELECT ON public.lms_quiz_perguntas_aluno TO authenticated;

-- Create server-side function to grade quiz (so students never need access to answers)
CREATE OR REPLACE FUNCTION public.corrigir_quiz(
  _respostas jsonb,
  _treinamento_id uuid
)
RETURNS TABLE(acertos integer, total integer, nota integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acertos integer := 0;
  v_total integer := 0;
  v_pergunta RECORD;
BEGIN
  FOR v_pergunta IN
    SELECT id, resposta_correta FROM lms_quiz_perguntas
    WHERE treinamento_id = _treinamento_id
  LOOP
    v_total := v_total + 1;
    IF _respostas ->> v_pergunta.id::text = v_pergunta.resposta_correta THEN
      v_acertos := v_acertos + 1;
    END IF;
  END LOOP;

  acertos := v_acertos;
  total := v_total;
  nota := CASE WHEN v_total > 0 THEN ROUND((v_acertos::numeric / v_total) * 100) ELSE 0 END;
  RETURN NEXT;
END;
$$;
