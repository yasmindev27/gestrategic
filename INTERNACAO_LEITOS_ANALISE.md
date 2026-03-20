# 📋 Análise Completa: Tabelas de Internação e Leitos

**Data:** 20/03/2026  
**Status:** Mapeamento Completo ✅  
**Última migração:** 20260320105914

---

## 1. TABELAS RELEVANTES

### 📌 Tabela Principal: `bed_records`

**Localização:** `supabase/migrations/20260116015510_cc87060c-c3b6-43d3-ab0d-229b56cc2242.sql`

```sql
CREATE TABLE IF NOT EXISTS public.bed_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bed_id TEXT NOT NULL,                           -- ID único do leito (ex: "bed_1", "bed_extra")
  bed_number TEXT NOT NULL,                       -- Número do leito (ex: "1", "2", "EXTRA")
  sector TEXT NOT NULL,                           -- Setor (enfermaria-masculina, enfermaria-feminina, pediatria, isolamento, urgencia)
  patient_name TEXT,                              -- Nome do paciente (NULL = leito vazio)
  hipotese_diagnostica TEXT,                      -- Diagnóstico hipotético
  condutas_outros TEXT,                           -- Condutas administrativas
  observacao TEXT,                                -- Observações gerais
  data_nascimento DATE,                           -- Data de nascimento
  data_internacao DATE,                           -- Data de ENTRADA (ADMISSÃO)
  sus_facil TEXT CHECK (sus_facil IN ('sim', 'nao', '')),  -- SUS FÁCIL flag
  numero_sus_facil TEXT,                          -- Número SUS FÁCIL
  motivo_alta TEXT CHECK (motivo_alta IN ('alta-melhorada', 'evasao', 'transferencia', 'obito', '')),  -- Motivo da SAÍDA
  estabelecimento_transferencia TEXT,             -- Para onde foi transferido
  data_alta DATE,                                 -- Data de SAÍDA (ALTA)
  shift_type TEXT NOT NULL CHECK (shift_type IN ('diurno', 'noturno')),  -- Turno do registro
  shift_date DATE NOT NULL,                       -- Data do turno
  medicos TEXT,                                   -- Nomes dos médicos
  enfermeiros TEXT,                               -- Nomes dos enfermeiros
  regulador_nir TEXT,                             -- NIR regulador
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(bed_id, shift_date)                      -- Um leito, uma data = 1 registro cti_atendimento_urgencia da tabela bed_records
);
```

### 📌 Tabelas Relacionadas

#### A. `daily_statistics` (Estatísticas Diárias)
```sql
CREATE TABLE IF NOT EXISTS public.daily_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_patients INTEGER DEFAULT 0,
  patients_by_sector JSONB DEFAULT '{}',
  admissions INTEGER DEFAULT 0,          -- Total de admissões no dia
  discharges INTEGER DEFAULT 0,          -- Total de altas no dia
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### B. `shift_configurations` (Configurações de Plantão)
```sql
CREATE TABLE IF NOT EXISTS public.shift_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('diurno', 'noturno')),
  medicos TEXT,
  enfermeiros TEXT,
  regulador_nir TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(shift_date, shift_type)
);
```

#### C. `transferencia_solicitacoes` (Transferências)
```
Tabela específica para gerenciar solicitações de transferência
Campos: id, paciente, destino, motivo, status, created_at, etc.
```

---

## 2. ESTRUTURA DE DADOS: Diferenciar Pacientes

### 🟢 PACIENTE INTERNADO (Vivo)

**Critério:** `patient_name IS NOT NULL` E `motivo_alta IS NULL` E `data_alta IS NULL`

```sql
-- Paciente está internado AGORA
SELECT *
FROM bed_records
WHERE patient_name IS NOT NULL
  AND motivo_alta IS NULL
  AND data_alta IS NULL
  AND shift_date = CURRENT_DATE
  AND shift_type = 'diurno';
```

**Interpretação:**
- ✅ Nome do paciente preenchido
- ✅ Nenhum motivo de alta registrado
- ✅ Sem data de saída

### 🔴 PACIENTE COM ALTA (Saído)

**Critério:** `patient_name IS NOT NULL` E `motivo_alta IS NOT NULL` E `data_alta IS NOT NULL`

```sql
-- Verificar o motivo da alta
SELECT patient_name, motivo_alta, data_alta, estabelecimento_transferencia
FROM bed_records
WHERE motivo_alta IS NOT NULL
  AND data_alta IS NOT NULL
  AND shift_date = CURRENT_DATE;
