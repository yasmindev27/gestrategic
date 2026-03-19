import { Thermometer } from 'lucide-react';
import { ChecklistSinaisVitais } from './ChecklistSinaisVitais';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

export function ClassificacaoArea() {
  const handleExport = (type: 'pdf' | 'excel') => {
    const options = {
      title: 'Classificação — Sinais Vitais',
      headers: ['Seção', 'Informação'],
      rows: [['Setor', 'Enfermagem'], ['Módulo', 'Sinais Vitais']] as (string | number)[][],
      fileName: 'classificacao_sinais_vitais',
    };
    if (type === 'pdf') exportToPDF(options);
    else exportToExcel(options);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            Sinais Vitais
          </h2>
          <p className="text-sm text-muted-foreground">Registro e monitoramento de sinais vitais dos pacientes</p>
        </div>
        <ExportDropdown
          onExportPDF={() => handleExport('pdf')}
          onExportExcel={() => handleExport('excel')}
        />
      </div>

      <ChecklistSinaisVitais storageKey="enf-sinais-vitais-classificacao" setor="Enfermagem" />
    </div>
  );
}
