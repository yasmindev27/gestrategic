
-- Juliane Machado: Enfermagem - Internação, Enfermagem - Urgência, Enfermagem, Classificação/Acolhimento, Enfermagem - Medicação
UPDATE public.incidentes_nsp SET responsavel_tratativa_nome = 'Juliane Machado' 
WHERE responsavel_tratativa_nome IN ('Enfermagem - Internação', 'Enfermagem - Urgência', 'Enfermagem', 'Classificação/Acolhimento', 'Enfermagem - Medicação');

-- Marcela Freitas: Corpo Clínico
UPDATE public.incidentes_nsp SET responsavel_tratativa_nome = 'Marcela Freitas' 
WHERE responsavel_tratativa_nome = 'Corpo Clínico';

-- Arthur Villac: Laboratório
UPDATE public.incidentes_nsp SET responsavel_tratativa_nome = 'Arthur Villac' 
WHERE responsavel_tratativa_nome = 'Laboratório';

-- Cristina Angelina: Farmácia
UPDATE public.incidentes_nsp SET responsavel_tratativa_nome = 'Cristina Angelina' 
WHERE responsavel_tratativa_nome = 'Farmácia';

-- Bruce Lee: Administrativo/Recepção, SESMT
UPDATE public.incidentes_nsp SET responsavel_tratativa_nome = 'Bruce Lee' 
WHERE responsavel_tratativa_nome IN ('Administrativo/Recepção', 'SESMT');
