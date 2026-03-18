import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bed, Patient, Sector, SECTORS } from '@/types/bed';

const initializeBeds = (): Bed[] => {
  const beds: Bed[] = [];

  SECTORS.forEach((sector) => {
    sector.beds.forEach((bedNumber) => {
      beds.push({
        id: `${sector.id}-${bedNumber}`,
        number: bedNumber,
        sector: sector.id,
        patient: null,
      });
    });

    if (sector.extraBeds) {
      sector.extraBeds.forEach((extraName) => {
        beds.push({
          id: `${sector.id}-${extraName.toLowerCase().replace(/\s+/g, '-')}`,
          number: extraName,
          sector: sector.id,
          patient: null,
        });
      });
    }
  });

  return beds;
};

export function useBeds(shiftDate?: string, shiftType?: 'diurno' | 'noturno') {
  const [beds, setBeds] = useState<Bed[]>(initializeBeds);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const dateToLoad = shiftDate || new Date().toISOString().split('T')[0];
    const typeToLoad = shiftType || (new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'diurno' : 'noturno');
    const loadKey = `${dateToLoad}|${typeToLoad}`;
    
    if (loadedKeyRef.current === loadKey && !isLoading) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    const loadBedsFromDatabase = async () => {
      setIsLoading(true);
      
      try {
        const { data: bedRecords, error } = await supabase
          .from('bed_records')
          .select('bed_id, patient_name, hipotese_diagnostica, condutas_outros, observacao, data_nascimento, data_internacao, sus_facil, numero_sus_facil, motivo_alta, estabelecimento_transferencia, created_at, cti')
          .eq('shift_date', dateToLoad)
          .eq('shift_type', typeToLoad);

        if (error) {
          console.error('Error loading bed records:', error);
          setIsLoading(false);
          return;
        }

        const initialBeds = initializeBeds();

        // Helper to populate beds from records
        const populateBedsFromRecords = (records: typeof bedRecords) => {
          if (!records || records.length === 0) return;
          const recordsMap = new Map(records.map(r => [r.bed_id, r]));
          
          initialBeds.forEach((bed, index) => {
            const record = recordsMap.get(bed.id);
            if (record && record.patient_name && !record.motivo_alta) {
              initialBeds[index].patient = {
                nome: record.patient_name,
                hipoteseDiagnostica: record.hipotese_diagnostica || '',
                condutasOutros: record.condutas_outros || '',
                observacao: record.observacao || '',
                dataNascimento: record.data_nascimento || '',
                dataInternacao: record.data_internacao || '',
                susFacil: (record.sus_facil as 'sim' | 'nao' | '') || '',
                numeroSusFacil: record.numero_sus_facil || '',
                cti: ((record as any).cti as 'sim' | 'nao' | '') || '',
                motivoAlta: (record.motivo_alta as Patient['motivoAlta']) || '',
                estabelecimentoTransferencia: record.estabelecimento_transferencia || '',
                registradoEm: record.created_at || '',
              };
            }
          });
        };

        if (bedRecords && bedRecords.length > 0) {
          populateBedsFromRecords(bedRecords);
        } else {
          // No records for this shift — carry over from previous shift
          let prevDate: string;
          let prevType: 'diurno' | 'noturno';

          if (typeToLoad === 'diurno') {
            // Previous shift is noturno of the previous day
            const d = new Date(dateToLoad + 'T12:00:00');
            d.setDate(d.getDate() - 1);
            prevDate = d.toISOString().split('T')[0];
            prevType = 'noturno';
          } else {
            // Previous shift is diurno of the same day
            prevDate = dateToLoad;
            prevType = 'diurno';
          }

          const { data: prevRecords, error: prevError } = await supabase
            .from('bed_records')
            .select('bed_id, patient_name, hipotese_diagnostica, condutas_outros, observacao, data_nascimento, data_internacao, sus_facil, numero_sus_facil, motivo_alta, estabelecimento_transferencia, created_at, cti')
            .eq('shift_date', prevDate)
            .eq('shift_type', prevType);

          if (!prevError && prevRecords && prevRecords.length > 0) {
            populateBedsFromRecords(prevRecords);
            console.log(`Migrated ${initialBeds.filter(b => b.patient).length} patients from ${prevType} ${prevDate} to ${typeToLoad} ${dateToLoad}`);
          }
        }

        loadedKeyRef.current = loadKey;
        setBeds(initialBeds);
      } catch (err) {
        console.error('Error in loadBedsFromDatabase:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBedsFromDatabase();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [shiftDate, shiftType]);

  const updateBed = useCallback((bedId: string, patient: Patient | null) => {
    setBeds((prev) =>
      prev.map((bed) => (bed.id === bedId ? { ...bed, patient } : bed))
    );
  }, []);

  const transferPatient = useCallback((fromBedId: string, toBedId: string) => {
    setBeds((prev) => {
      const fromBed = prev.find((b) => b.id === fromBedId);
      if (!fromBed?.patient) return prev;

      return prev.map((bed) => {
        if (bed.id === fromBedId) return { ...bed, patient: null };
        if (bed.id === toBedId) return { ...bed, patient: fromBed.patient };
        return bed;
      });
    });
  }, []);

  const occupancyBySector = useMemo(() => {
    const result: Record<Sector, { occupied: number; total: number }> = {} as Record<Sector, { occupied: number; total: number }>;
    
    SECTORS.forEach((sector) => {
      const regularBeds = beds.filter((bed) => bed.sector === sector.id && typeof bed.number === 'number');
      const extraOccupied = beds.filter((bed) => bed.sector === sector.id && typeof bed.number === 'string' && bed.patient !== null).length;
      result[sector.id] = {
        occupied: regularBeds.filter((bed) => bed.patient !== null).length + extraOccupied,
        total: regularBeds.length,
      };
    });

    return result;
  }, [beds]);

  const totalOccupancy = useMemo(() => {
    const regularBeds = beds.filter((bed) => typeof bed.number === 'number');
    const extraOccupied = beds.filter((bed) => typeof bed.number === 'string' && bed.patient !== null).length;
    return {
      occupied: regularBeds.filter((bed) => bed.patient !== null).length + extraOccupied,
      total: regularBeds.length,
    };
  }, [beds]);

  return {
    beds,
    isLoading,
    updateBed,
    transferPatient,
    occupancyBySector,
    totalOccupancy,
  };
}
