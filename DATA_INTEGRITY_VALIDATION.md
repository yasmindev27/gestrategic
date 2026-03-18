# 📋 Data Integrity Validation System

## Overview

The **Data Integrity Validation System** is a critical component of Gestrategic's Sprint 1 implementation aimed at achieving **🟢 GREEN** production status. It continuously monitors hospital data for inconsistencies that could affect patient care, operational efficiency, and system reliability.

## Purpose

Hospital systems handle critical data:
- **Patient records** → Lives depend on accuracy
- **Bed allocation** → Prevents patient placement errors
- **Medication tracking** → Prevents dispensing errors
- **Shift scheduling** → Prevents staff overload

This validation system **automatically detects** data problems that could cause:
- ❌ Patient admissions to the same bed simultaneously
- ❌ Medications dispensed without proper entry records
- ❌ Nurses assigned to overlapping shifts
- ❌ Duplicate patient admissions on the same day

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│           Data Integrity Validation System               │
└─────────────────────────────────────────────────────────┘
                               ↓
                ┌──────────────────────────────┐
                │   4 Automated Validators      │
                ├──────────────────────────────┤
                │ 1. Bed Consistency Check     │
                │ 2. Medication Chain Balance  │
                │ 3. Shift Conflicts Detection │
                │ 4. Patient Admissions Check  │
                └──────────────────────────────┘
                               ↓
                ┌──────────────────────────────┐
                │    Alert & Reporting         │
                ├──────────────────────────────┤
                │ • Log all results            │
                │ • Create integrity alerts    │
                │ • Notify admins/gestores     │
                │ • Track resolution           │
                └──────────────────────────────┘
```

### Execution Flow

1. **Scheduled via Cron** (6-hour intervals)
   - Supabase Edge Function: `execute-validators`
   - Runs using service role (bypasses RLS for full visibility)

2. **Frontend Trigger** (Manual)
   - Admins/gestores can run validation anytime via Dashboard
   - Modal interface for monitoring and resolution

3. **Continuous Integration** (Real-time)
   - `useDataValidation` hook monitors in background
   - Alerts trigger Toast notifications
   - Auto-reload of alerts every 30 minutes

---

## Validators in Detail

### 1️⃣ Bed Simultaneous Occupancy Check

**What it does:** Prevents two patients from being assigned to the same bed at the same time.

**SQL Logic:**
```sql
SELECT cama_id, count(*)
FROM bed_records
WHERE status = 'ocupado'
  AND data_internacao >= NOW() - INTERVAL '7 days'
GROUP BY cama_id
HAVING count(*) > 1;
```

**Alert:** `severity: 'critical'`
- Bed conflicts directly endanger patient safety
- Immediate action required

**Example Alert:**
```
🔴 CRITICAL - Bed 405: 2 active occupancy records found
   → Patient ABC123 (since 2025-01-12)
   → Patient XYZ789 (since 2025-01-12)
```

---

### 2️⃣ Medication Entry/Exit Balance

**What it does:** Ensures every medication dispensation has a corresponding entry record.

**SQL Logic:**
```sql
SELECT COUNT(*)
FROM medicamentos_dispensacao md
WHERE md.entrada_id IS NULL
  AND md.created_at >= NOW() - INTERVAL '7 days';
```

**Alert:** `severity: 'high'`
- Missing entries break the chain of accountability
- Audit trail becomes unreliable
- LGPD compliance at risk

**Example Alert:**
```
🟠 HIGH - Medication Entry/Exit Balance
   → 3 dispensations lack entry records
   → Affects: Amoxicilina 500mg (Lote: X2025), Dipirona (Lote: Y2025)
```

---

### 3️⃣ Nursing Shift Conflicts Detection

**What it does:** Detects when a nurse is assigned to two shifts that overlap in time.

**SQL Logic (via Function):**
```sql
SELECT es1.user_id, es1.data, 
       es1.hora_inicio, es1.hora_fim,
       es2.hora_inicio, es2.hora_fim
FROM enfermagem_escalas es1
JOIN enfermagem_escalas es2 
  ON es1.user_id = es2.user_id 
  AND es1.data = es2.data
  AND es1.id != es2.id
