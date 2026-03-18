# 🏥 Revisão Profissional de Engenharia — Gestrategic
**Contexto:** Sistema Hospitalar Crítico (UPA 24h)  
**Data:** 18/03/2026 | **Engenheiro:** Senior Software Architect  
**Classificação:** CONFIDENCIAL - Dados Sensíveis

---

## 📋 SUMÁRIO EXECUTIVO

**Status Geral:** 🟡 **AMARELO** - Pronto com recomendações críticas  
**Nível de Segurança:** ⭐⭐⭐⭐☆ (4/5)  
**Conformidade LGPD:** ✅ Implementada  
**Conformidade ONA:** ✅ Indicadores presentes  
**Pronto para Produção:** ⚠️ **COM RESSALVAS**

---

## 🔐 ANÁLISE DE SEGURANÇA

### ✅ PONTOS FORTES

#### 1. **Conformidade LGPD Documentada**
- [x] LGPD Consent modal implementado
- [x] Documentação de conformidade em PDFs exportados
- [x] Timeout de sessão configurado
- [x] Mascaramento de dados sensíveis em logs
- [x] Logs imutáveis com trigger `bloquear_edicao_logs`

#### 2. **Controle de Acesso Robusto**
```
✅ Row-Level Security (RLS) em TODAS as tabelas
✅ Tabela separada user_roles (previne privilege escalation)
✅ SECURITY DEFINER em funções críticas
✅ Autenticação via Supabase Auth (JWT)
✅ Flag obrigatória deve_trocar_senha no 1º login
```

#### 3. **Encryption & Data Protection**
- AES-256 em repouso (banco de dados)
- TLS 1.3 em trânsito
- JWT com assinatura criptográfica
- CSP (Content Security Policy) implementado

#### 4. **Funções Edge Securizadas**
- CORS restrito a https://gestrategic.com
- Rate limiting implícito (Supabase)
- Timeout de 2 minutos em operações AI
- Validação de entrada em todas as funções

---

### 🔴 RISCOS & VULNERABILIDADES

#### **CRÍTICO - Requer correção imediata**

##### 1. **Falta de Backup Estratégico para Dados Críticos**
**Risco:** Perda permanente de dados de pacientes  
**Impacto:** Severidade: ALTA | Probabilidade: MÉDIA

```typescript
// ❌ PROBLEMA: Sem backup automático explícito
// Dados críticos: prontuarios, camas, medicamentos, pacientes

// SOLUÇÃO RECOMENDADA:
const CRITICAL_TABLES = [
  'prontuarios',
  'pacientes',
  'bed_records',
  'enfermagem_escalas',
  'medicamentos',
  'incidentes_nsp',
];

// Implementar:
// 1. Backup diário (22:00 UTC)
// 2. Retenção: 30 dias
// 3. Teste de restauração semanal
// 4. Alerts se backup falhar
```

**Ação:** Configurar políticas de backup no Supabase/PostgreSQL.

---

##### 2. **Rate Limiting Insuficiente em Operações Críticas**
**Risco:** DDoS, brute force, abuso de recursos  
**Impacto:** Severidade: ALTA | Probabilidade: MÉDIA

```typescript
// ❌ PROBLEMA: Sem rate limiting explícito em operações críticas
// Funções expostas:
// - admin-create-user (pode criar múltiplos usuários)
// - classificar-prioridade (pode ser spammada)
// - processar-pdf-salus (usa recursos pesados)

// SOLUÇÃO RECOMENDADA:
class RateLimiter {
  private limits: Map<string, { count: number; reset: number }> = new Map();

  check(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.limits.get(key);
    
    if (!record || now > record.reset) {
      this.limits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }
    
    if (record.count < maxRequests) {
      record.count++;
      return true;
    }
    
    return false; // Rate limited
  }
}

// Por operação:
// admin-create-user: 5 req/min por usuário admin
// classificar-prioridade: 50 req/min por usuário
// processar-pdf-salus: 2 req/min por usuário (operação pesada)
```

**Ação:** Implementar Redis/rate limiter em Edge Functions.

---

##### 3. **Falta de Encryption de Dados Sensíveis em Nível de Campo**
**Risco:** Acesso não autorizado even com RLS bypass  
**Impacto:** Severidade: ALTA | Probabilidade: BAIXA

