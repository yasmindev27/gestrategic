-- Data Integrity Monitoring Tables
-- Created for Sprint 1 - Part of data validation system

-- Table: validation_logs
-- Tracks all automated validator executions
CREATE TABLE IF NOT EXISTS validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validator_name VARCHAR(255) NOT NULL,
  passed BOOLEAN NOT NULL,
  issues_count INT DEFAULT 0,
  items_scanned INT DEFAULT 0,
  details JSONB,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT validation_logs_validator_check 
    CHECK (validator_name IN (
      'bed_simultaneous_occupancy',
      'medication_entry_exit_balance',
      'shift_conflicts',
      'patient_multiple_admissions'
    ))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS validation_logs_validator_idx 
  ON validation_logs(validator_name);

CREATE INDEX IF NOT EXISTS validation_logs_executed_at_idx 
  ON validation_logs(executed_at DESC);

CREATE INDEX IF NOT EXISTS validation_logs_passed_idx 
  ON validation_logs(passed);

---

-- Table: integrity_alerts
-- Records data inconsistencies found by validators
CREATE TABLE IF NOT EXISTS integrity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity VARCHAR(20) NOT NULL,
  validator VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  affected_records INT DEFAULT 1,
  details JSONB,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT integrity_alerts_severity_check 
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT integrity_alerts_validator_check 
    CHECK (validator IN (
      'bed_simultaneous_occupancy',
      'medication_entry_exit_balance',
      'shift_conflicts',
      'patient_multiple_admissions'
    ))
);

-- Create indices for efficient querying
CREATE INDEX IF NOT EXISTS integrity_alerts_severity_idx 
  ON integrity_alerts(severity);

CREATE INDEX IF NOT EXISTS integrity_alerts_validator_idx 
  ON integrity_alerts(validator);

CREATE INDEX IF NOT EXISTS integrity_alerts_resolved_idx 
  ON integrity_alerts(resolved_at);

CREATE INDEX IF NOT EXISTS integrity_alerts_created_at_idx 
  ON integrity_alerts(created_at DESC);

-- Find active alerts quickly
CREATE INDEX IF NOT EXISTS integrity_alerts_active_idx 
  ON integrity_alerts(created_at DESC) 
  WHERE resolved_at IS NULL;

---

-- RLS Policies for validation tables

-- Enable RLS
ALTER TABLE validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins and gestore can view validation logs
CREATE POLICY validation_logs_admin_view 
  ON validation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'gestor')
    )
  );

-- Only admins can insert validation logs
CREATE POLICY validation_logs_admin_insert 
  ON validation_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Only admins and gestore can view alerts
CREATE POLICY integrity_alerts_admin_view 
  ON integrity_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'gestor')
    )
  );

-- Only admins can insert alerts
CREATE POLICY integrity_alerts_admin_insert 
  ON integrity_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Only admins and gestore can update/resolve alerts
CREATE POLICY integrity_alerts_admin_update 
  ON integrity_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'gestor')
    )
  );

---

-- Grant permissions to Supabase service role
GRANT SELECT, INSERT ON validation_logs TO postgres;
GRANT SELECT, INSERT ON integrity_alerts TO postgres;
GRANT SELECT, INSERT, UPDATE ON validation_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON integrity_alerts TO authenticated;

---

-- Optional: Stored procedure for SQL-based shift conflict detection
-- (Referenced in useDataValidation hook)

CREATE OR REPLACE FUNCTION check_shift_conflicts()
RETURNS TABLE(
  enfermeiro_nome VARCHAR,
  data DATE,
  turno1_hora_inicio TIME,
  turno1_hora_fim TIME,
  turno2_hora_inicio TIME,
  turno2_hora_fim TIME
) AS $$
BEGIN
  -- Find overlapping shifts for same nurse on same day
  RETURN QUERY
  SELECT  
    u.full_name::VARCHAR,
    es1.data::DATE,
    es1.hora_inicio::TIME,
    es1.hora_fim::TIME,
    es2.hora_inicio::TIME,
    es2.hora_fim::TIME
  FROM enfermagem_escalas es1
  JOIN enfermagem_escalas es2 ON 
    es1.user_id = es2.user_id 
    AND es1.data = es2.data
    AND es1.id != es2.id
    AND (
      -- Check if shifts overlap
      (es1.hora_inicio < es2.hora_fim AND es1.hora_fim > es2.hora_inicio)
    )
  JOIN auth.users u ON u.id = es1.user_id
  WHERE es1.data >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY es1.data DESC, u.full_name;
END;
$$ LANGUAGE plpgsql;
