# ⏱️ WORKFLOW VISUAL - 30 MINUTOS

**Começo**: Agora  
**Fim**: 30 min depois  
**Resultado**: Novo banco + Vercel funcionando

---

## 📍 ETAPA 1: CRIAR SUPABASE (5 min)

```
[1] https://app.supabase.com
     ↓
[2] New Project
     ↓
[3] Nome: gestrategic-prod
     Senha: [força forte]
     Região: São Paulo ← CRÍTICO
     Plan: Pro
     ↓
[4] Clique: Create new project
     ↓
[5] ⏳ Aguarde 5-10 min (projeto criando)
     ↓
[6] ✅ Projeto criado!

COPIAR (salvar em bloco de notas):
├── Project ID: ___________________
├── Supabase URL: _________________
├── Anon Key: ____________________
└── Service Role Key: _____________
```

**Tempo**: 10-15 min (inclui espera)  
**Próximo**: Etapa 2

---

## 📊 ETAPA 2: IMPORTAR BACKUP (5 min)

```
[1] Seu Novo Supabase
     ↓ SQL Editor
     ↓
[2] New Query
     ↓
[3] Copiar arquivo:
     public/schema-export.sql
     
[4] Colar no editor
     ↓
[5] Clicar ▶️ Execute
     ↓
[6] ⏳ Esperar conclusão (1-2 min)
     ↓
[7] ✅ Schema importado!

[8] New Query (outra)
     ↓
[9] Copiar arquivo:
     public/rls-functions-triggers-export.sql
     
[10] Execut
e ▶️
     ↓
[11] ⏳ Esperar (1-2 min)
     ↓
[12] ✅ RLS + Triggers importados!
```

**Tempo**: 5 min  
**Próximo**: Etapa 3

---

## 🔒 ETAPA 3: HABILITAR RLS (2 min)

```
[1] SQL Editor → New Query
     ↓
[2] Copiar script abaixo:

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_enfermagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bed_records ENABLE ROW LEVEL SECURITY;

[3] Execute ▶️
     ↓
[4] ✅ RLS habilitado!
```

**Tempo**: 2 min  
**Próximo**: Etapa 4

---

## ⚙️ ETAPA 4: CONFIGURAR VERCEL (5 min)

```
[1] https://vercel.com/dashboard
     ↓
[2] Seu Projeto
     ↓
[3] Settings
     ↓
[4] Environment Variables
     ↓
[5] Add New × 4:

     ┌─────────────────────────────────────┐
     │ VITE_SUPABASE_PROJECT_ID            │
     │ [ID copiado acima]                  │
     │ ✓ Production                        │
     │ ✓ Preview                           │
     │ ✓ Development                       │
     └─────────────────────────────────────┘
     
     ┌─────────────────────────────────────┐
     │ VITE_SUPABASE_URL                   │
     │ [URL copiada acima]                 │
     │ ✓ Production                        │
     │ ✓ Preview                           │
     │ ✓ Development                       │
     └─────────────────────────────────────┘
     
     ┌─────────────────────────────────────┐
     │ VITE_SUPABASE_PUBLISHABLE_KEY       │
     │ [Anon Key copiada]                  │
     │ ✓ Production                        │
     │ ✓ Preview                           │
     │ ✓ Development                       │
     └─────────────────────────────────────┘
     
     ┌─────────────────────────────────────┐
     │ VITE_SUPABASE_SERVICE_ROLE_KEY      │
     │ [Service Role Key]                  │
     │ ✓ Production                        │
     │ ✗ Preview                           │
     │ ✗ Development                       │
     └─────────────────────────────────────┘

[6] Save
     ↓
[7] ✅ Vars criadas!

[8] Deployments
     ↓ ... (menu) → Redeploy
     ↓ OU git push origin main
     ↓
[9] ⏳ Build iniciado...
     ↓
[10] ✅ Ready (ver ✅ verde)
```

**Tempo**: 5 min  
**Próximo**: Etapa 5

---

## 💻 ETAPA 5: CONFIGURAR LOCAL (3 min)

```
[1] Terminal (PowerShell)
     ↓
[2] cd c:\Users\user\Downloads\gestrategic-bf720221-main\gestrategic-bf720221-main
     ↓
[3] .\setup-new-env.ps1
     ↓
[4] Preencher prompts:
     → Project ID: [copiado]
     → Supabase URL: [copiada]
     → Anon Key: [copiada]
     ↓
[5] ✅ .env criado!
```

**Tempo**: 3 min  
**Próximo**: Etapa 6

---

## 🧪 ETAPA 6: TESTAR LOCAL (5 min)

```
[1] Terminal
     ↓
[2] npm run dev
     ↓
[3] ⏳ Compilando...
     ↓
[4] Open: http://localhost:8080
     ↓
[5] Verificar:
     ✓ Página carrega?
     ✓ Sem erro de conexão?
     ✓ Menu funciona?
     ↓
[6] Testar login:
     ✓ Página de login visível?
     ✓ Pode logar?
     ✓ Dashboard carrega?
     ✓ Dados aparecem?
     ↓
[7] DevTools (F12):
     → Application → sessionStorage
     → Procurar "auth.*.access_token"
     ✓ Está em sessionStorage?
     ✓ NÃO em localStorage?
     ↓
[8] ✅ Local funcionando!
```

**Tempo**: 5 min  
**Próximo**: Etapa 7

---

## 🌐 ETAPA 7: TESTAR PRODUÇÃO (3 min)

```
[1] Vercel → Seu projeto
     ↓
[2] Deployments → Última
     ↓
[3] Clicar no link (abre em novo tab)
     ↓
[4] Verificar:
     ✓ Página carrega?
     ✓ Sem erro?
     ↓
[5] Testar login:
     ✓ Página de login OK?
     ✓ Pode logar?
     ✓ Dados aparecem?
     ↓
[6] ✅ Produção funcionando!
```

**Tempo**: 3 min

---

## ✅ RESUMO FINAL

```
Tempo Total: 30 minutos

✅ ETAPA 1: Supabase criado (10 min)
✅ ETAPA 2: SQL importado (5 min)
✅ ETAPA 3: RLS ativado (2 min)
✅ ETAPA 4: Vercel configurado (5 min)
✅ ETAPA 5: Local setup (3 min)
✅ ETAPA 6: Teste local (5 min)
✅ ETAPA 7: Teste produção (3 min)

🎉 RESULTADO: Novo banco + Vercel prontos para usar!
```

---

## 🚨 CHECKLIST FINAL

```
[ ] Novo Supabase criado
[ ] 4 credenciais copiadas
[ ] Schema importado
[ ] RLS policies importadas
[ ] RLS habilitado nas tabelas
[ ] 4 env vars no Vercel
[ ] Vercel redeployado
[ ] .env local atualizado
[ ] npm run dev funciona
[ ] Local login OK
[ ] Dados carregam localmente
[ ] Produção (Vercel) funciona
[ ] Tokens em sessionStorage
```

---

**COMEÇA AGORA?** ⏱️ Tempo mínimo: 30 min

Vou guiar você por cada etapa! 🚀
