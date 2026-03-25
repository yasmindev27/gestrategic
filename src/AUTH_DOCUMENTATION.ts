/**
 * 🔐 Documentação de Autenticação - GEStrategic
 * 
 * Sistema de Login: Email OU Matrícula
 * 
 * Data: 24/03/2026
 */

// ============================================================================
// 📋 COMO FUNCIONA O LOGIN
// ============================================================================

/*
O componente Auth.tsx (src/pages/Auth.tsx) permite login de 2 formas:

1️⃣ POR EMAIL (tradicional)
   - Usuário digita: "joao.silva@hospital.com.br"
   - Sistema detecta formato de email (@)
   - Faz login direto com Supabase.auth.signInWithPassword()

2️⃣ POR MATRÍCULA (interno)
   - Usuário digita: "123456" ou "EMP-001"
   - Sistema detecta que NÃO é email
   - Busca na tabela `profiles` a matrícula e obtém o email real
   - Faz login com o email real encontrado

✅ FLUXO CORRETO:
   Input: "123456" (matrícula)
   ↓
   SELECT email FROM profiles WHERE matricula = '123456'
   ↓
   Resultado: "joao.silva@hospital.com.br"
   ↓
   supabase.auth.signInWithPassword({
     email: "joao.silva@hospital.com.br",
     password: "senha_do_usuario"
   })
   ↓
   ✅ Login bem-sucedido
*/

// ============================================================================
// 🗂️ ESTRUTURA DO BANCO DE DADOS
// ============================================================================

/*
Tabela: profiles
┌──────────────────┬──────────────────┬─────────────────┐
│ Campo            │ Tipo             │ Descrição       │
├──────────────────┼──────────────────┼─────────────────┤
│ user_id (PK)     │ UUID             │ ID do usuário   │
│ email            │ TEXT             │ Email de login  │
│ matricula        │ TEXT (UNIQUE)    │ Matrícula       │
│ full_name        │ TEXT             │ Nome completo   │
│ deve_trocar_senha│ BOOLEAN          │ Flag 1º acesso  │
│ ...              │ ...              │ Outros campos   │
└──────────────────┴──────────────────┴─────────────────┘

Intenções:
- `email` = Email real para LOGIN no Supabase Auth
- `matricula` = Identificador interno único para login alternativo
- Ambos devem estar PREENCHIDOS para usuários que usam matrícula
*/

// ============================================================================
// 💻 CÓDIGO PRINCIPAL (Auth.tsx)
// ============================================================================

/*
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateLogin()) return;
  
  setIsLoading(true);
  
  let email = loginIdentifier;  // Pode ser email ou matrícula
  
  // PASSO 1: Detectar se é matrícula
  if (!isEmail(loginIdentifier)) {
    // PASSO 2: Buscar email real na tabela profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("matricula", loginIdentifier)
      .single();  // Uma única linha esperada

    if (profileError || !profiles?.email) {
      // Matrícula não encontrada
      setIsLoading(false);
      toast({
        title: "Erro",
        description: "Matrícula não encontrada no sistema.",
        variant: "destructive",
      });
      return;
    }

    // PASSO 3: Usar email real encontrado
    email = profiles.email;
  }
  
  // PASSO 4: Fazer login com email + senha
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: loginPassword,
  });

  // Handle errors...
};
*/

// ============================================================================
// ⚠️ CHECKLIST DE VALIDAÇÃO
// ============================================================================

/*
Antes de ativar em produção, verificar:

□ Todas as linhas na tabela profiles têm `email` preenchido?
  → Query: SELECT user_id, email, matricula FROM profiles WHERE email IS NULL;
  → Deve retornar 0 linhas

□ Todas as matrículas são únicas?
  → Query: SELECT matricula, COUNT(*) FROM profiles GROUP BY matricula HAVING COUNT(*) > 1;
  → Deve retornar 0 linhas

□ Os usuários têm ambos email E matrícula preenchidos?
  → Query: SELECT user_id FROM profiles WHERE email IS NULL OR matricula IS NULL;
  → Deve retornar 0 linhas

□ O Supabase Auth reconhece os emails?
  → Todos os emails em profiles devem ter um usuário correspondente em auth.users

□ Testes de login:
  ✅ Testar com email: usuario@hospital.com.br / senha
  ✅ Testar com matrícula: 123456 / senha
  ✅ Testar com matrícula inválida: garbege / senha
  ✅ Testar com senha errada
  ✅ Testar rate limiting (múltiplas tentativas)
*/

// ============================================================================
// 🔧 TROUBLESHOOTING
// ============================================================================

/*
❌ PROBLEMA: "Matrícula não encontrada"
   → Verificar se a matrícula está correta na tabela profiles
   → Verificar se NÃO há espaços em branco na matrícula
   → Query: SELECT * FROM profiles WHERE matricula LIKE '%seu_numero%';

❌ PROBLEMA: "Email/matrícula ou senha incorretos" ao usar matrícula
   → Matrícula foi encontrada, mas email não existe no auth
   → Solução: Sincronizar o email da tabela profiles com Supabase Auth
   → Verificar: SELECT email FROM profiles WHERE matricula = 'xxx';
   
❌ PROBLEMA: Login funciona com email mas não com matrícula
   → Verificar RLS policies na tabela profiles
   → A query .select("email").eq("matricula", ...) precisa funcionar
   → Testar diretamente no Supabase Studio

❌ PROBLEMA: Muitas tentativas de login (Rate Limiting)
   → Supabase aplica limite de 10 tentativas/10 minutos por IP
   → Exibir mensagem: "Aguarde alguns minutos e tente novamente"
   → Isso é normal e esperado (segurança)
*/

// ============================================================================
// 🎯 MELHORIAS FUTURAS
// ============================================================================

/*
[ ] Adicionar campo `tipo_login_preferido` em profiles:
    - "email" (padrão) ou "matricula"
    - UX melhor: apenas 1 campo de input, sem "ou"

[ ] Implementar "Recuperação de Senha" por matrícula?
    - Escurecimento interessante: mostrar email parcialmente?
    - Ex: "Enviamos um link para jo***@hospital.com.br"

[ ] Social login (OAuth)?
    - Google/Microsoft sem adicionar muita complexidade
    - Ainda suportaria matrícula para fallback

[ ] Autenticação 2FA (Two-Factor)?
    - SMS ou TOTP (Google Authenticator)
    - Supabase tem suporte nativo

[ ] Integração com LDAP/Active Directory?
    - Para empresas maiores
    - Sincronizar usuários automaticamente
*/

// ============================================================================
// 📝 REFERÊNCIAS
// ============================================================================

/*
- Supabase Auth: https://supabase.com/docs/guides/auth
- Validação de Email: https://freeformatter.com/email-regex-pattern.html
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
*/

export {};
