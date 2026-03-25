# 📋 CHECKLIST - Setup Novo Banco & Vercel

**Status**: ⏳ Não Iniciado  
**Data de Início**: [data aqui]  
**Data de Conclusão**: [data aqui]  

---

## 🔧 PRÉ-SETUP (Preparação)

- [ ] **1. Fazer backup do banco atual**
  - [ ] Exportar SQL do projeto antigo
  - [ ] Salvar arquivo `backup_banco_antigo_[DATA].sql`
  - [ ] Listar localização do backup: ___________________

- [ ] **2. Documentar credenciais antigas**
  - [ ] Supabase URL antiga: ___________________________
  - [ ] Project ID antigo: _____________________________
  - [ ] Keys antigas guardadas em local seguro: __________

---

## 🆕 CRIAR NOVO PROJETO SUPABASE

### Fase 1: Criar Projeto

- [ ] **3. Criar novo projeto em app.supabase.com**
  - [ ] Clicado "New Project"
  - [ ] Nome do novo projeto: _______________________
  - [ ] Senha do banco: ______________________________
  - [ ] Região: South America (São Paulo) ✅
  - [ ] Plano: Pro (necessário para produção)
  - [ ] Projeto criado (aguardou ~10 minutos)

- [ ] **4. Copiar credenciais do novo projeto**
  - [ ] Novo Project ID: _____________________________
  - [ ] Nova Supabase URL: ___________________________
  - [ ] Nova Anon Key (Publishable): ________________
  - [ ] Novo Service Role Key: _____ (guardado seguro!)

### Fase 2: Configurar Novo Banco

- [ ] **5. Importar schema/migrations**
  - [ ] Opção escolhida:
    - [ ] A) Importar SQL do banco antigo
    - [ ] B) Fresh start (limpo)
  - [ ] Se A: SQL importado com sucesso?
  - [ ] Se B: Extensões habilitadas?
    ```
    - [ ] "uuid-ossp"
    - [ ] "pgjwt"  
    - [ ] "pgcrypto"
    ```

- [ ] **6. Habilitar RLS em tabelas sensíveis**
  - [ ] RLS habilitado em:
    - [ ] public.pacientes
    - [ ] public.prontuarios
    - [ ] public.fichas_enfermagem
    - [ ] public.medicacoes
    - [ ] public.alertas_seguranca
    - [ ] public.bed_records
  - [ ] Verificar: `SELECT rowsecurity FROM pg_tables` ✅

- [ ] **7. Aplicar RLS policies corrigidas**
  - [ ] Copiado SQL de `REMEDIACAO_RLS_POLICIES.md`?
  - [ ] Executado no SQL Editor? 
  - [ ] Sem erros?
  - [ ] Testar uma policy com SELECT

---

## 🔐 CONFIGURAR VERCEL

- [ ] **8. Adicionar environment variables no Vercel**
  - [ ] Ir a https://vercel.com/dashboard
  - [ ] Projeto → Settings → Environment Variables
  - [ ] Adicionar (Create New):

| Name | Value | Environments |
|------|-------|--------------|
| VITE_SUPABASE_PROJECT_ID | [novo ID] | Prod, Preview, Dev |
| VITE_SUPABASE_URL | [nova URL] | Prod, Preview, Dev |
| VITE_SUPABASE_PUBLISHABLE_KEY | [nova key] | Prod, Preview, Dev |
| VITE_SUPABASE_SERVICE_ROLE_KEY | [novo service role] | **Production ONLY** |

- [ ] **Confirmação**:
  - [ ] 4 variáveis criadas?
  - [ ] SERVICE_ROLE em Production apenas?

- [ ] **9. Redeploy no Vercel**
  - [ ] Método:
    - [ ] A) Opção "Redeploy" na última deployment
    - [ ] B) `git push origin main`
  - [ ] Build iniciado?
  - [ ] Build completado com ✅ Ready?
  - [ ] Deployment URL: _______________________________

---

## 🧪 TESTAR LOCALMENTE

- [ ] **10. Atualizar .env local**
  - [ ] Executado: `.\setup-new-env.ps1`
  - [ ] Ou manualmente editado `.env` com novas credenciais
  - [ ] .env contém:
    - [ ] VITE_SUPABASE_PROJECT_ID
    - [ ] VITE_SUPABASE_URL
    - [ ] VITE_SUPABASE_PUBLISHABLE_KEY
  - [ ] .env **não** contém SERVICE_ROLE_KEY? ✅

- [ ] **11. Iniciar servidor local**
  - [ ] Comando: `npm run dev`
  - [ ] Servidor iniciou em http://localhost:8080?
  - [ ] Sem erros de conexão?
  - [ ] Sem erros de autenticação 401/403?

- [ ] **12. Testar navegação**
  - [ ] Página inicial carrega?
  - [ ] Menu principal funciona?
  - [ ] Sem erro de "CORS" ou "Access Denied"?

- [ ] **13. Testar autenticação**
  - [ ] Página de login acessível?
  - [ ] Pode fazer login com credenciais de teste?
  - [ ] Redirecionou para dashboard?
  - [ ] Token aparece em sessionStorage (não localStorage)? ✅