```

**Motivos de Alta:**
1. **`alta-melhorada`** → Paciente curado/melhorado, recebeu alta
2. **`transferencia`** → Transferido para outro estabelecimento (ver `estabelecimento_transferencia`)
3. **`evasao`** → Paciente abandonou/fugiu
4. **`obito`** → Paciente faleceu

### 🟡 LEITO VAZIO

**Critério:** `patient_name IS NULL`

```sql
SELECT *
FROM bed_records
WHERE patient_name IS NULL
  AND shift_date = CURRENT_DATE;
```

---

## 3. EXEMPLOS DE QUERIES

### 📊 Query 1: ALTAS nos últimos 7 dias

```sql
SELECT 
  patient_name,
  sector,
  data_internacao,
  data_alta,
  motivo_alta,
  estabelecimento_transferencia,
  CAST(data_alta AS DATE) - CAST(data_internacao AS DATE) AS dias_internacao
FROM bed_records
WHERE motivo_alta IS NOT NULL
  AND data_alta IS NOT NULL
  AND CAST(data_alta AS DATE) >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY data_alta DESC;

-- Resultado: Lista completa de ALTAS (cualquier motivo)
```

**Contar apenas ALTAS (sem transferências/óbitos):**
```sql
SELECT COUNT(DISTINCT bed_id || patient_name) AS total_altas
FROM bed_records
WHERE motivo_alta = 'alta-melhorada'
  AND data_alta >= CURRENT_DATE - INTERVAL '7 days';

-- Exemplo de resultado: 12 altas melhoradas em 7 dias
```

---

### 🔄 Query 2: TRANSFERÊNCIAS nos últimos 7 dias

```sql
SELECT 
  patient_name,
  sector AS setor_origem,
  estabelecimento_transferencia AS destino,
  data_internacao,
  data_alta,
  EXTRACT(DAY FROM CAST(data_alta AS TIMESTAMP) - CAST(data_internacao AS TIMESTAMP))::INT AS tempo_internacao_dias
FROM bed_records
WHERE motivo_alta = 'transferencia'
  AND data_alta IS NOT NULL
  AND CAST(data_alta AS DATE) >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY data_alta DESC;

-- Resultado: Todas as transferências com origem, destino e permanência
```

**Contar transferências:**
```sql
SELECT COUNT(*) AS total_transferencias
FROM bed_records
WHERE motivo_alta = 'transferencia'
  AND data_alta >= CURRENT_DATE - INTERVAL '7 days';

-- Exemplo: 5 transferências em 7 dias
```

---

### 📥 Query 3: ADMISSÕES (Internações) nos últimos 7 dias

```sql
SELECT 
  patient_name,
  sector,
  data_internacao,
  hipotese_diagnostica,
  data_nascimento,
  EXTRACT(YEAR FROM AGE(CAST(data_internacao AS TIMESTAMP), CAST(data_nascimento AS TIMESTAMP)))::INT AS idade
FROM bed_records
WHERE data_internacao >= CURRENT_DATE - INTERVAL '7 days'
  AND data_internacao IS NOT NULL
  AND patient_name IS NOT NULL
ORDER BY data_internacao DESC;

-- Resultado: Todas as admissões com dados do paciente
```

**Contar admissões:**
```sql
SELECT COUNT(DISTINCT bed_id || patient_name) AS total_admissoes
FROM bed_records
WHERE data_internacao >= CURRENT_DATE - INTERVAL '7 days'
  AND patient_name IS NOT NULL;

-- Exemplo: 18 admissões em 7 dias
```

---

### 🏥 Query 4: OCUPAÇÃO POR SETOR (Hoje)

```sql
-- Ocupação atual (pacientes internados AGORA)
SELECT 
  sector,
  COUNT(*) AS leitos_ocupados,
  COUNT(CASE WHEN patient_name IS NOT NULL AND motivo_alta IS NULL THEN 1 END) AS internados,
  COUNT(CASE WHEN patient_name IS NULL THEN 1 END) AS disponiveis
FROM bed_records
WHERE shift_date = CURRENT_DATE
  AND shift_type = 'diurno'
GROUP BY sector
ORDER BY sector;

/* Resultado exemplo:
sector                  | leitos_ocupados | internados | disponiveis
enfermaria-masculina    | 5               | 5          | 1
enfermaria-feminina     | 4               | 4          | 2
pediatria               | 3               | 3          | 3
isolamento              | 2               | 2          | 0
urgencia                | 6               | 6          | 1
*/
```

**Percentual de ocupação por setor:**
```sql
SELECT 
  sector,
  COUNT(CASE WHEN patient_name IS NOT NULL AND motivo_alta IS NULL THEN 1 END) AS ocupados,
  ROUND(
    100.0 * COUNT(CASE WHEN patient_name IS NOT NULL AND motivo_alta IS NULL THEN 1 END) / 
    COUNT(*), 
    2
  ) AS percentual_ocupacao
