# 🚀 SETUP NOVO - Banco de Dados + Vercel Deployment

**Data**: 25 de março de 2026  
**Objective**: Criar infraestrutura limpa com secrets seguros  
**Timeline**: ~2-3 horas total

---

## PARTE 1: CRIAR NOVO PROJETO SUPABASE

### Passo 1.1: Criar Projeto Supabase
1. Ir a https://app.supabase.com
2. Clicar em **"New Project"**
3. Preencher:
   - **Name**: `gestrategic-prod` (ou similar)
   - **Database Password**: Gerar senha forte (mínimo 16 caracteres, com números, símbolos)
   - **Region**: `South America (São Paulo) sa-east-1`
   - **Pricing Plan**: `Pro` (necessário para produção)

4. Clicar **"Create new project"** (⏱️ leva ~5-10 minutos)

**Copiar após criação completa:**
```
Project ID: [vamos copiar]
Supabase URL: [https://xxxxx.supabase.co]
Anon Key (Publishable): [vamos copiar]
Service Role Key: [vamos copiar - NUNCA em git!]
```

---

### Passo 1.2: Importar Schema do Banco Antigo (opcional, mas recomendado)

Se você quer migration de dados:

#### Opção A: Via SQL Export (Recomendado)

1. **No projeto ANTIGO** (atual):
   - Supabase Dashboard → SQL Editor
   - Clicar **"New Query"** → **"Free templates"** → **"Export"**
   - Ou manualmente: `pg_dump > banco_atual.sql`

2. **No projeto NOVO** (criado):
   - SQL Editor → **"New Query"**
   - Colar o SQL exportado
   - Executar (**▶️**)
   - Aguardar importação

#### Opção B: Fresh Start (Limpo - Recomendado para Produção)

Se quiser começar limpo (sem dados históricos):
- Apenas certifique-se que extensões estão habilitadas:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pgjwt";
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  ```

---

### Passo 1.3: Habilitar RLS (Segurança)

No projeto novo, SQL Editor:

```sql
-- Habilitar RLS em TODAS as tabelas sensíveis
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_enfermagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bed_records ENABLE ROW LEVEL SECURITY;
-- ... adicionar outras tabelas sensíveis

-- Verificar status
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

---

## PARTE 2: COPIAR SCHEMA/MIGRATIONS

### Passo 2.1: Exportar Migrations Atuais

No seu projeto local, copie o arquivo com todas as migrations:

```bash
# Arquivo que já existe:
supabase/migrations/

# Este arquivo já contém todo o schema
public/schema-export.sql
public/rls-functions-triggers-export.sql
```

---

## PARTE 3: CONFIGURAR VERCEL COM NOVO BANCO

### Passo 3.1: Adicionar Environment Variables no Vercel

1. Ir a https://vercel.com
2. Projeto → **Settings** → **Environment Variables**
3. **CRIAR (não edite os antigos, crie novos)**:

```
NAME: VITE_SUPABASE_PROJECT_ID
VALUE: [cole do novo Supabase]
ENVIRONMENTS: Production, Preview, Development

NAME: VITE_SUPABASE_URL
VALUE: https://xxxxx.supabase.co
ENVIRONMENTS: Production, Preview, Development

NAME: VITE_SUPABASE_PUBLISHABLE_KEY
VALUE: [cole a Anon Key do novo Supabase]
ENVIRONMENTS: Production, Preview, Development

NAME: VITE_SUPABASE_SERVICE_ROLE_KEY
VALUE: [cole o Service Role Key do novo Supabase - MAS SOMENTE para produção]
ENVIRONMENTS: Production APENAS
```

⚠️ **NÃO** adicionar SERVICE_ROLE em Preview/Development (risco!)

---

### Passo 3.2: Redeployar no Vercel

1. Ir a Vercel → seu projeto
2. **Deployments** → última deployment → ...menu → **Redeploy**
3. OU: Git push → trigger automático

```bash
# Ou do seu terminal local:
git push origin main
# Vercel vai fazer redeploy automaticamente
```

Aguardar build completar (⏱️ ~3-5 minutos)

---

### Passo 3.3: Verificar se Deployment Sucedeu

1. Vercel → **Deployments** → última
2. Deve mostrar **✅ Ready**
3. Clicar no link e testar:
   - Página carrega?
   - Pode fazer login?
   - Dados carregam? (se tiver dados no novo banco)