```typescript
// ❌ PROBLEMA: Campos sensíveis em plaintext
// Exemplos:
// - paciente_nome (PII)
// - numero_prontuario (PII)
// - CPF em certos contextos
// - Dados de medicação

// SOLUÇÃO RECOMENDADA:
// 1. Usar pgcrypto para criptografia de campo:
CREATE TABLE pacientes (
  id UUID PRIMARY KEY,
  -- public fields
  created_at TIMESTAMP,
  -- encrypted fields
  nome BYTEA,  -- pgp_pub_encrypt
  cpf BYTEA,
  email BYTEA,
  telefone BYTEA
);

// 2. Em aplicação:
async function savePaciento(data: PatientData) {
  const query = supabase
    .from('pacientes')
    .insert({
      ...data,
      // Valores serão criptografados no banco
    });
  await query;
}

// 3. Para leitura:
async function getPaciente(id: string) {
  const { data } = await supabase
    .from('pacientes')
    .select('*, nome, cpf') // Supabase desencripta automaticamente
    .eq('id', id);
  return data;
}
```

**Ação:** Implementar pgcrypto ou Vault para PII.

---

##### 4. **Falta de Multi-Factor Authentication (MFA)**
**Risco:** Acesso não autorizado via credential compromise  
**Impacto:** Severidade: ALTA | Probabilidade: MÉDIA

```typescript
// ❌ PROBLEMA: Apenas autenticação básica (username/password)
// Requisito hospitalar: MFA deve ser OBRIGATÓRIO

// SOLUÇÃO RECOMENDADA:
// Usar Supabase MFA nativo:

// 1. Enroll MFA:
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
});

// 2. Verify MFA:
const { data, error } = await supabase.auth.mfa.verify({
  factorId: data.id,
  code: userEnteredCode,
});

// 3. Forçar MFA para usuários admin:
if (userRole === 'admin' && !mfaEnrolled) {
  redirect('/setup-mfa');
}
```

**Ação:** Implementar e forçar MFA para todos os usuários admin/gestor.

---

#### **ALTO - Deve resolver em próximas 2 semanas**

##### 5. **Falta de Disaster Recovery Plan (DRP)**
**Risco:** Indisponibilidade prolongada em caso de incidente  
**Impacto:** Severidade: Alta | Probabilidade: BAIXA

```typescript
// SOLUÇÃO RECOMENDADA - RTO/RPO:
const DISASTER_RECOVERY_SLA = {
  rto: '4 horas',  // Recovery Time Objective
  rpo: '1 hora',   // Recovery Point Objective
  
  backupStrategy: {
    frequency: 'cada 1 hora', // para RPO
    retention: '30 dias',
    testFrequency: 'semanal',
    location: 'geographically distributed',
  },
  
  failover: {
    automatic: false, // Manual para decisões clínicas críticas
    documentation: 'SOP_DISASTER_RECOVERY.md',
    trainingFrequency: 'trimestral',
  }
};

// Checklist DRP:
// [ ] Backup geograficamente distribuído
// [ ] Teste de restauração completado
// [ ] Documentação de procedimentos
// [ ] Time treinado em procedimentos
// [ ] Plano de comunicação com stakeholders
// [ ] Simulação de incidente (ao menos 2x/ano)
```

**Ação:** Elaborar e documentar DRP completo.

---

##### 6. **Monitoramento & Alerting Insuficiente**
**Risco:** Falhas não detectadas; indisponibilidade prolongada  
**Impacto:** Severidade: ALTA | Probabilidade: MÉDIA

```typescript
// ❌ PROBLEMA: Sem metrics/alerts estruturados para:
// - Performance de queries críticas
// - Taxa de erro em operações hospitalares
// - Latência de respostas
// - Disponibilidade de edge functions
// - Volume de logs de auditoria

// SOLUÇÃO RECOMENDADA - Métricas Críticas:
const CRITICAL_METRICS = {
  // Disponibilidade
  'Api.availability': { 
    threshold: 99.9, // SLA hospitalar
    alert: 'critical'
  },
  
  // Performance
  'Database.query.p95': { 
    threshold: 500, // ms
    alert: 'warning'
  },
  
  // Segurança
  'Audit.logs.delay': {
    threshold: 5000, // ms
    alert: 'critical'  // Logs devem ser quase-instantâneos
  },
  
  // Operações Clínicas
  'Prontuarios.creation.latency.p99': {
    threshold: 2000, // ms
    alert: 'warning'
  },
  
  // Autenticação
  'Auth.failures.rate': {
    threshold: 0.01, // 1%
    alert: 'critical'
  }
};

// Implementação:
import { Sentry } from '@sentry/node';

Sentry.captureException(error, {
  tags: {
    severity: 'critical',
    context: 'prontuario_saving',
  },
  measurements: {
    duration_ms: endTime - startTime,
  }
});
```

