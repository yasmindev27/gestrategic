
-- Fix the security definer view warning
ALTER VIEW public.lms_quiz_perguntas_aluno SET (security_invoker = on);
