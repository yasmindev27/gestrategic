# 📋 ARQUIVOS SQL PRONTOS PARA IMPORTAR

**Status**: ✅ Prontos no repositório  
**Localização**: `public/` e `supabase/migrations/`

---

## ✅ ARQUIVOS DISPONÍVEIS

### 1. `public/schema-export.sql` 
**Contém**: Todo o schema de tabelas  
**Tamanho**: Completo  
**Como usar**:

```
1. Supabase → SQL Editor → New Query
2. Arquivo → public/schema-export.sql
3. Copiar TODO o conteúdo
4. Colar no SQL Editor
5. Clicar ▶️ Execute
```

---

### 2. `public/rls-functions-triggers-export.sql`
**Contém**: Funções, triggers, e RLS policies  
**Tamanho**: Completo  
**Como usar**:

```
1. Após rodar schema-export.sql
2. Supabase → SQL Editor → New Query
3. Arquivo → public/rls-functions-triggers-export.sql
4. Copiar TODO o conteúdo
5. Colar no SQL Editor
6. Clicar ▶️ Execute
```

---

### 3. `supabase/migrations/` (Múltiplos arquivos)
**Contém**: Todas as migrations incrementais  
**Como usar**:

```
1. Abrir Supabase → Database → Migrations
2. Clicar Run migrations (executa todas automaticamente)
3. OU manualmente copiar cada arquivo em ordem
```

---

## 🎯 PASSO-A-PASSO RÁPIDO

### Opção A: USAR ARQUIVOS EXISTENTES (Recomendado ⭐)

**Passo 1: Schema**
```bash
1. Abrir: public/schema-export.sql
2. Copiar tudo (Ctrl+A, Ctrl+C)
3. Supabase → SQL Editor → New Query
4. Colar (Ctrl+V)
5. Execute ▶️
6. ✅ Aguardar conclusão
```

**Passo 2: RLS + Funções + Triggers**
```bash
1. Abrir: public/rls-functions-triggers-export.sql
2. Copiar tudo
3. SQL Editor → New Query
4. Colar
5. Execute ▶️
6. ✅ Aguardar conclusão
```

**Passo 3: Verificar**
```sql
-- SQL Editor → New Query
-- Verificar que tabelas foram criadas:

SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Deve mostrar: achados_auditoria, acoes_incidentes, ... (20+ tabelas)
```

---

### Opção B: USAR SEU BACKUP PRÓPRIO

Se você tem outro arquivo SQL (não esses):

```bash
1. Arquivo seu → Copiar conteúdo
2. Supabase → SQL Editor → New Query
3. Colar
4. Execute ▶️
```

---

## ⚙️ APÓS IMPORTAR (Configuração)

### Habilitar RLS em Tabelas Sensíveis

```sql
-- SQL Editor → New Query
-- Executar:

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_enfermagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bed_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nir_registros_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saida_prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias_leitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Verificar que está ativado:
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Todas deve ter rowsecurity = true
```

### Aplicar RLS Policies Corrigidas (Segurança)

Copiar de `REMEDIACAO_RLS_POLICIES.md` as policies que você precisa corrigir.

---

## 🧪 VALIDAR IMPORTAÇÃO

### Contar Tabelas
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Esperado: 30+ tabelas
```

### Contar Dados (se houver)
```sql
SELECT COUNT(*) FROM public.pacientes;
SELECT COUNT(*) FROM public.prontuarios;
SELECT COUNT(*) FROM public.fichas_enfermagem;
-- etc...
```

### Verificar Extensões Habilitadas
```sql
SELECT * FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgjwt', 'pgcrypto');
-- Esperado: 3 linhas
```

---

## 📊 CHECKLIST

- [ ] Schema importado (schema-export.sql)
- [ ] RLS + Funções + Triggers importadas (rls-functions-triggers-export.sql)
- [ ] RLS habilitado em tabelas sensíveis
- [ ] 30+ tabelas existem
- [ ] Dados presentes se houver
- [ ] Extensões ativas
- [ ] Sem erros de execução

---

## ⏱️ TEMPO

- Schema: 1-2 min
- RLS/Funções/Triggers: 2-3 min
- Validação: 1 min
- **TOTAL: 5 min**

---

**Próximo passo:** [SETUP_RAPIDO_COM_BACKUPS.md](SETUP_RAPIDO_COM_BACKUPS.md)