WHERE es1.hora_inicio < es2.hora_fim 
  AND es1.hora_fim > es2.hora_inicio
  AND es1.data >= NOW() - INTERVAL '7 days';
```

**Alert:** `severity: 'high'`
- Staff safety issue (fatigue, burnout)
- Operational planning failure
- Labor law violation risk

**Example Alert:**
```
🟠 HIGH - Shift Conflicts
   → Enfermeira Silva: 07:00-13:00 + 12:00-18:00 (Jan 13)
   → Overlapping 1 hour - reassign immediately
```

---

### 4️⃣ Patient Multiple Admissions Check

**What it does:** Flags patients admitted multiple times on the same date (potential data entry error).

**SQL Logic:**
```sql
SELECT paciente_id, data_internacao, COUNT(*)
FROM bed_records
WHERE data_internacao >= NOW() - INTERVAL '7 days'
GROUP BY paciente_id, data_internacao
HAVING COUNT(*) > 1;
```

**Alert:** `severity: 'medium'`
- Likely data entry error
- Creates confusion in patient records
- Audit trail becomes murky

**Example Alert:**
```
🟡 MEDIUM - Patient Multiple Admissions
   → Patient João Silva (ID: P12345): 2 admissions on 2025-01-12
   → Beds: 401 at 07:30 + 408 at 14:15 (same day)
```

---

## Data Model

### Tables Created

#### `validation_logs` - Audit Trail of All Validations

```sql
CREATE TABLE validation_logs (
  id UUID PRIMARY KEY,
  validator_name VARCHAR(255),        -- e.g., 'bed_simultaneous_occupancy'
  passed BOOLEAN,                     -- true/false result
  issues_count INT,                   -- number of problems found
  items_scanned INT,                  -- records checked
  details JSONB,                      -- detailed issue list
  executed_at TIMESTAMPTZ,            -- when validation ran
  created_at TIMESTAMPTZ              -- when logged
);
```

**Indexes:**
- `validator_name` - Filter by validator
- `executed_at DESC` - Latest executions first
- `passed` - Find failed validations quickly

**Sample Record:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "validator_name": "bed_simultaneous_occupancy",
  "passed": false,
  "issues_count": 2,
  "items_scanned": 147,
  "details": {
    "issues": ["Bed 405: 2 active records", "Bed 412: 2 active records"]
  },
  "executed_at": "2025-01-12T18:00:00Z"
}
```

---

#### `integrity_alerts` - Individual Issues Requiring Resolution

```sql
CREATE TABLE integrity_alerts (
  id UUID PRIMARY KEY,
  severity VARCHAR(20),              -- 'critical' | 'high' | 'medium' | 'low'
  validator VARCHAR(255),            -- which validator found this
  description TEXT,                  -- human-readable explanation
  affected_records INT,              -- how many records involved
  details JSONB,                     -- structured data for debugging
  resolution_notes TEXT,             -- admin's resolution comments
  resolved_at TIMESTAMPTZ,           -- when marked resolved (NULL = active)
  created_at TIMESTAMPTZ
);
```

**Indexes:**
- `severity` - Filter by urgency
- `validator` - Group by type
- `resolved_at` - Find active/resolved alerts
- `created_at DESC + resolved_at IS NULL` - Active alerts first

**Sample Active Alert:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440111",
  "severity": "critical",
  "validator": "bed_simultaneous_occupancy",
  "description": "Bed 405 has 2 simultaneously active occupancy records",
  "affected_records": 2,
  "details": {
    "cama_id": "405",
    "records": ["rec-123", "rec-456"]
  },
  "resolution_notes": null,  -- Active (unresolved)
  "resolved_at": null,
  "created_at": "2025-01-12T18:02:15Z"
}
```

**Sample Resolved Alert:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440222",
  "severity": "medium",
  "validator": "patient_multiple_admissions",
  "description": "Patient P98765: 2 admissions on 2025-01-12",
  "affected_records": 2,
  "details": { "paciente_id": "P98765", "data": "2025-01-12" },
  "resolution_notes": "Data entry error - merged duplicate records. Correct admission is Bed 401 at 07:30.",
  "resolved_at": "2025-01-12T19:45:32Z",
  "created_at": "2025-01-12T18:10:00Z"
}
```