**Ação:** Implementar Sentry/DataDog e alerts configurados.

---

##### 7. **Falta de Validação de Integridade de Dados**
**Risco:** Dados corrompidos ou inconsistentes  
**Impacto:** Severidade: MÉDIA | Probabilidade: BAIXA

```typescript
// ❌ PROBLEMA: Sem validação formal de constraints
// Exemplos de inconsistências possíveis:
// - Cama simultâneamente ocupada por 2 pacientes
// - Medicamento dispensado sem registro de entrada
// - Escala de enfermeiro em conflito com turno
// - Leito com paciente `alta` mas registrado como `ocupado`

// SOLUÇÃO RECOMENDADA:
class DataIntegrityValidator {
  async validateBedsConsistency() {
    // Verificar camas em estado inconsistente
    const { data: conflicts } = await supabase
      .from('bed_records')
      .select('*')
      .eq('status', 'ocupado')
      .group_by('cama_id')
      .having('count(*) > 1');
    
    if (conflicts?.length > 0) {
      await supabase.from('integrity_alerts').insert({
        type: 'bed_conflict',
        severity: 'critical',
        details: { conflicts },
      });
    }
  }
  
  async validateMedicationChain() {
    // Verificar cadeia de medicamentos
    const { data: orphaned } = await supabase
      .from('medicamentos_dispensacao')
      .select('*')
      .not('entrada_id', 'is', null)
      .left_join('medicamentos_entrada', 
        foreign_key: 'entrada_id'
      )
      .filter('medicamentos_entrada.id', 'is', null);
    
    if (orphaned?.length > 0) {
      // Alert: dispensação sem entrada registrada
    }
  }
}

// Rodar validação:
// - A cada 1 hora (background job)
// - Em cada alteração de estado crítico
// - On-demand via admin panel
```

**Ação:** Implementar validadores de integridade.

---

#### **MÉDIO - Resolver nas próximas 4 semanas**

##### 8. **Versionamento de Dados Críticos (Audit Trail Completo)**
**Risco:** Impossibilidade de rastrear alterações históricas  
**Impacto:** Severidade: MÉDIA | Probabilidade: MÉDIA

```typescript
// ❌ PROBLEMA: Sem versionamento/historicização de dados críticos
// Ex: alterações em diagnóstico, decisões clínicas, mudanças de prescrição

// SOLUÇÃO RECOMENDADA - Event Sourcing Pattern:
interface AuditEntry {
  id: UUID;
  entity_type: 'paciente' | 'prontuario' | 'medicamento';
  entity_id: UUID;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  changed_by: UUID;
  changed_by_name: string;
  changed_at: ISO8601;
  reason?: string; // Mandatório para alterações clínicas
  ip_address: string;
  user_agent: string;
}

// Implementação:
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID NOT NULL,
  changed_by_name TEXT NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  signature BYTEA, -- Cryptographic signature
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger para logger automático:
CREATE TRIGGER log_prontuario_changes
BEFORE UPDATE ON prontuarios
FOR EACH ROW
EXECUTE FUNCTION log_audit_trail();

// Query para auditoria completa:
async function getProntuarioHistory(prontuarioId: UUID) {
  const { data } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entity_type', 'prontuario')
    .eq('entity_id', prontuarioId)
    .order('changed_at', { ascending: false });
  
  return data; // Histórico completo + quem/quando/por quê
}
```

**Ação:** Implementar audit trail estruturado com versionamento.

---

##### 9. **Testes de Carga & Performance Baseline**
**Risco:** Falhas em produção sob carga  
**Impacto:** Severidade: MÉDIA | Probabilidade: MÉDIA