---

## PARTE 4: TESTAR LOCALMENTE

### Passo 4.1: Atualizar `.env` Local

```bash
# .env (local, NÃO commit!)
VITE_SUPABASE_PROJECT_ID="[novo ID]"
VITE_SUPABASE_URL="[nova URL]"
VITE_SUPABASE_PUBLISHABLE_KEY="[nova Anon Key]"
# Não incluir SERVICE_ROLE em local!
```

---

### Passo 4.2: Testar Localmente

```bash
# Terminal
npm run dev

# Browser → http://localhost:8080
# Testar:
# ✓ Página carrega sem erros
# ✓ Pode fazer login
# ✓ Dados carregam (se tiver dados migrados)
# ✓ Operações CRUD funcionam
```

Se erro de autenticação 401/403:
- Verificar `.env` tem valores corretos
- Verificar CORS no Supabase (Settings → API)

---

## PARTE 5: LIMPEZA DO BANCO ANTIGO

⚠️ **Só faça isso se tiver certeza que novo banco está OK!**

```sql
-- No projeto ANTIGO, SQL Editor:
-- Fazer backup antes!

-- Opção 1: Deletar dados (manter schema)
DELETE FROM public.pacientes;
DELETE FROM public.prontuarios;
-- ... outras tabelas

-- Opção 2: Deletar tudo (nuclear option)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO authenticated, service_role;
```

---

## PARTE 6: ATUALIZAR DOCUMENTAÇÃO

### `.env.example` (atualizar com novo projeto)

```env
# Novo projeto Supabase (produção)
VITE_SUPABASE_PROJECT_ID="seu_novo_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="sua_nova_anon_key"
VITE_SUPABASE_URL="https://seu_novo_project.supabase.co"

# NUNCA incluir SERVICE_ROLE aqui!
# Usar Vercel environment variables para isso
```

---

## ✅ CHECKLIST FINAL

- [ ] Novo projeto Supabase criado
- [ ] Schema importado (ou fresh setup com extensões)
- [ ] RLS habilitado em tabelas sensíveis
- [ ] Environment variables adicionadas no Vercel
- [ ] Vercel redeployado (mostra ✅ Ready)
- [ ] Teste local: `npm run dev` funciona
- [ ] Teste remoto: Link do Vercel funciona
- [ ] Login funciona em ambos (local + Vercel)
- [ ] Dados carregam corretamente
- [ ] Operações CRUD funcionam
- [ ] `.env` local atualizado (não commitado)
- [ ] `.env.example` documentado

---

## 🆘 TROUBLESHOOTING

### Erro: "Invalid credentials" ao fazer login

**Causa**: `.env` com keys do banco antigo
**Solução**: 
```bash
# Verificar .env tem as NOVAS keys
cat .env

# Se não, atualizar:
VITE_SUPABASE_URL="https://NOVO_ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="NOVA_ANON_KEY"
```

### Erro: "Too many connections" no Supabase

**Causa**: Projeto Pro com limite de conexões
**Solução**: 
- Ir a Supabase Dashboard → Database → Connection Pooling
- Habilitar PgBouncer se desabilitado
- Aumentar para "Session" mode

### Erro: "RLS policy violation" ao tentar ler dados

**Causa**: RLS habilitado mas sem policies
**Solução**: 
```sql
-- Adicionar policy temporária para debug (REMOVER depois):
ALTER TABLE public.pacientes DISABLE ROW LEVEL SECURITY;

-- Depois, adicionar policies corretas usando REMEDIACAO_RLS_POLICIES.md
```

---

## 📞 PRÓXIMAS AÇÕES

1. **HOJE**: Seguir passos 1-3 (criar Supabase + configurar Vercel)
2. **Amanhã**: Testar em produção com usuários reais
3. **Próxima semana**: Implementar pgcrypto + MFA (próximas fases de segurança)

---

## 🔐 SEGURANÇA APÓS SETUP

- [ ] Revogar acesso ao projeto ANTIGO completamente
- [ ] Deletar código service_role_key do projeto antigo
- [ ] Arquivar backups do banco antigo por 7 anos (LGPD)
- [ ] Documentar ciclo de vida dos projetos
