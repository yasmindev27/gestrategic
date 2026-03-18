-- Drop the old unique constraint that doesn't include shift_type
ALTER TABLE public.bed_records DROP CONSTRAINT bed_records_bed_id_shift_date_key;

-- Create the correct unique constraint including shift_type
ALTER TABLE public.bed_records ADD CONSTRAINT bed_records_bed_id_shift_date_shift_type_key UNIQUE (bed_id, shift_date, shift_type);