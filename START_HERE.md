# 🎯 COMECE AQUI - Seu Guia Simplificado

**Para**: Você que já tem backups  
**Objetivo**: Novo banco Supabase + Vercel em 30 min  
**Status**: Pronto para começar AGORA

---

## 3️⃣ GUIAS DISPONÍVEIS

### 1. **[WORKFLOW_30MIN.md](WORKFLOW_30MIN.md)** ← COMECE AQUI! 
Visual passo-a-passo com checklist de 30 minutos  
✅ Segue essa se quer algo rápido e visual

### 2. **[IMPORTAR_SQL_BACKUPS.md](IMPORTAR_SQL_BACKUPS.md)**
Como copiar/colar seus SQLs no novo Supabase  
✅ Segue essa se tem dúvida em como importar

### 3. **[SETUP_RAPIDO_COM_BACKUPS.md](SETUP_RAPIDO_COM_BACKUPS.md)**
Prosa resumida de cada etapa  
✅ Segue essa se quer ler explicações mais detalhadas

---

## ⚡ VERSÃO ULTRA-RÁPIDA (1 minuto)

```
1. Criar novo Supabase em https://app.supabase.com
   → New Project → Nome "gestrategic-prod" → Pro → São Paulo
   → Copiar: Project ID, URL, Anon Key

2. Importar SQL:
   → Supabase SQL Editor → New Query
   → Colar: public/schema-export.sql
   → Execute ▶️

3. Importar RLS:
   → New Query → Colar: public/rls-functions-triggers-export.sql
   → Execute ▶️

4. Configurar Vercel:
   → vercel.com → Settings → Env Vars
   → Adicionar 4 variáveis (ver WORKFLOW_30MIN.md)
   → Save → Redeploy

5. Testar local:
   → .\setup-new-env.ps1
   → npm run dev
   → http://localhost:8080

6. Testar produção:
   → Abrir link do Vercel
   → Verificar que funciona

✅ PRONTO!
```

**Tempo**: 30 min max

---

## 📋 CHECKLIST DE 5 ITENS (O Mínimo)

- [ ] Novo Supabase criado com backups importados
- [ ] 4 environment variables no Vercel (VITE_SUPABASE_*)
- [ ] npm run dev funciona localmente
- [ ] Login funciona em localhost:8080
- [ ] Vercel link funciona

Se tudo ✅, você está pronto para deletar o banco antigo!

---

## 🚀 QUAL VOCÊ QUER SEGUIR?

| Perfil | Guia | Por que |
|--------|------|--------|
| Impaciente | [WORKFLOW_30MIN.md](WORKFLOW_30MIN.md) | Passo-a-passo visual |
| Com dúvidas | [IMPORTAR_SQL_BACKUPS.md](IMPORTAR_SQL_BACKUPS.md) | Detalhes sobre SQL |
| Quer entender tudo | [SETUP_RAPIDO_COM_BACKUPS.md](SETUP_RAPIDO_COM_BACKUPS.md) | Explicações |

---

## ⚠️ IMPORTANTE

- SERVICE_ROLE_KEY: Manter seguro, só em Vercel (Production only)
- .env local: Não incluir SERVICE_ROLE_KEY
- RLS: Ativar em tabelas sensíveis (pacientes, prontuarios, etc)
- Testar: Local + Vercel antes de deletar banco antigo

---

## 👉 PRÓXIMO PASSO?

**Diga qual guia você quer seguir** e posso:
- ✅ Guiar você etapa a etapa
- ✅ Responder dúvidas
- ✅ Ajudar com erros
- ✅ Pilotar comigo no chat

**Qual começa?** 🚀

1. WORKFLOW_30MIN.md (rápido)
2. IMPORTAR_SQL_BACKUPS.md (SQL)
3. SETUP_RAPIDO_COM_BACKUPS.md (detalhado)
4. Outra dúvida?
