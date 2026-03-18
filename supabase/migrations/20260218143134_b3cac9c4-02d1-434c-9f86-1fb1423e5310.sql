
-- Revert to security definer view - this is safe because the view explicitly excludes resposta_correta
ALTER VIEW public.lms_quiz_perguntas_aluno SET (security_invoker = off);