---

## Frontend Implementation

### Components

#### `DataIntegrityMonitor` - Main Dashboard Modal
Located: `src/components/DataIntegrityMonitor.tsx`

**Features:**
- 📊 Summary cards (active alerts, last run, failed checks, total issues)
- ▶️ "Run Now" button for manual validation
- ✓ Validation results display
- 🚨 Active alerts list with severity colors
- 📝 Alert resolution workflow

**Usage:**
```tsx
import { DataIntegrityMonitor } from '@/components/DataIntegrityMonitor';
import { useSupabase } from '@/integrations/supabase';

export function AdminDashboard() {
  const supabase = useSupabase();
  const [monitorOpen, setMonitorOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setMonitorOpen(true)}>
        🔍 Data Integrity Check
      </Button>
      
      <DataIntegrityMonitor
        supabase={supabase}
        open={monitorOpen}
        onClose={() => setMonitorOpen(false)}
      />
    </>
  );
}
```

### Hooks

#### `useDataValidation` - Orchestrates Validation Runs
Located: `src/hooks/useDataValidation.ts`

**Main Hook:**
```tsx
const { status, runNow, isRunning, hasFails } = useDataValidation(
  supabase,
  true  // enabled
);

// status = {
//   results: ValidationResult[],
//   lastRun: Date | null,
//   alertCount: number,
//   failedValidators: string[]
// }
```

**Features:**
- Runs validations every 6 hours automatically
- Manual trigger via `runNow()`
- Toast notifications for critical issues
- Structured result tracking

---

#### `useValidationAlerts` - Alert Management
Located: `src/hooks/useDataValidation.ts`

**Usage:**
```tsx
const { alerts, activeCount, resolve, reload } = useValidationAlerts(supabase);

// Resolve an alert
await resolve(alertId, "Merged duplicate records - verified with medical staff");

// Active alerts are auto-reloaded every 30 minutes
```

---

### Utilities

#### `data-validators.ts` - Core Validation Logic
Located: `src/lib/data-validators.ts`

**Exported Functions:**
- `validateBedsConsistency(supabase)` → ValidationResult
- `validateMedicationChain(supabase)` → ValidationResult
- `validateShiftConflicts(supabase)` → ValidationResult
- `validatePatientAdmissions(supabase)` → ValidationResult
- `runAllValidations(supabase)` → ValidationResult[]
- `getValidationStatus(supabase)` → { lastValidations, activeAlerts, resolvedAlerts }

---

## Backend Implementation

### Edge Function - `execute-validators`
Located: `supabase/functions/execute-validators/index.ts`

**Purpose:** Scheduled background job that runs validators automatically

**Deployment:**
```bash
supabase functions deploy execute-validators --project-ref <ref>
```

**Configuration (Supabase Console):**
1. Go to Functions → execute-validators → Details
2. Set HTTP Method: `POST`
3. Configure Cron Job: `0 */6 * * *` (every 6 hours)
4. Add secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Example Cron Response:**
```json
{
  "timestamp": "2025-01-12T18:00:00.000Z",
  "validators_run": 4,
  "validators_passed": 3,
  "validators_failed": 1,
  "total_issues": 2,
  "results": [
    {
      "validator": "bed_simultaneous_occupancy",
      "passed": false,
      "issues": ["Bed 405: 2 active records"],
      "itemsScanned": 147
    },
    ... (3 more validators)
  ]
}
```

---

## Integration Points

### 1. Dashboard Integration
Add to admin dashboard (`src/components/SalusPanels.tsx`):

```tsx
import { DataIntegrityMonitor } from '@/components/DataIntegrityMonitor';

export function AdminPanel() {
  const [showValidator, setShowValidator] = useState(false);

  return (
    <>
      <Button 
        variant="outline"
        onClick={() => setShowValidator(true)}
        className="gap-2"
      >
        <AlertTriangle className="w-4 h-4" />
        Data Integrity
        {activeAlertCount > 0 && (
          <Badge variant="destructive">{activeAlertCount}</Badge>
        )}
      </Button>

      <DataIntegrityMonitor 
        supabase={supabase}
        open={showValidator}
        onClose={() => setShowValidator(false)}
      />
    </>
  );
}
```

