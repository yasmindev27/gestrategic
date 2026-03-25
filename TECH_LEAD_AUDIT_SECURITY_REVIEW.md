# 🔐 TECH LEAD - AUDITORIA DE SEGURANÇA & ARQUITETURA

**Data**: 25 de março de 2026  
**Classificação**: CRÍTICA (Sistema de Saúde)  
**Revisor**: Senior Tech Lead  
**Status**: 🔴 **NÃO PRONTO PARA PRODUÇÃO**

---

## ⚠️ RESUMO EXECUTIVO

Sistema de gestão hospitalar com **múltiplas vulnerabilidades CRÍTICAS** que violam LGPD, HIPAA e boas práticas de segurança. Requer **remediação imediata** antes de ir para produção.

**Score de Segurança**: 4/10  
**Score de Arquitetura**: 6/10  
**Tempo Estimado para Remediação**: 3-4 sprints (com team full-time)

---

## 🔴 CRÍTICO — BLOQUEIA PRODUÇÃO

### 1. EXPOSIÇÃO DE SECRETS (SERVICE_ROLE_KEY em .env)

**Risco**: ⚠️ ACESSO TOTAL AO BANCO DE DADOS  
**Arquivo**: `.env` (verificar se está em `.gitignore`)  
**Linha**: N/A

```env
# ❌ CRÍTICO: SERVICE_ROLE_KEY nunca deve estar em controle de versão
VITE_SUPABASE_SERVICE_ROLE_KEY="sb_secret_0XPE0F3HQVxCzBxb9HgSlA_0TQRvhYk"
```

**Impacto**:
- Qualquer pessoa com acesso ao repo pode contornar RLS
- Completa violação de LGPD/HIPAA
- Dados de pacientes completamente expostos

**Remediação**:
```bash
# 1. REVOKE imediatamente todas as chaves no Supabase Dashboard
# 2. Gerar novas chaves
# 3. Nunca commitar .env
echo ".env.local" >> .gitignore
git rm --cached .env
git commit -m "security: remove .env from tracking"

# 4. Para produção, usar Vercel/GitHub Secrets
# Vercel: Project Settings → Environment Variables
# GitHub: Settings → Secrets and variables → Actions
```

**Checklist**:
- [ ] Revogar chaves antigas
- [ ] Gerar chaves novas
- [ ] Adicionar `.env*` a `.gitignore`
- [ ] Verificar histórico git: `git log --all --full-history -- ".env"`
- [ ] Se necessário, fazer git history rewrite

---

### 2. CONSOLE.LOG EM PRODUÇÃO (Vazamento de Dados)

**Risco**: Exposição de estrutura de banco e erros sensíveis  
**Quantidade**: 12+ arquivos  
**Exemplos**:

```typescript
// ❌ RUIM - Expõe erros ao dev tools
catch (error) {
  console.error("[Audit] Erro ao registrar log:", error);
  // Stack trace mostra estrutura do banco!
}
```

**Remediação - ESLint + Logger Centralizado**:
```javascript
// eslint.config.js
{
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
  }
}

// src/lib/logger.ts
export const logger = {
  debug: (msg: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${msg}`, data);
    }
    // Em produção: enviar para Sentry
    if (process.env.NODE_ENV === 'production') {
      sentryClient.captureMessage(msg, 'debug');
    }
  },
  
  error: (msg: string, error: Error) => {
    // Sanitize stack trace
    const sanitized = {
      message: error.message,
      name: error.name,
      // Nunca incluir stack em produção
    };
    
    if (process.env.NODE_ENV === 'production') {
      sentryClient.captureException(sanitized);
    } else {
      console.error(msg, error);
    }
  }
};
```

**Ação**:
- [ ] Instalar Sentry: `npm install @sentry/react @sentry/tracing`
- [ ] Remover todos `console.log/error`
- [ ] Adicionar ESLint rule para bloquear console

---

### 3. LOCALSTORAGE COM DADOS SENSÍVEIS (Violação LGPD Art. 32)

**Risco**: PII desprotegido  
**Dados em Risco**:
- CPF/CNPJ
- Emails de usuários
- Telefones
- Cache de pacientes
- Chaves de notificação (VAPID)

**Implementação Segura**:
```typescript
// src/lib/secureStorage.ts
import CryptoJS from 'crypto-js';

