# 🏥 Roadmap de Implementação Hospitalar
**Gestrategic - UPA 24h**  
**Prioridade:** MFA → Backup → Rate Limiting → DRP → Monitoring  

---

## SPRINT 1-2 (2 Semanas) — CRÍTICO

### Task 1.1: Implementar MFA Obrigatório ⭐⭐⭐

**Descrição:**  
Forçar Multi-Factor Authentication para todos os usuários admin/gestor. Usar Supabase MFA nativo (TOTP).

**Arquivo a Criar:**
```
src/components/MFASetup.tsx
src/hooks/useMFA.ts
supabase/migrations/add_mfa_fields.sql
```

**Checklist:**
- [ ] API endpoint para enroll TOTP (QR code)
- [ ] Modal de setup MFA obrigatório ao primeiro login de admin
- [ ] Verificação de MFA no login subsequente
- [ ] Recovery codes (10x) para casos de perda de dispositivo
- [ ] Audit log de MFA events
- [ ] Testes de 2FA com atividades sensíveis

**Estimativa:** 4-5 dias

---

### Task 1.2: Backup Automatizado Verificável ⭐⭐⭐

**Descrição:**  
Configurar backups diários de tabelas críticas com testes de restauração.

**Ação:**
```bash
# No Supabase:
1. Habilitar pgBackRest (backup point-in-time recovery)
2. Retenção: 30 dias
3. Frequência: Cada 4 horas (RPO = 4 horas)

# Adicionar verification job:
CREATE TABLE backup_verification_log (
  id UUID PRIMARY KEY,
  backup_date TIMESTAMP,
  status: 'success' | 'failed',
  records_verified INT,
  execution_time_ms INT
);

-- Job (daily 22:00 UTC):
SELECT verify_backup('prontuarios', '7 days ago'::timestamp);
```

**Checklist:**
- [ ] Backup policy configurada
- [ ] Retenção definida (30 dias)
- [ ] Test restore executado com sucesso
- [ ] Alert configurado se backup falhar
- [ ] Documentação de restauração (runbook)
- [ ] Time treinado em procedimento

**Estimativa:** 2-3 dias

---

### Task 1.3: Rate Limiting em Edge Functions ⭐⭐⭐

**Descrição:**  
Implementar rate limiting em operações críticas usando Redis (Upstash) ou Token Bucket em memória.

**Arquivo a Criar:**
```
supabase/functions/_shared/rate-limiter.ts
supabase/functions/admin-create-user/rate-limit.ts
supabase/functions/classificar-prioridade/rate-limit.ts
supabase/functions/processar-pdf-salus/rate-limit.ts
```

**Limites Recomendados:**
```typescript
const RATE_LIMITS = {
  'admin-create-user': { requests: 5, window: '1m', per: 'admin_id' },
  'classificar-prioridade': { requests: 50, window: '1m', per: 'user_id' },
  'processar-pdf-salus': { requests: 2, window: '1m', per: 'user_id' },
  'gerar-relatorio': { requests: 10, window: '5m', per: 'user_id' },
};
```

**Checklist:**
- [ ] Middleware de rate limiting implementado
- [ ] Testes de limite com k6
- [ ] Response com X-RateLimit headers
- [ ] Logs de throttling
- [ ] Alert se muitos rejects

**Estimativa:** 3-4 dias

---

### Task 1.4: Encryption de PII ao Nível de Campo ⭐⭐

**Descrição:**  
Criptografar campos sensíveis (nome, CPF, email) usando pgcrypto.

**Arquivo a Criar:**
```
supabase/migrations/encrypt_pii_fields.sql
src/lib/pii-encryption.ts
src/hooks/useEncryptedData.ts
```

**Campos a Criptografar:**
- `pacientes.nome`
- `pacientes.cpf`
- `pacientes.rg`
- `profiles.documento`
- `seg_patrimonial_visitantes.documento`

**Migration:**
```sql
ALTER TABLE pacientes 
ADD COLUMN nome_encrypted bytea,
ADD COLUMN cpf_encrypted bytea;

UPDATE pacientes SET
  nome_encrypted = pgp_pub_encrypt(nome, dearmor(public_key)),
  cpf_encrypted = pgp_pub_encrypt(cpf, dearmor(public_key));

ALTER TABLE pacientes DROP COLUMN nome, DROP COLUMN cpf;
```

**Checklist:**
- [ ] Chaves públicas/privadas gerenciadas
- [ ] Verificar performance de encryption (p95)
- [ ] Teste de desencriptação
- [ ] Audit de acesso a PII

**Estimativa:** 3-4 dias

---

## SPRINT 3-4 (4 Semanas) — IMPORTANTE

### Task 2.1: Disaster Recovery Plan ⭐⭐⭐

**Descrição:**  
Documentação e procedimentos de recuperação em caso de desastre.

**Documentos a Criar:**
```
DRP/DISASTER_RECOVERY_PLAN.md
DRP/RUNBOOK_RESTORE.md
DRP/RUNBOOK_FAILOVER.md
DRP/COMMUNICATION_PLAN.md
```

**Conteúdo DRP:**
```markdown
# Disaster Recovery Plan — Gestrategic

## Objetivos
- RTO: 4 horas
- RPO: 1 hora

## Cenários cobertos
1. Perda de acesso ao banco de dados
2. Corrupção de dados
3. Indisponibilidade prolongada (>1h)
4. Compromisso de segurança

## Responsabilidade
- Lead: Tech Lead
- Backup: Platform Engineer
- Comunicação: CTO

## Teste de DR
- Frequência: Semanal (mini-drill)
- Simulação completa: Trimestral
```

