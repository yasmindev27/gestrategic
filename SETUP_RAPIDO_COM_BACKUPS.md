# 🚀 SETUP RÁPIDO - Com Backups Prontos

**Para**: Usuários que já têm SQL exports/backups  
**Tempo**: ~30-45 minutos  
**Status**: ⏳ Pronto para começar

---

## ETAPA 1: CRIAR NOVO SUPABASE (5 min)

### 1.1 Ir para app.supabase.com
1. **New Project**
2. Preencher:
   - **Name**: `gestrategic-prod` (ou seu nome)
   - **Database Password**: Senha forte (16+ chars, números + símbolos)
   - **Region**: `South America (São Paulo)` ← IMPORTANTE
   - **Plan**: `Pro`
3. Clicar **Create new project** (aguarde ~5-10 min)

### 1.2 Copiar credenciais NOVAS
Após projeto criado:
- **Project ID**: `xxxxxxxx`
- **Supabase URL**: `https://xxxxx.supabase.co`
- **Anon Key** (Publishable): `eyJhbGc...`
- **Service Role Key**: `eyJhbGc...` (guardar seguro!)

---

## ETAPA 2: IMPORTAR BACKUPS (5 min)

### 2.1 Acessar SQL Editor
1. Novo projeto → **SQL Editor**
2. Clicar ➕ **New Query**

### 2.2 Importar sua backup
```sql
-- OU: Colar conteúdo do seu arquivo SQL aqui
-- Se tiver arquivo: COPY & PASTE todo o conteúdo
```

**Se tem arquivo SQL:**
1. Abrir seu arquivo de backup (schema-export.sql, backup.sql, etc)
2. Copiar TODO conteúdo
3. Colar no SQL Editor
4. Clicar ▶️ **Execute**
5. Aguardar conclusão (pode levar 1-2 min se for grande)

---

## ETAPA 3: HABILITAR RLS (2 min)

```sql
-- SQL Editor → New Query
-- Executar isso para CADA tabela com PII:

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_enfermagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bed_records ENABLE ROW LEVEL SECURITY;

-- Verificar:
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

---

## ETAPA 4: APLICAR RLS POLICIES CORRIGIDAS (5 min)

Copiar de `REMEDIACAO_RLS_POLICIES.md` e colar aqui — escolher as policies que precisa

---

## ETAPA 5: CONFIGURAR VERCEL (5 min)

### 5.1 Ir para https://vercel.com
1. Seu projeto → **Settings**
2. **Environment Variables** → **Add New**

```
NAME: VITE_SUPABASE_PROJECT_ID
VALUE: [novo ID copiado acima]
ENVIRONMENTS: Production, Preview, Development
```

```
NAME: VITE_SUPABASE_URL
VALUE: [nova URL copiada]
ENVIRONMENTS: Production, Preview, Development
```

```
NAME: VITE_SUPABASE_PUBLISHABLE_KEY
VALUE: [novo Anon Key copiado]
ENVIRONMENTS: Production, Preview, Development
```

```
NAME: VITE_SUPABASE_SERVICE_ROLE_KEY
VALUE: [novo Service Role Key]
ENVIRONMENTS: Production ONLY ← IMPORTANTE
```

### 5.2 Redeploy
1. **Deployments** → última
2. Menu (...) → **Redeploy**

OU: `git push origin main` (auto-redeploy)

---

## ETAPA 6: TESTAR LOCAL (5 min)

### 6.1 Atualizar .env local

```bash
# Executar script:
.\setup-new-env.ps1

# OU manualmente editar .env:
VITE_SUPABASE_PROJECT_ID="[novo]"
VITE_SUPABASE_URL="[novo]"
VITE_SUPABASE_PUBLISHABLE_KEY="[novo]"
# NÃO incluir SERVICE_ROLE aqui!
```

### 6.2 Rodar localmente
```bash
npm run dev
```

Testar em http://localhost:8080:
- ✅ Página carrega?
- ✅ Pode fazer login?
- ✅ Dados aparecem?

---

## ETAPA 7: TESTAR EM PRODUÇÃO (5 min)

1. Abrir link do Vercel (da última deployment)
2. ✅ Página carrega?
3. ✅ Login funciona?
4. ✅ DevTools → sessionStorage tem auth tokens? (não localStorage!)

---

## ✅ CHECKLIST FINAL

```
[ ] Novo Supabase criado + credenciais copiadas
[ ] SQL do backup importado
[ ] RLS habilitado em tabelas sensíveis
[ ] RLS policies aplicadas
[ ] Vercel tem 4 env vars novas
[ ] Vercel redeployado (✅ Ready)
[ ] .env local atualizado
[ ] npm run dev funciona
[ ] Login local funciona
[ ] Dados aparecem localmente
[ ] Produção (Vercel) funciona
[ ] Auth tokens em sessionStorage ✅
```

---

## 🆘 TROUBLESHOOTING RÁPIDO

**Erro: "Invalid credentials"**
→ `.env` com valores antigos. Atualizar com novos valores.

**Erro: "Too many connections"**
→ Supabase Dashboard → Database → Connection Pooling → Enable PgBouncer

**Erro: "RLS policy violation"**
→ Temporariamente: `ALTER TABLE tabela DISABLE ROW LEVEL SECURITY;`
→ Depois adicionar policies corretas

**Erro: CORS**
→ Supabase Dashboard → Settings → API → CORS allowed origins
→ Adicionar: `https://seu_vercel_domain.com`

---

## ⏱️ TEMPO TOTAL

- Criar Supabase: 10 min (+ 5 min de espera)
- Importar backup: 5 min
- Configurar RLS: 5 min
- Vercel: 5 min
- Testar: 10 min
- **TOTAL: ~40-50 minutos** ✅

---

## 📞 PRÓXIMAS FASES (Após validação 24h)

1. Deletar banco antigo
2. Implementar pgcrypto encryption
3. Enforce MFA para admins
4. Rate limiting
5. Audit logging

---

**Pronto? Começa por qual etapa?** 🚀