```typescript
// ❌ PROBLEMA: Sem testes de carga documentados
// Cenários críticos não testados:
// - 100+  usuários simultâneos
// - 1000+ registros em operações em batch
// - Queryies complexas com múltiplos joins

// SOLUÇÃO RECOMENDADA - Load Testing:
import k6 from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp-up
    { duration: '5m', target: 50 },   // Load
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  // Cenários críticos:
  // 1. Login de múltiplos usuários
  // 2. Leitura de prontuários
  // 3. Actualizar status de camas
  // 4. Consultar disponibilidade em tempo real
}

// Baseline esperado (para UPA 24h com 100 leitos):
const PERFORMANCE_SLA = {
  'GET /prontuarios': { p95: 300, p99: 800 }, // ms
  'PUT /camas/:id': { p95: 200, p99: 500 },
  'POST /prontuarios': { p95: 400, p99: 1000 },
  'GET /medicamentos/:id': { p95: 250, p99: 600 },
};
```

**Ação:** Executar testes de carga com k6; documentar baselines.

---

##### 10. **Data Retention & LGPD Right to Erasure**
**Risco:** Violação LGPD (retenção além do necessário)  
**Impacto:** Severidade: MÉDIA | Probabilidade: MÉDIA

```typescript
// ❌ PROBLEMA: Sem política clara de retenção de dados
// LGPD Art. 17: "Direito à eliminação" (direito ao esquecimento)

interface DataRetentionPolicy {
  // Dados de pacientes
  'prontuarios': {
    retention: '7 years', // Requisito legal (prontuário médico)
    deletionWorkflow: 'anonymize', // Ao invés de deletar completamente
    legalBasis: 'Art. 7, IV LGPD (legítimo interesse)'
  },
  
  'pacientes': {
    retention: '7 years after last encounter',
    deletionWorkflow: 'anonymize',
  },
  
  // Logs de auditoria
  'logs_acesso': {
    retention: '2 years',
    deletionWorkflow: 'delete',
    legalBasis: 'Art. 7, VIII LGPD (interesse legítimo da segurança)'
  },
  
  // Cookies / sessões
  'sessions': {
    retention: 'inactive 90 days',
    deletionWorkflow: 'delete',
  },
  
  // Dados temporários
  'temp_uploads': {
    retention: '24 hours',
    deletionWorkflow: 'delete',
  }
}

// Implementação:
CREATE TABLE data_retention_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action: 'anonymize' | 'delete',
  old_data JSONB NOT NULL, -- Backup antes de deletar
  requested_by UUID,
  legal_basis TEXT,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

// Job agendado (daily):
async function enforceDataRetention() {
  const policies = await getRetentionPolicies();
  
  for (const policy of policies) {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - parseDays(policy.retention)
    );
    
    if (policy.deletionWorkflow === 'anonymize') {
      // Anonimizar dados pessoais
      await anonymizeOldRecords(policy.tableName, cutoffDate);
    } else {
      // Deletar completamente
      await deleteOldRecords(policy.tableName, cutoffDate);
    }
  }
}
```

**Ação:** Documentar e implementar política de retenção LGPD-compliant.

---

## 📊 ANÁLISE DE FUNCIONALIDADE HOSPITALAR

### ✅ Funções Implementadas

| Módulo | Status | Notas |
|--------|--------|-------|
| **Mapa de Leitos** | ✅ Completo | Rastreamento em tempo real |
| **Enfermagem** | ✅ Completo | Escalas, sinais vitais |
| **NIR (Internação)** | ✅ Completo | Controle de permanência |
| **Protocolos** | ✅ Completo | Dor Torácica, Sepse (adulto+peds) |
| **Medicações** | ✅ Completo | Dispensação, rastreamento |
| **Qualidade/ONA** | ✅ Completo | Auditorias, indicadores |
| **Segurança do Paciente** | ✅ Completo | Incidentes, análises |
| **RH/Pessoal** | ✅ Completo | Avaliações, banco de horas |
| **Faturamento** | ✅ Completo | Prontuários, avalições |

### ⚠️ Funcionalidades Críticas Para Revisar

#### 1. **Sincronização de Dados em Tempo Real**
```typescript
// ✅ BOM: Usando Supabase Realtime
useEffect(() => {
  const subscription = supabase
    .channel('bed_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bed_records' },
      handleBedChange
    )
    .subscribe();
}, []);

// ⚠️ VERIFICAR: Timeout handling se realtime desconectar
// RECOMENDAÇÃO: Implementar heartbeat + fallback para polling
const REALTIME_CONFIG = {
  heartbeatInterval: 5000, // 5s
  fallbackPollingInterval: 10000, // 10s se realtime falhar
  maxReconnectAttempts: 5,
};
```