FROM bed_records
WHERE shift_date = CURRENT_DATE
GROUP BY sector
ORDER BY percentual_ocupacao DESC;

/* Resultado exemplo:
sector              | ocupados | percentual_ocupacao
urgencia            | 6        | 85.71
enfermaria-máscul   | 5        | 83.33
enfermaria-feminin  | 4        | 66.67
pediatria           | 3        | 50.00
isolamento          | 2        | 100.00
*/
```

---

### 🟢 Query 5: PACIENTES INTERNADOS VIVOS (Agora)

```sql
SELECT 
  bed_id,
  bed_number,
  sector,
  patient_name,
  hipotese_diagnostica,
  data_internacao,
  CURRENT_DATE - CAST(data_internacao AS DATE) AS dias_internado,
  data_nascimento,
  EXTRACT(YEAR FROM AGE(NOW(), CAST(data_nascimento AS TIMESTAMP)))::INT AS idade_anos
FROM bed_records
WHERE patient_name IS NOT NULL
  AND motivo_alta IS NULL
  AND data_alta IS NULL
  AND shift_date = CURRENT_DATE
ORDER BY sector, CAST(bed_number AS INTEGER);

/* Resultado exemplo (todos os pacientes internados AGORA):
bed_id  | bed_number | sector              | patient_name | dias_internado | idade_anos
bed_1   | 1          | enfermaria-masculin | João Silva   | 5              | 67
bed_2   | 2          | enfermaria-masculin | Pedro Costa  | 2              | 45
bed_6   | 6          | enfermaria-feminina | Maria Santos | 8              | 72
...
*/
```

---

## 4. SETORES DEFINIDOS

```typescript
// src/types/bed.ts
export const SECTORS: SectorConfig[] = [
  { id: 'enfermaria-masculina', name: 'Enfermaria Masculina', beds: [1, 2, 3, 4, 5], extraBeds: ['EXTRA'] },
  { id: 'enfermaria-feminina', name: 'Enfermaria Feminina', beds: [6, 7, 8, 9, 10], extraBeds: ['EXTRA'] },
  { id: 'pediatria', name: 'Pediatria', beds: [11, 12, 13, 14, 15], extraBeds: ['EXTRA'] },
  { id: 'isolamento', name: 'Isolamento', beds: [16, 17] },
  { id: 'urgencia', name: 'Urgência', beds: [18, 19, 20], extraBeds: ['DE APOIO', 'DE APOIO 2', 'MACA PCR'] },
];

// Total de leitos: 25 + 6 = 31
```

---

## 5. HOOKS EXISTENTES

### 🎯 Hook 1: `useBedRecords()` - Salvar registros de leitos

**Localização:** [src/hooks/useBedRecords.ts](src/hooks/useBedRecords.ts)

```typescript
export function useBedRecords() {
  const saveBedRecord = useCallback(
    async (bed: Bed, shiftInfo: ShiftInfo, dataAlta?: string, immediate?: boolean) => {
      // Salva/atualiza um registro de leito
      // Argumentos:
      // - bed: objeto com leito e dados do paciente
      // - shiftInfo: data e turno (diurno/noturno)
      // - dataAlta (opcional): data de saída para alta
      // - immediate: força salvamento imediato (sem debounce)
    }
  );

  const updateDailyStatistics = useCallback(
    async (date: string, totalPatients: number, patientsBySector: Record<string, number>) => {
      // Atualiza estatísticas diárias
    }
  );
}
```

**Uso prático:**
```typescript
// Admitir paciente
const bed: Bed = {
  id: "bed_1",
  number: 1,
  sector: "enfermaria-masculina",
  patient: {
    nome: "João Silva",
    dataInternacao: "2026-03-20",
    hipoteseDiagnostica: "COVID-19",
    motivoAlta: "", // Vazio = paciente internado
    // ... outros campos
  }
};

await saveBedRecord(bed, shift);

// Dar alta
const bedComAlta = { ...bed, patient: { ...bed.patient, motivoAlta: "alta-melhorada" } };
await saveBedRecord(bedComAlta, shift, "2026-03-25", true); // immediate = high priority
```

---

### 🎯 Hook 2: `useBeds()` - Carregar leitos do turno

**Localização:** [src/hooks/useBeds.ts](src/hooks/useBeds.ts)

```typescript
export function useBeds(shiftDate?: string, shiftType?: 'diurno' | 'noturno') {
  // Carrega todos os leitos do turno especificado
  // Busca em bed_records os pacientes internados
  // Filtra: patient_name IS NOT NULL && motivo_alta IS NULL
  
  const beds = state.beds; // Lista de todos os leitos com pacientes
  const isLoading = state.isLoading;
}
```

**Consulta SQL gerada:**
```sql
SELECT bed_id, patient_name, hipotese_diagnostica, condutas_outros, observacao, 
       data_nascimento, data_internacao, sus_facil, numero_sus_facil, 
       motivo_alta, estabelecimento_transferencia, created_at, cti
