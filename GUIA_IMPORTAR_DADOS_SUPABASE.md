# 📇 Guia: Importar Dados de Backup no Supabase

## ⚠️ Pré-requisitos
- ✅ Schema base já importado (`SCHEMA_COMPLETO_SUPABASE.sql`)
- ✅ Arquivo `dados-completos-export.sql` disponível
- ✅ Acesso ao Supabase SQL Editor

---

## 🔧 PASSO 1: Limpar o Arquivo de Backup

O arquivo `dados-completos-export.sql` contém uma linha inválida no início:
```
\restrict wjLVpOoZQznwDGDfOIRbSLh2uUKyXIah04SqdfTCuxdGiaTYkBwJsp5QXqoR77e
```

### Opção A: Remover linha no VS Code (Recomendado)
1. Abra `dados-completos-export.sql` no VS Code
2. Vá para **Linha 1** (Ctrl+G)
3. Delete a linha inteira com `\restrict`
4. Salve o arquivo (Ctrl+S)

### Opção B: Remover via PowerShell
```powershell
# Abra PowerShell e execute:
$arquivo = "c:\Users\user\Downloads\dados-completos-export.sql"
$conteudo = Get-Content $arquivo -Raw
$conteudo = $conteudo -replace '\\restrict[^\n]*\n', ''
Set-Content -Path $arquivo -Value $conteudo -Encoding UTF8
Write-Host "✅ Arquivo limpo!"
```

---

## 🚀 PASSO 2: Importar dados no Supabase SQL Editor

### Procedimento:
1. Acesse: **https://app.supabase.com**
2. Selecione seu projeto
3. Vá para **SQL Editor** (aba esquerda)
4. Clique em **New Query**
5. **Cole o conteúdo inteiro** do arquivo `dados-completos-export.sql` 
   - *(Ctrl+A para selecionar tudo no arquivo → Ctrl+C para copiar → Colar no editor)*
6. Clique em **Executar** (Ctrl+Enter ou botão ▶)

### Esperado:
- ✅ "Query executed successfully"
- ✅ Mensagem de quantos registros foram inseridos

### Se der erro:
- Se "table already exists" → Ignora, significa que as tabelas já existem ✅
- Se "ERROR: 42883: function does not exist" → Confirme se o SCHEMA_COMPLETO foi executado primeiro

---

## 📋 PASSO 3: Verificar Dados Importados

Execute essas queries no SQL Editor para validar:

### Ver quantidade de registros por tabela
```sql
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM pg_class p 
   WHERE p.relname = t.tablename) as row_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Listar incidentes NSP importados
```sql
SELECT 
  nsp_numero,
  tipo,
  status,
  criado_em
FROM incidentes_nsp
LIMIT 10;
```

### Verificar RLS ativo
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE rowsecurity = true
ORDER BY tablename;
```

---

## ✅ Checklist Final

- [ ] Linha `\restrict` removida do arquivo
- [ ] Schema base importado com sucesso
- [ ] Dados importados sem erros
- [ ] RLS verificado como ativo
- [ ] Quantidades de dados verificadas

---

## 🎯 Cronograma Estimado
| Etapa | Tempo |
|-------|-------|
| Limpar arquivo | 2 min |
| Importar schema | 1 min |
| Importar dados | 3-5 min |
| Verificar dados | 2 min |
| **Total** | **8-10 min** |

---

## 📞 Se tiver problemas

**Erro: "relation does not exist"**
- Certifique-se que SCHEMA_COMPLETO_SUPABASE.sql foi executado primeiro

**Erro: "insufficient privileges"**
- Use um role com permissões suficientes (admin ou owner do projeto)

**Erro: "too large to paste"**
- Se o arquivo for > 5MB, use upload via SQL file no lugar de copiar/colar

---

**Próximo passo após importar:** Configurar variáveis de ambiente no Vercel com credenciais do novo Supabase! 🚀
