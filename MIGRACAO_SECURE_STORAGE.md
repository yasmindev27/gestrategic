# 🔐 Migração para SecureStorage - LGPD Compliance

## Resuma Executivo

A partir de agora, **dados sensíveis NUNCA devem ser armazenados em `localStorage`**. Use `SecureStorage` para automaticamente usar `sessionStorage` para dados sensíveis.

**Compliance**: LGPD Art. 32 (Segurança) + HIPAA (Dados de Saúde)

---

## Dados Sensíveis Protegidos Automaticamente

A `SecureStorage` redireciona automaticamente para `sessionStorage` (limpo ao fechar aba):

- ✅ CPF, CNPJ
- ✅ Email, Telefone
- ✅ Senhas, Tokens
- ✅ Registros médicos, Prescrições
- ✅ Dados de paciente
- ✅ Medicações, Diagnósticos

---

## Migração

### ❌ ANTES (Inseguro)

```typescript
// localStorage armazena tudo permanentemente
localStorage.setItem('userEmail', 'patient@hospital.br');
localStorage.setItem('userCPF', '123.456.789-00');
localStorage.setItem('medicalHistory', JSON.stringify(data));

const email = localStorage.getItem('userEmail');
localStorage.removeItem('userCPF');
localStorage.clear();
```

### ✅ DEPOIS (Seguro)

```typescript
import { SecureStorage } from '@/lib/secureStorage';

// Automaticamente usa sessionStorage para dados sensíveis
SecureStorage.setItem('userEmail', 'patient@hospital.br'); // → sessionStorage
SecureStorage.setItem('userCPF', '123.456.789-00');        // → sessionStorage
SecureStorage.setJSON('medicalHistory', data);              // → sessionStorage (JSON)

// localStorage para dados públicos
SecureStorage.setItem('appTheme', 'dark');                  // → localStorage
SecureStorage.setItem('languagePreference', 'pt-BR');      // → localStorage

// Recuperar dados
const email = SecureStorage.getItem('userEmail');
const history = SecureStorage.getJSON('medicalHistory');

// Limpar dados sensíveis (executar em logout)
SecureStorage.clearSensitive(); // Apenas sessionStorage

// Limpar tudo (logout completo)
SecureStorage.clearAll();
```

---

## Migração por Módulo

### 1. Autenticação (`src/components/Auth.tsx`)

```typescript
// ❌ ANTES
const handleLogin = async (email, password) => {
  const { user } = await supabase.auth.signInWithPassword({ email, password });
  localStorage.setItem('currentUser', JSON.stringify(user)); // ❌ PII exposto!
  localStorage.setItem('userEmail', email); // ❌ Email exposto!
};

const handleLogout = async () => {
  localStorage.clear(); // Não garante limpeza de sessionStorage
};

// ✅ DEPOIS
const handleLogin = async (email, password) => {
  const { user } = await supabase.auth.signInWithPassword({ email, password });
  SecureStorage.setJSON('currentUser', user); // ✅ sessionStorage
  SecureStorage.setItem('userEmail', email);   // ✅ sessionStorage
};

const handleLogout = async () => {
  SecureStorage.clearAll(); // ✅ Limpa tudo
};
```

### 2. Perfil de Usuário (`src/hooks/useProfile.ts`)

```typescript
// ❌ ANTES
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .single();

localStorage.setItem('userProfile', JSON.stringify(profile)); // ❌ CPF, Email exposto

// ✅ DEPOIS
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .single();

SecureStorage.setJSON('userProfile', profile); // ✅ Automaticamente sessionStorage
```

### 3. Cache de Dados Médicos (`src/hooks/useMedicalRecords.ts`)

```typescript
// ❌ ANTES
const fetchRecords = async () => {
  const records = await supabase
    .from('medical_records')
    .select('*');
  
  localStorage.setItem('medicalRecords', JSON.stringify(records)); // ❌ Dados de paciente!
};

// ✅ DEPOIS
const fetchRecords = async () => {
  const records = await supabase
    .from('medical_records')
    .select('*');
  
  SecureStorage.setJSON('medicalRecords', records); // ✅ sessionStorage, limpo ao fechar aba
};
```

---

## Checklist de Migração

- [ ] Auditar entrada: `src/**/*.{ts,tsx}` com `localStorage.setItem` ou `localStorage.getItem`
- [ ] Identificar chaves sensíveis (contêm: cpf, email, phone, password, medical, prescription, etc.)
- [ ] Substituir `localStorage` por `SecureStorage`
- [ ] Testar no DevTools: Verificar que dados sensíveis aparecem em sessionStorage, não localStorage
- [ ] Testar logout: Confirmar que sessionStorage é limpo
- [ ] Testar reinicialização: Dados sensíveis devem desaparecer ao fechar aba

---

## Verificação em DevTools

**Antes (Inseguro)**:
```
localStorage:
  - userEmail: "patient@hospital.br"  ❌ PII exposto indefinidamente
  - userCPF: "123.456.789-00"        ❌ CPF em texto plano
```

**Depois (Seguro)**:
```
localStorage:
  - appTheme: "dark"                 ✅ Apenas dados públicos
  
sessionStorage:
  - userEmail: "patient@hospital.br"  ✅ Cleaned on tab close
  - userCPF: "123.456.789-00"         ✅ Cleaned on tab close
```

---

## Implementação - Passo a Passo

1. **Criar SecureStorage** ✅ (já feito)
2. **Auditar usar localStorage** no codebase
3. **Migrar módulos**:
   - Auth e login
   - Perfil de usuário
   - Cache de dados médicos
   - Configurações de UI (tema, idioma)
4. **Testar em DevTools**
5. **Adicionar ESLint rule** para bloquear localStorage com PII
6. **Documentar em código**

---

## Próximas Fases

### Fase 2: Criptografia Client-Side (Opcional)
Se precisar criptografar sessionStorage também (e2e encryption):

```bash
npm install crypto-js
```

```typescript
import CryptoJS from 'crypto-js';

const key = 'derived-from-auth-token'; // Never hardcode
const encrypted = CryptoJS.AES.encrypt(data, key);
SecureStorage.setItem('userCPF', encrypted.toString());
```

### Fase 3: Backup/Encryption Server-Side
Usar `pgcrypto` no Supabase (veja documento principal de audit).

---

## Suporte

Se encontrar dados sensíveis em localStorage durante testes:

1. Usar `SecureStorage` para substituir
2. Adicionar à lista `SENSITIVE_KEYS` se for novo tipo de dado
3. Documentar em código comentário PII
4. Testar logout: `SecureStorage.clearAll()`

---

**Status**: 🔄 Em Migração  
**Compliance Target**: 100% de dados sensíveis em sessionStorage  
**Timeline**: 1 sprint