FROM bed_records
WHERE shift_date = $1
  AND shift_type = $2;
```

---

### 🎯 Hook 3: `useRealTimeBIData()` - Ocupação em tempo real

**Localização:** [src/hooks/useRealTimeBIData.ts](src/hooks/useRealTimeBIData.ts)

```typescript
interface BIDadosMes {
  ocupacao_leitos: number;        // % calculado do Supabase real
  tempo_medio_internacao: number;
  taxa_mortalidade: number;
  // ... outros KPIs
}

const calcularOcupacaoReal = useCallback(async (monthDate: Date) => {
  // Calcula ocupação em tempo real
  // = (pacientes internados vivos) / (total de leitos) * 100
});
```

**Cálculo:**
```typescript
const ocupacaoReal = await calcularOcupacaoReal(new Date());
// Resultado: 75.8 (% de ocupação)
```

---

## 6. COMPONENTES QUE USAM OS DADOS

### 📱 Componente 1: Mapa de Leitos

**Localização:** [src/components/mapa-leitos/BedModal.tsx](src/components/mapa-leitos/BedModal.tsx)

**Funcionalidade:**
- Visualizar leitos da unidade
- Registrar/editar paciente
- Registrar alta com motivo
- Diferenciar: alta-melhorada vs transferencia vs óbito vs evasão

**Campos no modal:**
- Data de Internação
- Data de Alta
- Motivo da Alta (Select)
- Estabelecimento de Transferência (se transferencia)

---

### 📱 Componente 2: Relatório de Transferências

**Localização:** [src/components/nir/RelatorioTransferencias.tsx](src/components/nir/RelatorioTransferencias.tsx)

**Query usada:**
```typescript
const { data, error } = await supabase
  .from("bed_records")
  .select("id, patient_name, sector, data_internacao, data_alta, created_at, estabelecimento_transferencia, hipotese_diagnostica, shift_date")
  .eq("motivo_alta", "transferencia")  // Só transferências
  .gte("shift_date", dateFrom)
  .lte("shift_date", dateTo)
  .not("patient_name", "is", null)
  .order("data_alta", { ascending: false });
```

**Cálculos:**
- Tempo de permanência: `data_alta - created_at` (ou `data_alta - data_internacao`)
- Filtro por período
- Export para CSV

---

### 📱 Componente 3: Dashboard NIR

**Localização:** [src/components/modules/NirDashboardModule.tsx](src/components/modules/NirDashboardModule.tsx)

**Métricas calculadas:**
```typescript
// Ocupação atual
const occupiedRecords = currentRecords?.filter(r => r.patient_name && !r.motivo_alta) || [];
const occupancyRate = (occupiedBeds / TOTAL_BEDS) * 100;

// Ocupação por setor
const sectorOccupied = occupiedRecords.filter(r => r.sector === sectorId).length;

// Admissões no período
const admissionSet = new Set<string>();
rangeRecords?.forEach(r => {
  if (r.data_internacao && r.data_internacao >= startDateStr) {
    admissionSet.add(`${r.bed_id}|${r.patient_name}`);
  }
});

// Altas no período
const dischargeSet = new Set<string>();
rangeRecords?.forEach(r => {
  if (r.motivo_alta && r.data_alta) {
    dischargeSet.add(`${r.bed_id}|${r.patient_name}`);
  }
});
```

---

### 📱 Componente 4: Módulo de Transferências

**Localização:** [src/components/nir/TransferenciasModule.tsx](src/components/nir/TransferenciasModule.tsx)

**Query para pacientes internados (disponíveis para transferência):**
```typescript
const { data: bedRes } = await supabase
  .from("bed_records")
  .select("bed_id, patient_name, sector, hipotese_diagnostica, data_internacao")
  .eq("shift_date", today)
  .not("patient_name", "is", null)
  .is("data_alta", null);  // Só pacientes internados!