- [ ] **14. Testar carregamento de dados**
  - [ ] Dashboard carrega dados?
  - [ ] Tabelas, gráficos funcionam?
  - [ ] Sem erros de RLS (403)?
  - [ ] Performance aceitável?

- [ ] **15. Testar CRUD básico (se houver dados)**
  - [ ] Pode criar novo registro?
  - [ ] Pode ler registros?
  - [ ] Pode atualizar registro?
  - [ ] Pode deletar registro?
  - [ ] Operações sem erros?

---

## ✅ TESTAR EM PRODUÇÃO (Vercel)

- [ ] **16. Testar link do Vercel**
  - [ ] URL: _______________________________
  - [ ] Página carrega?
  - [ ] Login funciona?
  - [ ] Dados carregam?
  - [ ] Performance aceitável?

- [ ] **17. Testar autenticação em produção**
  - [ ] DevTools → Aplicações → sessionStorage
  - [ ] Auth tokens em sessionStorage? ✅
  - [ ] Auth tokens NÃO em localStorage? ✅
  - [ ] Logout limpa sessionStorage? ✅

- [ ] **18. Testar com usuários reais (se possível)**
  - [ ] Usuário 1 (test@hospital.br) - funciona?
  - [ ] Usuário 2 (outro role) - funciona?
  - [ ] Sem dados vazando entre usuários?

---

## 📊 DADOS & MIGRAÇÃO

- [ ] **19. Verificar integridade de dados**
  - [ ] Contagem de registros migrados correta?
  - [ ] Dados sensíveis (CPF, emails) presentes?
  - [ ] Sem dados corrompidos?
  - [ ] Relacionamentos intatos?

- [ ] **20. Backup dos dados migrados**
  - [ ] Novo banco exportado para backup_novo_[DATA].sql?
  - [ ] Backup guardado em local seguro?

---

## 🧹 LIMPEZA (Apenas após 24h de validação!)

⚠️ **Só fazer isso se TUDO funcionando perfeitamente!**

- [ ] **21. Esperar 24-48 horas de testes**
  - [ ] Período de espera inicial: ✅
  - [ ] Nenhum erro reportado?
  - [ ] Performance estável?

- [ ] **22. Deletar banco antigo** (PONTO DE NÃO RETORNO!)
  - [ ] ⚠️ Backup do banco antigo confirmado?
  - [ ] ⚠️ Backup está em local seguro (não no projeto)?
  - [ ] Pronto para deletar? **SIM / NÃO**
  - [ ] [ ] Deletado projeto antigo Supabase

---

## 📚 DOCUMENTAÇÃO

- [ ] **23. Atualizar documentação**
  - [ ] `.env.example` atualizado com novo projeto?
  - [ ] README.md mencionando novo banco?
  - [ ] CHANGELOG.md documentando migração?
  - [ ] Documento compartilhado com team? (Google Docs/Notion)

- [ ] **24. Atualizar GitHub/Documentação Interna**
  - [ ] GitHub Wiki atualizado?
  - [ ] Documento de deployment atualizado?
  - [ ] Runbook de disaster recovery atualizado?

---

## 🔐 SEGURANÇA & COMPLIANCE

- [ ] **25. Certificar conformidade de segurança**
  - [ ] Keys antigas revogadas?
  - [ ] SERVICE_ROLE em Vercel (Production apenas)?
  - [ ] Nenhuma chave em git?
  - [ ] RLS policies aplicadas?
  - [ ] Audit logging testado?

- [ ] **26. Arquivar dados antigos para LGPD**
  - [ ] Banco antigo arquivado (S3, não acessível)?
  - [ ] Retenção de 7 anos configurada?
  - [ ] Compliance documentado?

---

## 📞 PRÓXIMAS FASES

- [ ] **27. Próximas melhorias de segurança**
  - [ ] pgcrypto para criptografia PII (Semana 2)
  - [ ] MFA obrigatório para admins (Semana 2)
  - [ ] Rate limiting (Semana 3)
  - [ ] Audit logging completo (Semana 3)

---

## 🎯 SIGN-OFF

| Item | Responsável | Data | Assinatura |
|------|-------------|------|-----------|
| Novo Supabase criado | _____________ | ___/___/___ | _____ |
| Vercel configurado | _____________ | ___/___/___ | _____ |
| Testes locais OK | _____________ | ___/___/___ | _____ |
| Testes produção OK | _____________ | ___/___/___ | _____ |
| Dados migrados | _____________ | ___/___/___ | _____ |
| Segurança validada | _____________ | ___/___/___ | _____ |
| Go-live autorizado | _____________ | ___/___/___ | _____ |

---

## 📝 NOTAS IMPORTANTES

- Service Role Key: **NUNCA comitar em git**, usar only via Vercel secrets
- Backup antigo: **Manter por7 anos para LGPD**
- Dados sensíveis: **Não migrades para novo banco sem criptografia**
- RLS: **Testar com cada role antes de produção**
- Monitorar: **Logs de erro em ambiente de produção primeiras 48h**

---

**Última Atualização**: ___/___/___  
**Status Geral**: ⏳ Não Iniciado  
**Bloqueadores**: Nenhum (aguardando início)
