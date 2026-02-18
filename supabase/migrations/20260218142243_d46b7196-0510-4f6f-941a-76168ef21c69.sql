
-- Allow gestores to view patient safety audits (including prontuario evaluations)
DROP POLICY "Qualidade/NSP/Admin can view all patient safety audits" ON public.auditorias_seguranca_paciente;

CREATE POLICY "Admin, Qualidade, NSP e Gestor podem visualizar auditorias"
ON public.auditorias_seguranca_paciente
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role]));