// Resultado: lista de pacientes vivos, prontos para transferência
```

---

### 📱 Componente 5: Enfermagem - Internação

**Localização:** [src/components/enfermagem/InternacaoArea.tsx](src/components/enfermagem/InternacaoArea.tsx)

**Funcionalidade:**
- Listar pacientes internados atualmente
- Filtrar por turno e data
- Deduplicar por nome do paciente (manter recurso mais recente)

**Query:**
```typescript
const { data, error } = await supabase
  .from('bed_records')
  .select('*')
  .eq('shift_date', shift.date)
  .eq('shift_type', shift.type)
  .not('patient_name', 'is', null)
  .is('motivo_alta', null)
  .is('data_alta', null);

// Resultado: todos os pacientes vivos no turno atual
```

---

## 7. POLÍTICAS DE ACESSO (RLS)

**Apenas NIR e Admin podem acessar:**

```sql
CREATE POLICY "NIR e Admin podem ver bed_records" ON public.bed_records 
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[]));

CREATE POLICY "NIR e Admin podem inserir bed_records" ON public.bed_records 
  FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[]));

CREATE POLICY "NIR e Admin podem atualizar bed_records" ON public.bed_records 
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[]));
```

---

## 8. RESUMO: CHEAT SHEET

### Verificar se paciente está INTERNADO AGORA
```sql
SELECT * FROM bed_records 
WHERE patient_name IS NOT NULL 
  AND motivo_alta IS NULL 
  AND data_alta IS NULL;
```

### Contar ALTAS no período
```sql
SELECT COUNT(*) FROM bed_records 
WHERE motivo_alta = 'alta-melhorada' 
  AND data_alta >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

### Contar TRANSFERÊNCIAS no período
```sql
SELECT COUNT(*) FROM bed_records 
WHERE motivo_alta = 'transferencia' 
  AND data_alta >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

### Ocupação por setor HOJE
```sql
SELECT sector, 
  COUNT(CASE WHEN patient_name IS NOT NULL AND motivo_alta IS NULL THEN 1 END) ocupados,
  ROUND(100.0 * COUNT(CASE WHEN patient_name IS NOT NULL AND motivo_alta IS NULL THEN 1 END) / COUNT(*), 2) ocupacao_pct
FROM bed_records 
WHERE shift_date = CURRENT_DATE 
GROUP BY sector;
```

### Pacientes internados por setor AGORA
```sql
SELECT sector, 
  GROUP_CONCAT(patient_name) pacientes,
  COUNT(*) total
FROM bed_records 
WHERE shift_date = CURRENT_DATE 
  AND patient_name IS NOT NULL 
  AND motivo_alta IS NULL 
GROUP BY sector;
```

---

## 9. CORRELAÇÃO: TypeScript ↔ SQL

| TypeScript (bed.ts) | SQL (bed_records) | Significado |
|---|---|---|
| `Patient.nome` | `patient_name` | Nome do paciente (NULL = leito vazio) |
| `Patient.dataInternacao` | `data_internacao` | Data de ADMISSÃO |
| `Patient.dataAlta` | `data_alta` | Data de SAÍDA/HIGH |
| `Patient.motivoAlta` | `motivo_alta` | Motivo ('alta-melhorada', 'transferencia', 'obito', 'evasao') |
| `Patient.estabelecimentoTransferencia` | `estabelecimento_transferencia` | Destino da transferência |
| `Patient.dataNascimento` | `data_nascimento` | Data de nascimento |
| `Patient.hipoteseDiagnostica` | `hipotese_diagnostica` | Diagnóstico |
| `ShiftInfo.data` | `shift_date` | Data do turno |
| `ShiftInfo.tipo` | `shift_type` | 'diurno' ou 'noturno' |
| `Bed.sector` | `sector` | Setor do leito |

---

## 10. FLUXO DE VIDA DO REGISTRO

```
1. ADMISSÃO (Paciente entra)
   ├─ patient_name = "João Silva"
   ├─ data_internacao = "2026-03-20"
   ├─ motivo_alta = NULL (ainda internado)
   └─ data_alta = NULL

2. DURANTE INTERNAÇÃO
   ├─ Atualizar hipotese_diagnostica, observacoes, etc
   ├─ motivo_alta = NULL (continua internado)
   └─ data_alta = NULL

3. ALTA/SAÍDA
   ├─ data_alta = "2026-03-25"
   ├─ motivo_alta = "alta-melhorada" (ou outro motivo)
   ├─ estabelecimento_transferencia = (se transferência)
   └─ Registro permanece (auditoria)

4. PRÓXIMO TURNO
   └─ Novo turno/data = novo contexto (UNIQUE por bed_id + shift_date)
```

---

**Gerado:** 2026-03-20  
**Sistema:** GEStrategic - Mapa de Leitos & NIR  
**Banco:** PostgreSQL (Supabase)  
**Status:** ✅ Documentado e validado