### 2. Alert Notifications
Integrate with existing alert system:

```tsx
// In useDataValidation hook
if (criticalIssues.length > 0) {
  toast({
    title: "🚨 Data Integrity Issues Detected",
    description: `${criticalIssues.length} validators failed`,
    variant: "destructive"
  });
  
  // Also notify via Sentry if available
  Sentry.captureMessage(...)
}
```

### 3. Sidebar Badge
Add indicator in Sidebar (like MFA status):

```tsx
<NavLink 
  to="/admin/integrity"
  label="Data Integrity"
  icon={AlertTriangle}
  badge={activeAlertsCount > 0 ? activeAlertsCount : undefined}
  badgeVariant="destructive"
/>
```

---

## Troubleshooting

### Issue: Validators taking too long
**Solution:**
- Limit data range (e.g., last 7 days instead of all-time)
- Add more specific indexes to `bed_records`, `medicamentos_dispensacao`
- Split validators into separate edge functions if needed

### Issue: False positives in shift conflicts
**Solution:**
- Fine-tune time overlap logic in `check_shift_conflicts()` function
- Add grace period (e.g., 15-minute buffer between shifts)
- Exclude break times from overlap calculation

### Issue: Alerts not creating
**Solution:**
- Check RLS policies on `integrity_alerts` table
- Verify service role has INSERT permission
- Check edge function logs in Supabase Dashboard → Functions

### Issue: Validators running too frequently (6 hours is too short)
**Solution:**
- Adjust cron schedule: Change `0 */6 * * *` to `0 2 * * *` (daily at 2 AM)
- Modify in: Supabase Console → Functions → execute-validators → Details

---

## Performance & Scalability

### Current Implementation (Sprint 1)

| Metric | Value | Notes |
|--------|-------|-------|
| Execution Time | ~2-5 sec | Per full validation run |
| Data Scanned | ~1000-5000 records | Rolling 7-day window |
| Alert Storage | Unlimited | PostgreSQL can handle 1M+ records easily |
| Check Frequency | 6 hours | Configurable via cron |
| RLS Bypass | Service Role | Required for full data visibility |

### Optimization Roadmap (Future)

- [ ] Incremental validation (only check records modified since last run)
- [ ] Parallel validator execution
- [ ] Database-level triggers for real-time validation
- [ ] Metric export to monitoring system (Sentry, DataDog)
- [ ] Alert prioritization via ML

---

## LGPD & Compliance

✅ **Data Protection:**
- Validation logs contain only metadata (not PII)
- Alert details use record IDs, not patient names
- Access restricted to admin/gestor roles via RLS

✅ **Audit Trail:**
- All validations logged with timestamp
- Alert resolution tracked with notes
- Immutable deletion prevents tampering

✅ **Patient Rights:**
- No automated decisions based on single validator
- Manual review required before corrective action
- Transparency in alert resolution process

---

## References

- [LGPD Compliance Guide](./LGPD_COMPLIANCE.md)
- [Data Validation Best Practices](./VALIDATION_BEST_PRACTICES.md)
- [Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [PostgreSQL Triggers Tutorial](https://www.postgresql.org/docs/current/sql-createtrigger.html)

---

## Support & Maintenance

**Sprint 1 Deliverables:**
- ✅ Core validators (4 types)
- ✅ Alert system with RLS
- ✅ Frontend monitor component
- ✅ Background job via Edge Function

**Sprint 2+ Enhancements:**
- [ ] Auto-remediation for common issues
- [ ] Validator performance monitoring
- [ ] Custom validator creation interface
- [ ] Integration with messaging system (Slack, email)
- [ ] Validation result export (CSV/PDF)

---

**Last Updated:** 2025-01-12  
**Status:** 🟡 ALPHA (Ready for integration)  
**Responsible:** DevOps/Backend Team