**Checklist:**
- [ ] DRP documentado e assinado
- [ ] Runbooks criados
- [ ] Time treinado (presencial)
- [ ] Simulação de incidente completada
- [ ] Métricas de sucesso definidas
- [ ] Contatos de emergência listados

**Estimativa:** 5-7 dias

---

### Task 2.2: Monitoring & Alerting Completo ⭐⭐⭐

**Descrição:**  
Implementar observabilidade com Sentry + DataDog (ou alternativa open-source).

**Arquivo a Criar:**
```
src/lib/telemetry.ts
src/lib/metrics.ts
supabase/functions/_shared/telemetry.ts
```

**Métrics Críticas:**
```typescript
const CRITICAL_ALERTS = [
  // Disponibilidade
  { metric: 'api.availability', threshold: 99.9, interval: '5m' },
  // Performance
  { metric: 'db.query.p95', threshold: 500, interval: '10m' },
  // Segurança
  { metric: 'audit.logs.delayed', threshold: 5000, interval: '1m' },
  // Negócio
  { metric: 'prontuarios.creation_errors', threshold: 0.01, interval: '5m' },
];
```

**Checklist:**
- [ ] Sentry/DataDog configurado para cloud
- [ ] Alerts testados (gerar evento de teste)
- [ ] Integração com Slack/PagerDuty
- [ ] Dashboards criados (uptime, errors, latency)
- [ ] SLAs documentados
- [ ] On-call rotation configurado

**Estimativa:** 5-7 dias

---

### Task 2.3: Validadores de Integridade de Dados ⭐⭐

**Descrição:**  
Implementar verificações automáticas de consistência de dados.

**Arquivo a Criar:**
```
src/lib/data-validators.ts
supabase/functions/validate-integrity/index.ts
```

**Validações:**
```typescript
const VALIDATIONS = [
  'bed_simultaneous_occupancy_check', // Uma cama, um paciente
  'medication_entry_exit_balance',    // Entrada vs saída
  'shift_conflicts_check',             // Enfermeiro não em 2 plantões
  'patient_multiple_admissions',       // Paciente não admitido 2x same day
];
```

**Checklist:**
- [ ] Validadores implementados
- [ ] Job agendado (1h, diário 2:00 UTC)
- [ ] Alerts configurados
- [ ] Relatório a executivos
- [ ] Testes de cobertura >95%

**Estimativa:** 4-5 dias

---

### Task 2.4: Audit Trail com Versionamento ⭐⭐

**Descrição:**  
Implementar Event Sourcing para dados críticos.

**Arquivo a Criar:**
```
supabase/migrations/create_audit_trail.sql
src/lib/event-sourcing.ts
```

**Tabelas:**
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  aggregate_type TEXT, -- 'prontuario', 'paciente'
  aggregate_id UUID,
  event_type TEXT,
  data JSONB,
  metadata JSONB,
  created_at TIMESTAMP,
  created_by UUID,
  signature BYTEA -- Assinatura criptográfica
);

CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id);
```

**Checklist:**
- [ ] Event store implementado
- [ ] Triggers de log em tabelas críticas
- [ ] Query de history por entidade
- [ ] Validação de assinatura
- [ ] Teste de auditoria completa

**Estimativa:** 5-7 dias

---

## SPRINT 5-6 (8 Semanas) — MELHORIAS

### Task 3.1: Testes de Carga com K6 ⭐⭐

**Descrição:**  
Executar testes de carga e documentar baselines.

**Arquivo a Criar:**
```
tests/load/k6-scenarios.js
tests/load/SLA_BASELINE.md
```

**Cenários:**
```javascript
// 1. Login massivo (simulano início de turno)
// 2. Leitura de leitos (múltiplos usuários)
// 3. Atualizar status (médicos simultâneos)
```

**Checklist:**
- [ ] Testes executados (100+ usuários)
- [ ] Baselines documentados
- [ ] Gargalos identificados
- [ ] Plano de otimização
- [ ] Testes replicados mensalmente

**Estimativa:** 4-6 dias

---

### Task 3.2: Data Retention Policy Automatizada ⭐

**Descrição:**  
Implementar políticas automáticas de retenção LGPD-compliant.

**Arquivo a Criar:**
```
supabase/functions/enforce-retention/index.ts
LGPD_DATA_RETENTION_POLICY.md
```

**Policy:**
```typescript
const RETENTION = {
  'prontuarios': { days: 7*365, action: 'anonymize' }, // 7 anos
  'logs_acesso': { days: 2*365, action: 'delete' },     // 2 anos
  'sessions': { days: 90, action: 'delete' },           // 90 dias
};
```

**Checklist:**
- [ ] Job de retenção implementado
- [ ] Logs de anonymization
- [ ] Testes de LGPR compliance
- [ ] Documentação de policy

**Estimativa:** 3-4 dias

---

## 📋 CHECKLIST FINAL

**Antes de Produção:**
- [ ] Todos os críticos implementados
- [ ] Security audit terceirizado
- [ ] Teste de penetração (pen test)
- [ ] Testes de carga OK
- [ ] DRP simulado com sucesso
- [ ] Auditoria LGPD completed
- [ ] Team treinado
- [ ] Comunicação com stakeholders

---

## 📊 Timeline Global

```
Semana 1-2: Sprint 1 (Críticos)
  - MFA
  - Backup
  - Rate Limiting
  - PII Encryption

Semana 3-6: Sprint 2 (Importantes)
  - DRP
  - Monitoring
  - Validadores
  - Audit Trail

Semana 7-10: Sprint 3 (Melhorias)
  - Load Tests
  - Retention Policy
  - Otimizações

Semana 11: Security Audit + Pen Test

Semana 12+: Produção com Support 24/7
```

---

**Responsável:** Tech Lead / Platform Engineer  
**Data:** 18/03/2026  
**Status:** ROADMAP APROVADO
