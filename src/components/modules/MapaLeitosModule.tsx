import { useState, useEffect, useCallback, useRef } from 'react';
import { Ambulance, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useUserRole } from '@/hooks/useUserRole';
import { useBeds } from '@/hooks/useBeds';
import { useBedRecords } from '@/hooks/useBedRecords';
import { useShiftConfig } from '@/hooks/useShiftConfig';
import { useLogAccess } from '@/hooks/useLogAccess';
import { useRealtimeSync, REALTIME_PRESETS } from '@/hooks/useRealtimeSync';
import { 
  BedGrid, 
  BedModal, 
  SectorTabs, 
  OccupancySummary, 
  ShiftConfig 
} from '@/components/mapa-leitos';
import { Bed, Patient, Sector, SECTORS } from '@/types/bed';

export const MapaLeitosModule = () => {
  const { isAdmin, isNir, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  useRealtimeSync(REALTIME_PRESETS.mapaLeitos);
  
  const { shiftInfo, isLoading: isShiftLoading, updateShiftInfo, saveShiftConfig } = useShiftConfig();
  
  const [activeSector, setActiveSector] = useState<Sector>('enfermaria-masculina');
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { beds, isLoading: isBedsLoading, updateBed, transferPatient, occupancyBySector, totalOccupancy } = useBeds(shiftInfo.data);
  const { saveBedRecord, updateDailyStatistics } = useBedRecords();
  
  const syncedBedsRef = useRef<Set<string>>(new Set());
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hasAccess = isAdmin || isNir;

  useEffect(() => {
    if (hasAccess && !isLoadingRole) {
      logAction('mapa_leitos', 'acesso', { setor: activeSector });
    }
  }, [hasAccess, isLoadingRole, logAction, activeSector]);

  const syncToDatabase = useCallback(async () => {
    const bedsWithPatients = beds.filter(bed => bed.patient !== null);
    
    const savePromises = bedsWithPatients.map(async (bed) => {
      const bedKey = `${bed.id}-${JSON.stringify(bed.patient)}`;
      if (!syncedBedsRef.current.has(bedKey)) {
        syncedBedsRef.current.add(bedKey);
        await saveBedRecord(bed, shiftInfo);
      }
    });

    await Promise.all(savePromises);

    const patientsBySector: Record<string, number> = {};
    SECTORS.forEach(sector => {
      const sectorBeds = beds.filter(
        bed => bed.sector === sector.id && typeof bed.number === 'number' && bed.patient !== null
      );
      patientsBySector[sector.id] = sectorBeds.length;
    });

    const totalPatients = beds.filter(
      bed => typeof bed.number === 'number' && bed.patient !== null
    ).length;

    await updateDailyStatistics(shiftInfo.data, totalPatients, patientsBySector);
  }, [beds, shiftInfo, saveBedRecord, updateDailyStatistics]);

  useEffect(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncToDatabase();
    }, 1000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [beds, syncToDatabase]);

  const handleBedClick = (bed: Bed) => {
    setSelectedBed(bed);
    setIsModalOpen(true);
  };

  const handleSaveBed = async (bed: Bed, patient: Patient | null, isDischarge?: boolean) => {
    updateBed(bed.id, patient);
    
    syncedBedsRef.current.delete(`${bed.id}-${JSON.stringify(bed.patient)}`);
    
    if (isDischarge && patient?.dataAlta) {
      await saveBedRecord({ ...bed, patient }, shiftInfo, patient.dataAlta);
      updateBed(bed.id, null);
    } else {
      await saveBedRecord({ ...bed, patient }, shiftInfo);
    }

    logAction('mapa_leitos', isDischarge ? 'alta_paciente' : 'atualizar_leito', {
      leito: bed.id,
      paciente: patient?.nome,
    });
  };

  const handleTransfer = async (fromBed: Bed, toBed: Bed) => {
    transferPatient(fromBed.id, toBed.id);
    
    logAction('mapa_leitos', 'transferencia_leito', {
      de: fromBed.id,
      para: toBed.id,
      paciente: fromBed.patient?.nome,
    });
  };

  if (isLoadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <Ambulance className="h-5 w-5" />
            <span>Você não tem permissão para acessar o Mapa de Leitos.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLoading = isShiftLoading || isBedsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ambulance className="h-6 w-6 text-primary" />
            Mapa de Leitos
          </h2>
          <p className="text-muted-foreground">
            Sistema de Gestão de Ocupação Hospitalar - NIR
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
            {shiftInfo.tipo === 'noturno' ? '🌙 Plantão Noturno' : '☀️ Plantão Diurno'}
          </span>
        </div>
      </div>

      <ShiftConfig
        shiftInfo={shiftInfo}
        onShiftInfoChange={updateShiftInfo}
        onSave={saveShiftConfig}
      />

      <OccupancySummary
        occupied={totalOccupancy.occupied}
        total={totalOccupancy.total}
      />

      <SectorTabs
        activeSector={activeSector}
        onSectorChange={setActiveSector}
        occupancyBySector={occupancyBySector}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <BedGrid
          sector={activeSector}
          beds={beds}
          onBedClick={handleBedClick}
        />
      )}

      <BedModal
        bed={selectedBed}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBed}
        sectorBeds={beds.filter(b => b.sector === activeSector)}
        onTransfer={handleTransfer}
      />
    </div>
  );
};
