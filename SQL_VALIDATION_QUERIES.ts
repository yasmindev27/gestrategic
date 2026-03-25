/**
 * 🔍 QUERIES SQL DE VALIDAÇÃO
 * 
 * Use estas queries no Supabase Studio para validar integridade dos dados
 * antes de colocar o sistema em produção
 */

// ============================================================================
// 1️⃣ VALIDAR TABELA PROFILES
// ============================================================================

/*
-- Verificar se há perfis SEM EMAIL:
SELECT user_id, matricula, full_name 
FROM profiles 
WHERE email IS NULL 
   OR email = '';
▫️ EXPECTATIVA: 0 linhas

-- Verificar se há perfis SEM MATRÍCULA (ainda válido, pois email é suficiente):
SELECT user_id, email, full_name 
FROM profiles 
WHERE matricula IS NULL 
   OR matricula = '';
▫️ EXPECTATIVA: Qualquer número é ok (usuários que fazem login apenas por email)

-- Verificar matrículas DUPLICADAS:
SELECT matricula, COUNT(*) as total 
FROM profiles 
WHERE matricula IS NOT NULL 
GROUP BY matricula 
HAVING COUNT(*) > 1 
ORDER BY total DESC;
▫️ EXPECTATIVA: 0 linhas

-- Verificar emails DUPLICADOS:
SELECT email, COUNT(*) as total 
FROM profiles 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1 
ORDER BY total DESC;
▫️ EXPECTATIVA: 0 linhas (emails devem ser únicos)

-- Listar todos os usuários com ambos email e matrícula:
SELECT user_id, email, matricula, full_name, created_at 
FROM profiles 
WHERE email IS NOT NULL 
  AND matricula IS NOT NULL 
ORDER BY created_at DESC;
▫️ OBJETIVO: Revisar estrutura geral
*/

// ============================================================================
// 2️⃣ SINCRONIZAR COM SUPABASE AUTH
// ============================================================================

/*
-- Encontrar emails em profiles que NÃO estão em auth.users:
SELECT p.user_id, p.email, p.full_name 
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL;
▫️ EXPECTATIVA: 0 linhas (todos os profiles devem ter usuário correspondente)

-- Encontrar usuarios em auth.users cujo email NÃO está em profiles:
SELECT au.id, au.email 
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;
▫️ EXPECTATIVA: 0 linhas (exceto para usuários deletados recentemente)

-- Revisar status de confirmação de email:
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email_confirmed_at IS NULL 
ORDER BY created_at DESC;
▫️ OBJETIVO: Identificar usuários que não confirmaram email
*/

// ============================================================================
// 3️⃣ TESTAR FLUXO DE LOGIN
// ============================================================================

/*
-- Simular busca por MATRÍCULA (o que a aplicação faz):
-- Substituir 'SEU_NUMERO_MATRICULA' por um valor real
SELECT user_id, email, matricula, full_name 
FROM profiles 
WHERE matricula = 'SEU_NUMERO_MATRICULA';
▫️ EXPECTATIVA: 1 linha (resultado único)
▫️ PRÓXIMO PASSO: Use esse EMAIL para fazer login

-- Testar se RLS policies permitem essa query:
-- (Execute como um usuário autenticado, não como admin)
SELECT email FROM profiles WHERE matricula = 'SEU_NUMERO_MATRICULA';
▫️ EXPECTATIVA: Funciona (sem erro RLS)
*/

// ============================================================================
// 4️⃣ DIAGNOSTICAR PROBLEMAS DE LOGIN
// ============================================================================

/*
-- Ver últimas tentativas de login (verificar logs de auditoria):
SELECT id, email, last_sign_in_at, created_at 
FROM auth.users 
ORDER BY last_sign_in_at DESC NULLS LAST
LIMIT 20;
▫️ OBJETIVO: Verificar quem fez login recentemente

-- Encontrar usuários que NUNCA fizeram login:
SELECT email, created_at 
FROM auth.users 
WHERE last_sign_in_at IS NULL 
  AND email_confirmed_at IS NOT NULL
ORDER BY created_at DESC;
▫️ OBJETIVO: Identificar contas criadas mas não usadas

-- Ver usuários com flag "deve_trocar_senha":
SELECT user_id, email, full_name, deve_trocar_senha, created_at 
FROM profiles 
WHERE deve_trocar_senha = true
ORDER BY created_at DESC;
▫️ OBJETIVO: Verificar quem precisará redefinir senha ao fazer login
*/

// ============================================================================
// 5️⃣ LIMPEZA E MANUTENÇÃO
// ============================================================================

/*
-- ⚠️ CUIDADO: Remover espaços em branco em matrículas:
UPDATE profiles 
SET matricula = TRIM(matricula)
WHERE matricula IS NOT NULL 
  AND matricula LIKE ' %' 
     OR matricula LIKE '% ';

-- ⚠️ CUIDADO: Padronizar emails em lowercase:
UPDATE profiles 
SET email = LOWER(email)
WHERE email IS NOT NULL 
  AND email != LOWER(email);

-- ⚠️ CUIDADO: Encontrar e revisar emails inválidos:
SELECT user_id, email 
FROM profiles 
WHERE email NOT LIKE '%@%'
   OR email LIKE '% %'
   OR email = '';
▫️ AÇÃO: Revisar e atualizar caso necessário
*/

// ============================================================================
// 6️⃣ ESTATÍSTICAS DE SEGURANÇA
// ============================================================================

/*
-- Total de usuários por método de login:
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE email IS NOT NULL) as por_email,
  (SELECT COUNT(*) FROM profiles WHERE matricula IS NOT NULL) as por_matricula,
  (SELECT COUNT(*) FROM profiles WHERE email IS NOT NULL AND matricula IS NOT NULL) as ambas;

-- Distribuição de usuários por departamento (exemplo):
SELECT role, COUNT(*) as total 
FROM profiles 
GROUP BY role 
ORDER BY total DESC;

-- Usuários offline há X dias:
SELECT email, full_name, last_sign_in_at 
FROM auth.users
WHERE last_sign_in_at < NOW() - INTERVAL '30 days'
ORDER BY last_sign_in_at DESC;
▫️ OBJETIVO: Identificar contas inativas
*/

// ============================================================================
// 🎯 CHECKLIST PRÉ-PRODUÇÃO
// ============================================================================

/*
✓ Passo 1: Executar query #1 (Perfis SEM Email)
   → Se houver resultados, adicionar os emails faltantes

✓ Passo 2: Executar query #1 (Emails duplicados)
   → Se houver resultados, resolver conflitos

✓ Passo 3: Executar query #2 (Sincronizar com Auth)
   → Se houver resultados, contactar suporte Supabase ou revisar onboarding

✓ Passo 4: Testar login por EMAIL com um usuário real
   → ✅ Deve funcionar

✓ Passo 5: Testar login por MATRÍCULA com um usuário real
   → ✅ Deve funcionar

✓ Passo 6: Testar com matrícula INVÁLIDA
   → ✅ Deve exibir "Matrícula não encontrada"

✓ Passo 7: Revisar estatísticas gerais
   → ✅ Número de usuários esperado?

✓ Passo 8: LIBERAR PARA PRODUÇÃO!
*/

export {};
