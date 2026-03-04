-- Fix stale noturno records: propagate alta from diurno to noturno for same patient
UPDATE bed_records n
SET motivo_alta = d.motivo_alta, data_alta = d.data_alta
FROM bed_records d
WHERE d.bed_id = n.bed_id
  AND d.shift_date = n.shift_date
  AND d.shift_type = 'diurno'
  AND n.shift_type = 'noturno'
  AND n.shift_date = '2026-03-04'
  AND d.motivo_alta IS NOT NULL AND d.motivo_alta != ''
  AND (n.motivo_alta IS NULL OR n.motivo_alta = '')
  AND TRIM(d.patient_name) = TRIM(n.patient_name);