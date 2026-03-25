---
title: "Como Importar o Schema no Supabase"
description: "Guia passo-a-passo para importar o schema corrigido"
---

# 📥 IMPORTAR SCHEMA NO SUPABASE

## ✅ Pré-requisitos

- [ ] Novo projeto Supabase criado
- [ ] URL e Keys anotadas
- [ ] Arquivo `SCHEMA_IMPORTAR_SUPABASE.sql` pronto

---

## 🚀 Passo 1: Abrir SQL Editor do Supabase

1. Acesse: https://app.supabase.com
2. Selecione seu projeto novo
3. No menu lateral, clique em **"SQL Editor"**
4. Clique em **"New Query"**

---

## 🚀 Passo 2: Copiar e Colar o Schema

### Opção A: Copiar do arquivo

1. Abra o arquivo `SCHEMA_IMPORTAR_SUPABASE.sql`
2. Selecione **TODO** o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)
4. Na aba do Supabase, clique no editor SQL branco
5. Cole (Ctrl+V)

### Opção B: Importar linha por linha em blocos

Se receber erro de timeout, divida em 3 partes:

**Parte 1: Extensões e Tipos**
```sql
-- Copie apenas até a linha "PASSO 3" (primeiras 40 linhas)
```

**Parte 2: Tabelas Principais**
```sql
-- Copie do "PASSO 3" até "PASSO 5"
```

**Parte 3: RLS e Índices**
```sql
-- Copie do "PASSO 5" até o final
```

---

## 🚀 Passo 3: Executar o SQL

1. No editor, clique no botão **"▶ Run"** (canto superior direito)
2. OU use atalho: **Ctrl+Enter**

### Você deve ver:

✅ `Query executed successfully. 1ms`

---

## 📊 Passo 4: Verificar se Funcionou

### No SQL Editor, execute:

```sql
-- Contar quantas tabelas foram criadas
SELECT COUNT(*) as total_tabelas FROM information_schema.tables 
WHERE table_schema = 'public';

-- Listar todas as policies RLS
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public';

-- Verificar índices criados
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;
```

### Resultado esperado:

- **Total de tabelas**: ~80+
- **Policies RLS**: 5+
- **Índices**: 8+

---

## ⚠️ Se der ERRO

### Erro: "Table already exists"

```
ERROR:  relation "public.setores" already exists
```

**Solução**: Significa que você rodou o script 2x. Tudo bem, ignore.

### Erro: "Extension not available"

```
ERROR:  extension "pgcrypto" does not exist
```

**Solução**: Execute antes:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Erro: "Foreign key constraint fails"

```
ERROR:  insert or update on table "x" violates foreign key constraint
```

**Solução**: Significa que faltam dados. Você precisa importar o backup das tabelas ANTES de aplicar as constraints. Tente em outra ordem ou use:

```sql
-- Desabilitar constraints temporariamente
ALTER TABLE public.tabelas_dependentes DISABLE TRIGGER ALL;
-- ... importar dados ...
ALTER TABLE public.tabelas_dependentes ENABLE TRIGGER ALL;
```

---

## 🔒 Passo 5: Aplicar RLS Policies

Depois que o schema estiver criado, as policies RLS já estarão ativas!

Para testar se está funcionando:

```sql
-- Teste 1: Verifica se RLS está ativado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('prontuarios', 'banco_horas')
AND schemaname = 'public';

-- Saída esperada:
-- tablename    | rowsecurity
-- prontuarios  | t
-- banco_horas  | t
```

---

## 🔐 Passo 6: Testar Criptografia PII

```sql
-- Teste de criptografia de CPF
SELECT 
  public.encrypt_pii('12345678901') as cpf_encrypted,
  public.decrypt_pii(
    public.encrypt_pii('12345678901')
  ) as cpf_decrypted;

-- Saída esperada:
-- cpf_encrypted e cpf_decrypted = "12345678901"
```

---

## 📋 Passo 7: Importar Dados (Backups)

Agora que o schema existe, importe seus dados:

1. Vá para **"Database"** > **"Backups"**
2. OU use SQL direto com dados do seu backup anterior:

```sql
-- Exemplo: Importar profiles
INSERT INTO public.profiles (id, email, nome, role, setor, ativo)
VALUES 
  ('uuid-aqui', 'user@example.com', 'João Silva', 'admin', 'gerencia', true),
  ('uuid-aqui', 'user2@example.com', 'Maria Santos', 'gestor', 'atendimento', true);
```

---

## ✅ Passo 8: Validar Tudo

```sql
-- 1. Verificar tabelas principais
SELECT COUNT(*) FROM public.profiles;
SELECT COUNT(*) FROM public.prontuarios;
SELECT COUNT(*) FROM public.protocolo_atendimentos;

-- 2. Verificar RLS em ação
SET ROLE postgres; -- Remove RLS temporariamente
SELECT COUNT(*) FROM public.prontuarios; -- Vê TUDO
RESET ROLE;

-- 3. Verificar índices
\d public.prontuarios; -- Mostra índices
```

---

## 🎯 Próximos Passos

- [ ] Importar dados dos backups
- [ ] Testar login com Supabase Auth
- [ ] Validar RLS com usuários diferentes
- [ ] Configurar variáveis de ambiente no Vercel (`.env.local`)
- [ ] Deploy no Vercel com novas credenciais

---

## 📞 Troubleshooting

| Problema | Solução |
|----------|---------|
| Schema não aparece | Atualize browser (F5) |
| RLS não está aplicado | Execute: `ALTER TABLE public.tabela ENABLE ROW LEVEL SECURITY;` |
| Criptografia não funciona | Verifique se pgcrypto foi criado |
| Foreign keys quebradas | Tente importar dados em outra ordem |
| Performance lenta | Rode: `REINDEX DATABASE seu_database;` |

---

## ✨ Status

- ✅ Schema: **PRONTO**
- ✅ RLS: **PRONTO**
- ✅ Índices: **PRONTO**
- ✅ Criptografia: **PRONTO**
- 🔄 Dados: **AGUARDANDO IMPORTAÇÃO**