**Ação:** Testar failover de Realtime; implementar fallback.

---

#### 2. **Operações Críticas (Admissão/Altas)**
**Status:** ⚠️ REQUER TESTE CLÍNICO

```typescript
// Cenário: Admissão de paciente
// Fluxo DEVE ser IDEMPOTENTE (executar 2x não causa duplicação)

async function admitPatient(data: AdmissionData) {
  const idempotencyKey = `admit-${data.pacient_id}-${data.date}`;
  
  // Verificar se já foi processado
  const { data: existing } = await supabase
    .from('admissions')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .single();
  
  if (existing) {
    // Já admitido — retornar o mesmo resultado
    return existing;
  }
  
  // Transação: Criar prontuário + Alocar cama + Log
  const { data: admission, error } = await supabase
    .rpc('admission_workflow', {
      paciente_data: data,
      idempotency_key: idempotencyKey
    });
  
  return admission;
}
```

**Ação:** Implementar operações idempotentes em fluxos críticos.

---

#### 3. **Protocolo de Escalação de Pacientes (SEP)**
**Status:** ⚠️ REQUER REVISÃO CLÍNICA

```typescript
// PROBLEMA: Sem clara escalação de severidade
// RECOMENDAÇÃO: Implementar SOFA/NEWS scores

interface PatientEscalation {
  currentStatus: 'estável' | 'em_risco' | 'crítico';
  trigger: string; // O quê disparou a escalação
  escalatedTo: string[]; // Quem foi notificado
  recommendedAction: string;
  urgency: 1 | 2 | 3 | 4 | 5; // 5 = máxima urgência
}

// Sistema de alertas:
async function checkPatientStatus(patientId: UUID) {
  const vitals = await getLatestVitals(patientId);
  const score = calculateNEWS(vitals); // NEWS2 Score
  
  if (score >= 7) {
    // Notificar médico imediatamente
    await escalatePatient(patientId, {
      level: 'CRITICAL',
      score,
      action: 'immediate_assessment_required'
    });
  }
}
```

**Ação:** Implementar scoring clínico (NEWS, SOFA) com alertas automáticos.

---

## 🏗️ RECOMENDAÇÕES DE ARQUITETURA

### **Tier 1: Crítico (Implementar em 2 semanas)**
- [ ] MFA obrigatório para todos os usuários
- [ ] Backup geográfico verificável
- [ ] Rate limiting em operações críticas
- [ ] Encryption de PII ao nível de campo

### **Tier 2: Importante (4 semanas)**
- [ ] DRP documentado + testes
- [ ] Monitoramento/alerting completo
- [ ] Validadores de integridade de dados
- [ ] Audit trail com versionamento

### **Tier 3: Melhorias (8 semanas)**  
- [ ] Testes de carga com baselines
- [ ] Policy de retenção LGPD automatizada
- [ ] Operações idempotentes
- [ ] Scoring clínico automático

---

## 📈 MÉTRICAS DE SUCESSO

Após implementar recomendações:

```
✅ Uptime: 99.9% (SLA hospitalar)
✅ RTO: < 4 horas em caso de desastre
✅ RPO: < 1 hora de dados perdidos
✅ MTTR: < 15 minutos para incidentes críticos
✅ Disponibilidade de backup: 100% (verificado diariamente)
✅ Taxa de erro em auth: < 0.1%
✅ Latência p95: < 500ms para operações críticas
✅ Conformidade LGPD: 100% em auditoria
✅ Conformidade ONA: Todos os indicadores presentes
✅ Security Score: ≥ 90/100 (OWASP)
```

---

## 🎯 CONCLUSÃO

**Gestrategic é um sistema bem arquitetado** com segurança e conformidade sólidas como baseline. **Recomenda-se resolver CRÍTICOS** antes de escalar para outras instituições.

**Timeline sugerido:**
- **Sprint 1-2 (2 semanas):** MFA, backup, rate limiting
- **Sprint 3-4 (4 semanas):** DRP, monitoring, integridade
- **Sprint 5-6 (8 semanas):** Melhorias, otimizações
- **Pós-produção:** Testes mensais, auditoria trimestral

**Próxima Revisão:** 30 dias após implementação de Tier 1

---

*Resultado final: "APTO PARA PRODUÇÃO COM RESERVAS CRÍTICAS"*  
*Status: 🟡 AMARELO → 🟢 VERDE (após implementações)*