const SENSITIVE_KEYS = ['cpf', 'cnpj', 'email', 'patient', 'vapid'];

export class SecureStorage {
  private encryptionKey: string;
  
  constructor() {
    // Gerar chave derivada em runtime, nunca armazenar
    this.encryptionKey = this.deriveKeyFromAuth();
  }
  
  private deriveKeyFromAuth(): string {
    // Usar subset do JWT do usuário como chave
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Auth required');
    return CryptoJS.SHA256(token).toString();
  }
  
  set(key: string, value: string): void {
    const isSensitive = SENSITIVE_KEYS.some(k => key.includes(k));
    
    if (isSensitive) {
      // sessionStorage para dados sensíveis (limpo ao fechar aba)
      const encrypted = CryptoJS.AES.encrypt(value, this.encryptionKey).toString();
      sessionStorage.setItem(key, encrypted);
      return;
    }
    
    localStorage.setItem(key, value);
  }
  
  get(key: string): string | null {
    const isSensitive = SENSITIVE_KEYS.some(k => key.includes(k));
    const source = isSensitive ? sessionStorage : localStorage;
    
    const value = source.getItem(key);
    if (!value) return null;
    
    if (isSensitive) {
      return CryptoJS.AES.decrypt(value, this.encryptionKey).toString(CryptoJS.enc.Utf8);
    }
    
    return value;
  }
}
```

**Ação**:
- [ ] Migrar PII para `sessionStorage`
- [ ] Implementar criptografia para dados confidenciais
- [ ] Nunca armazenar: nomes de pacientes, prontuários, medicações

---

### 4. RLS POLICIES INCOMPLETAS / PERMISSIVAS

**Risco**: Usuários acessam dados de outros departamentos  
**Problema**:
```sql
-- ❌ MUITO PERMISSIVO - todos usuários autenticados veem tudo
CREATE POLICY "Usuarios autenticados podem ver alertas" 
  ON public.alertas_seguranca 
  FOR SELECT TO authenticated 
  USING (true);
```

**Remediação Correta**:
```sql
-- ✅ Verificar role antes de permitir acesso
CREATE POLICY "Users can view own department alerts" 
  ON public.alertas_seguranca 
  FOR SELECT TO authenticated 
  USING (
    -- Usuário é o criador
    usuario_id = auth.uid()
    -- OU é administrador
    OR has_role(auth.uid(), 'admin')
    -- OU é responsável pelo setor
    OR EXISTS (
      SELECT 1 FROM public.user_setor
      WHERE user_id = auth.uid()
      AND setor_id = alertas_seguranca.setor_id
    )
  );

-- Verificar que RLS está ATIVADO em todas as tabelas sensíveis
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_enfermagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias_leitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicacoes ENABLE ROW LEVEL SECURITY;
```

**Testes de RLS**:
```typescript
// src/lib/__tests__/rls.test.ts
import { createClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  it('should prevent access to other department pacientes', async () => {
    const userAClient = createClient(URL, KEY, { 
      auth: { persistSession: false } 
    });
    
    // Login como gerente do depto A
    const { data: sessionA } = await userAClient.auth.signInWithPassword({
      email: 'gerente_a@hospital.local',
      password: process.env.TEST_PASSWORD!,
    });
    
    // Tentar acessar paciente do depto B
    const { data, error } = await userAClient
      .from('pacientes')
      .select('*')
      .eq('depto_id', 'DEPTO_B');
    
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });
});
```

**Ação**:
- [ ] Auditar CADA RLS policy
- [ ] Testar com usuários de diferentes roles
- [ ] Garantir que `ENABLE ROW LEVEL SECURITY` está ativado
- [ ] Documentar lógica de acesso por tabela

---

### 5. FALTA DE CRIPTOGRAFIA PARA PII (Violação LGPD/HIPAA)

**Risco**: Dados de pacientes em texto plano no banco  
**Compliance**: LGPD Art. 32, HIPAA § 164.312(a)(2)

**Implementação com pgcrypto (Supabase)**:
```sql
-- 1. Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Migração: adicionar coluna criptografada
ALTER TABLE public.pacientes 
ADD COLUMN cpf_encrypted TEXT;

