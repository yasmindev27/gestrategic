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

export function useBeds(shiftDate?: string) {
  const [beds, setBeds] = useState<Bed[]>(initializeBeds);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedDateRef = useRef<string | null>(null);

  useEffect(() => {
    const dateToLoad = shiftDate || new Date().toISOString().split('T')[0];
    
    if (loadedDateRef.current === dateToLoad && !isLoading) {
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
          .select('bed_id, patient_name, hipotese_diagnostica, condutas_outros, observacao, data_nascimento, data_internacao, sus_facil, numero_sus_facil, motivo_alta, estabelecimento_transferencia, created_at')
          .eq('shift_date', dateToLoad);

        if (error) {
          console.error('Error loading bed records:', error);
          setIsLoading(false);
          return;
        }

        const initialBeds = initializeBeds();

        if (bedRecords && bedRecords.length > 0) {
          const recordsMap = new Map(bedRecords.map(r => [r.bed_id, r]));
          
          initialBeds.forEach((bed, index) => {
            const record = recordsMap.get(bed.id);
            if (record && record.patient_name) {
              initialBeds[index].patient = {
                nome: record.patient_name,
                hipoteseDiagnostica: record.hipotese_diagnostica || '',
                condutasOutros: record.condutas_outros || '',
                observacao: record.observacao || '',
                dataNascimento: record.data_nascimento || '',
                dataInternacao: record.data_internacao || '',
                susFacil: (record.sus_facil as 'sim' | 'nao' | '') || '',
                numeroSusFacil: record.numero_sus_facil || '',
                motivoAlta: (record.motivo_alta as Patient['motivoAlta']) || '',
                estabelecimentoTransferencia: record.estabelecimento_transferencia || '',
                registradoEm: record.created_at || '',
              };
            }
          });
        }

        loadedDateRef.current = dateToLoad;
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
  }, [shiftDate]);

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
      const sectorBeds = beds.filter((bed) => bed.sector === sector.id && typeof bed.number === 'number');
      result[sector.id] = {
        occupied: sectorBeds.filter((bed) => bed.patient !== null).length,
        total: sectorBeds.length,
      };
    });

    return result;
  }, [beds]);

  const totalOccupancy = useMemo(() => {
    const countableBeds = beds.filter((bed) => typeof bed.number === 'number');
    return {
      occupied: countableBeds.filter((bed) => bed.patient !== null).length,
      total: countableBeds.length,
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
