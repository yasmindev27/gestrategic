import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bed, ShiftInfo } from '@/types/bed';

export function useBedRecords() {
  const pendingSavesRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const saveBedRecord = useCallback(async (bed: Bed, shiftInfo: ShiftInfo, dataAlta?: string, immediate?: boolean) => {
    const existingTimeout = pendingSavesRef.current.get(bed.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const doSave = async () => {
      pendingSavesRef.current.delete(bed.id);
      
      if (!bed.patient) {
        // Only delete records that are NOT discharged (no data_alta)
        await supabase.from('bed_records').delete()
          .eq('bed_id', bed.id)
          .eq('shift_date', shiftInfo.data)
          .eq('shift_type', shiftInfo.tipo)
          .is('data_alta', null);
        return;
      }

      const { error } = await supabase.from('bed_records').upsert({
        bed_id: bed.id,
        bed_number: String(bed.number),
        sector: bed.sector,
        patient_name: bed.patient.nome,
        hipotese_diagnostica: bed.patient.hipoteseDiagnostica,
        condutas_outros: bed.patient.condutasOutros,
        observacao: bed.patient.observacao,
        data_nascimento: bed.patient.dataNascimento || null,
        data_internacao: bed.patient.dataInternacao || null,
        sus_facil: bed.patient.susFacil,
        numero_sus_facil: bed.patient.numeroSusFacil,
        cti: bed.patient.cti || null,
        motivo_alta: bed.patient.motivoAlta,
        estabelecimento_transferencia: bed.patient.estabelecimentoTransferencia,
        shift_type: shiftInfo.tipo,
        shift_date: shiftInfo.data,
        medicos: shiftInfo.medicos,
        enfermeiros: shiftInfo.enfermeiros,
        regulador_nir: shiftInfo.reguladorNIR,
        data_alta: dataAlta || bed.patient.dataAlta || null,
      }, {
        onConflict: 'bed_id,shift_date,shift_type'
      });

      if (error) {
        console.error('Error saving bed record:', error);
      }
    };

    // Discharge saves must be immediate (no debounce) to prevent race conditions
    if (immediate) {
      await doSave();
      return;
    }

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(async () => {
        await doSave();
        resolve();
      }, 300);
      
      pendingSavesRef.current.set(bed.id, timeout);
    });
  }, []);

  const updateDailyStatistics = useCallback(async (
    date: string, 
    totalPatients: number, 
    patientsBySector: Record<string, number>
  ) => {
    const { error } = await supabase.from('daily_statistics').upsert({
      date,
      total_patients: totalPatients,
      patients_by_sector: patientsBySector,
    }, {
      onConflict: 'date'
    });

    if (error) {
    } catch (error) {
      // Daily statistics update errored - silent fail
    }
  }, []);

  return {
    saveBedRecord,
    updateDailyStatistics,
  };
}