-- 3. Trigger para criptografar automaticamente
CREATE OR REPLACE FUNCTION encrypt_cpf() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cpf IS NOT NULL THEN
    NEW.cpf_encrypted := pgp_sym_encrypt(NEW.cpf, current_setting('app.encryption_key'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pacientes_encrypt_cpf
BEFORE INSERT OR UPDATE ON public.pacientes
FOR EACH ROW
EXECUTE FUNCTION encrypt_cpf();

-- 4. Para ler (RLS + criptografia)
SELECT 
  id,
  nome,
  pgp_sym_decrypt(cpf_encrypted::bytea, current_setting('app.encryption_key')) as cpf
FROM pacientes
WHERE user_id = auth.uid();
```

**Ação**:
- [ ] Implementar criptografia para: CPF, email, telefone, medicações
- [ ] Usar Supabase Vault ou pgcrypto
- [ ] Criar migrations para dados históricos
- [ ] Testar descriptografia em queries

---

### 6. SEM AUTENTICAÇÃO MFA (Multi-Factor Authentication)

**Risco**: Acesso a contas comprometidas  
**Compliance**: HIPAA recommends MFA  
**Status**: Suportado no code, mas não enforçado

```typescript
// src/components/MFASetup.tsx (já existe, mas não é mandatório)

// ✅ Implementar requirement:
export async function checkMFACompliance(user: User): Promise<boolean> {
  if (!user) return false;
  
  const { data } = await supabase
    .from('user_settings')
    .select('mfa_enabled')
    .eq('user_id', user.id)
    .single();
  
  // Se usuário é admin ou acessa dados sensíveis
  const isPrivileged = await hasRole(user.id, ['admin', 'medico', 'nir']);
  
  if (isPrivileged && !data?.mfa_enabled) {
    // Redirecionar para MFA setup
    return false;
  }
  
  return true;
}

// Em proteções de rota:
<ProtectedRoute>
  <MFAGuard component={DashboardAdmin} />
</ProtectedRoute>
```

**Ação**:
- [ ] Tornar MFA obrigatório para roles privilegiados
- [ ] Setup com TOTP (Google Authenticator, Authy)
- [ ] Backup codes para recovery
- [ ] Audit log de MFA attempts

---

## 🟠 ALTO — Deve Corrigir em Sprint Atual

### 7. RATE LIMITING Sem Implementação Robusta

**Problema**: Supabase retorna 429, mas sem proteção no frontend

**Implementação Completa**:
```typescript
// src/lib/rateLimiter.ts
export class RateLimiter {
  private attempts = new Map<string, Array<number>>();
  
  check(identifier: string, limit = 5, windowMs = 15 * 60 * 1000): {
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const key = identifier;
    const timestamps = this.attempts.get(key) || [];
    
    // Remover tentativas fora da janela
    const recentAttempts = timestamps.filter(t => now - t < windowMs);
    
    if (recentAttempts.length >= limit) {
      const oldestAttempt = Math.min(...recentAttempts);
      const retryAfter = Math.ceil((oldestAttempt + windowMs - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return {
      allowed: true,
      remaining: limit - recentAttempts.length,
    };
  }
}

// Uso em autenticação:
const rateLimiter = new RateLimiter();

export async function loginWithRateLimit(email: string, password: string) {
  const { allowed, retryAfter, remaining } = rateLimiter.check(email);
  
  if (!allowed) {
    toast({
      variant: 'destructive',
      description: `Muitas tentativas. Aguarde ${retryAfter}s`,
    });
    return;
  }
  
  try {
    const result = await supabase.auth.signInWithPassword({ email, password });
    rateLimiter.reset(email); // Reset após sucesso
    return result;
  } catch (error) {
    // logging
  }
}
```

**Ação**:
- [ ] Implementar rate limiting no frontend
- [ ] Adicionar proteção no Supabase (via Edge Functions)
- [ ] Alertar admin de suspicious activity
- [ ] IP-based rate limiting no Vercel

---

### 8. AUDIT LOGGING INCOMPLETO

**Compliance**: LGPD Art. 37  
**Status**: Existe `LogsAuditoriaModule.tsx`, mas não cobre todas operações

```typescript
// src/lib/auditLog.ts
export async function auditLog(event: {
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT';
  resource: string;
  resourceId: string;
  userId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  success: boolean;
  error?: string;
}) {
  await supabase.from('audit_logs').insert({
    ...event,
    timestamp: getBrasiliaDate().toISOString(),
  });
}

// Usar em operações críticas:
export async function deletePaciente(pacienteId: string) {
  try {
    await supabase.from('pacientes').delete().eq('id', pacienteId);
    
    await auditLog({
      action: 'DELETE',
      resource: 'pacientes',
      resourceId: pacienteId,
      userId: user.id,
      success: true,
    });
  } catch (error) {
    await auditLog({
      action: 'DELETE',
      resource: 'pacientes',
      resourceId: pacienteId,
      userId: user.id,
      success: false,
      error: error.message,
    });
    throw error;
  }
}
```

**Ação**:
- [ ] Adicionar audit logging em TODAS operações de dados sensíveis
- [ ] Reter logs por 7 anos (LGPD)
- [ ] Criar dashboard de auditoria
- [ ] Alertas de suspicious patterns

---

### 9. BACKUP & DISASTER RECOVERY

**Compliance**: Documentado mas não verificado  
**Requisito**: 7 anos de retenção (LGPD)

**Checklist**:
- [ ] Verificar backup automático no Supabase Dashboard
- [ ] Testar restore 1x/trimestre
- [ ] Arquivar backups para S3 Glacier
- [ ] Criptografia de backups em repouso
- [ ] Teste de RTO/RPO: RTO ≤ 4h, RPO ≤ 1h

---

## 🟡 MÉDIO — Refatoração Necessária

### 10. BUNDLE SIZE & CODE SPLITTING

**Atual**: Não medido  
**Target**: Main < 150KB, Chunks < 50KB

```bash
npm install --save-dev vite-plugin-visualizer

# vite.config.ts
visualizer({ open: true, gzipSize: true })
```

---

### 11. AUTENTICAÇÃO COM PROP DRILLING

**Problema**: `usePermissoes()` chamado 11+ vezes  
**Solução**: Context + React Query cache

```typescript
// src/contexts/
AuthProvider → AuthContext → useAuth()
```

---

### 12. MEMORY LEAKS EM SUBSCRIPTIONS

**Problema**: Supabase realtime não limpa corretamente  
**Solução**: Cleanup em useEffect

```typescript
useEffect(() => {
  const subscription = supabase
    .on('*', { event: 'UPDATE', schema: 'public', table: 'escalas' }, (p) => {
      setEscalas(p.new);
    })
    .subscribe();
  
  return () => {
    subscription.unsubscribe(); // ← CRITICAL
  };
}, []);
```

---

## ✅ CHECKLIST PRÉ-PRODUÇÃO

### Segurança
- [ ] Revogar todas as chaves antigas
- [ ] `.env*` em `.gitignore`
- [ ] Secrets em Vercel/GitHub
- [ ] Console.log removido (ESLint enforced)
- [ ] Sentry configurado
- [ ] Criptografia de PII (pgcrypto ou Vault)
- [ ] RLS habilitado em 100% tabelas sensíveis
- [ ] MFA obrigatório para admins
- [ ] Rate limiting implementado

### Compliance
- [ ] Audit logging completo
- [ ] Backup automático testado
- [ ] Retenção 7 anos configurada
- [ ] LGPD Privacy Policy no app
- [ ] Right to be forgotten implementado
- [ ] Data export funcional

### Performance
- [ ] Bundle size < 200KB
- [ ] Lazy loading de módulos
- [ ] React Query cache otimizado
- [ ] Sem memory leaks (browser DevTools)
- [ ] Lighthouse score ≥ 80

### Testing
- [ ] RLS policies testadas
- [ ] SQL injection tests
- [ ] XSS tests
- [ ] Auth flow E2E
- [ ] Disaster recovery tested

---

## 🚀 RECOMENDAÇÕES FINAIS

**Antes de produção:**
1. Remediação de CRÍTICOS (1-4 semanas)
2. Implementação de ALTOs (2-3 semanas)
3. Testes de segurança completos
4. Pentesting externo
5. Conformidade legal verificada

**Tempo Total Estimado**: 6-8 semanas com 1 team (2-3 devs + 1 security)

---

**Revisado por**: Senior Tech Lead  
**Data**: 25 de março de 2026  
**Próxima Review**: 01 de abril de 2026  
**Status**: 🔴 BLOQUEADO PARA PRODUÇÃO
