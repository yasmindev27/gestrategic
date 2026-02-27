import { useState, useEffect, useCallback, useRef } from 'react';
import { Ambulance, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { differenceInDays, differenceInHours, parseISO } from 'date-fns';
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
import { ExportDropdown } from '@/components/ui/export-dropdown';
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
  const isLoading = isShiftLoading || isBedsLoading;

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

  const getExportData = useCallback(() => {
    return beds
      .filter(b => typeof b.number === 'number' && b.patient !== null)
      .sort((a, b) => {
        const sectorOrder = SECTORS.findIndex(s => s.id === a.sector) - SECTORS.findIndex(s => s.id === b.sector);
        if (sectorOrder !== 0) return sectorOrder;
        return (a.number as number) - (b.number as number);
      })
      .map(bed => {
        const sectorName = SECTORS.find(s => s.id === bed.sector)?.name || bed.sector;
        let permanencia = '-';
        const timestamp = bed.patient?.registradoEm;
        if (timestamp) {
          try {
            const dataReg = parseISO(timestamp);
            const now = new Date();
            const dias = differenceInDays(now, dataReg);
            const horas = differenceInHours(now, dataReg) % 24;
            permanencia = dias > 0 ? `${dias}d ${horas}h` : `${horas}h`;
          } catch { /* ignore */ }
        }
        return {
          setor: sectorName,
          leito: `Leito ${bed.number}`,
          paciente: bed.patient?.nome || '-',
          hipotese: bed.patient?.hipoteseDiagnostica || '-',
          conduta: bed.patient?.condutasOutros || '-',
          observacao: bed.patient?.observacao || '-',
          dataInternacao: bed.patient?.dataInternacao || '-',
          permanencia,
          susFacil: bed.patient?.susFacil || '-',
        };
      });
  }, [beds]);

  const handleExportCSV = useCallback(() => {
    const data = getExportData();
    const meta = [
      `Data;${shiftInfo.data}`,
      `Plantão;${shiftInfo.tipo === 'noturno' ? 'Noturno' : 'Diurno'}`,
      `Regulador NIR;${shiftInfo.reguladorNIR || '-'}`,
      `Médicos;${shiftInfo.medicos || '-'}`,
      `Enfermeiros;${shiftInfo.enfermeiros || '-'}`,
      `Ocupação;${totalOccupancy.occupied}/${totalOccupancy.total}`,
      '',
    ];
    const headers = ['Setor', 'Leito', 'Paciente', 'Hipótese', 'Conduta', 'Observações', 'Internação', 'Permanência', 'SUS Fácil'];
    const csvContent = [
      ...meta,
      headers.join(';'),
      ...data.map(row => [row.setor, row.leito, row.paciente, row.hipotese, row.conduta, row.observacao, row.dataInternacao, row.permanencia, row.susFacil].join(';'))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapa-leitos-${shiftInfo.data}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getExportData, shiftInfo, totalOccupancy]);

  const handleExportPDF = useCallback(() => {
    const data = getExportData();
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Mapa de Leitos', 14, 15);
    doc.setFontSize(9);
    doc.text(`Data: ${shiftInfo.data} | Plantão: ${shiftInfo.tipo === 'noturno' ? 'Noturno' : 'Diurno'} | Regulador NIR: ${shiftInfo.reguladorNIR || '-'}`, 14, 22);
    doc.text(`Médicos: ${shiftInfo.medicos || '-'}`, 14, 28);
    doc.text(`Enfermeiros: ${shiftInfo.enfermeiros || '-'}`, 14, 34);
    doc.text(`Ocupação: ${totalOccupancy.occupied}/${totalOccupancy.total}`, 14, 40);

    autoTable(doc, {
      startY: 45,
      head: [['Setor', 'Leito', 'Paciente', 'Hipótese', 'Conduta', 'Obs.', 'Internação', 'Perm.', 'SUS']],
      body: data.map(r => [r.setor, r.leito, r.paciente, r.hipotese, r.conduta, r.observacao, r.dataInternacao, r.permanencia, r.susFacil]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.setFontSize(7);
    doc.text('Documento confidencial - LGPD. Uso restrito à equipe assistencial.', 14, doc.internal.pageSize.height - 10);

    doc.save(`mapa-leitos-${shiftInfo.data}.pdf`);
  }, [getExportData, shiftInfo, totalOccupancy]);

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
          <ExportDropdown onExportPDF={handleExportPDF} onExportCSV={handleExportCSV} />
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
