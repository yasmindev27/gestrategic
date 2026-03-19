import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Siren, ShieldAlert, ClipboardList, Shirt, Shield, SprayCanIcon, Gauge, ClipboardPen, Ambulance, Activity, Stethoscope, FileText, ShieldCheck, Pill, HeartPulse, Thermometer
} from 'lucide-react';
import { ChecklistCarrinhoUrgencia } from './ChecklistCarrinhoUrgencia';
import { ChecklistSinaisVitais } from './ChecklistSinaisVitais';
import { ChecklistSetorUrgencia } from './ChecklistSetorUrgencia';
import { ProtocoloEvasaoRouparia } from './ProtocoloEvasaoRouparia';
import { ChecklistGeralNSP } from './ChecklistGeralNSP';
import { ChecklistLimpezaConcorrente } from './ChecklistLimpezaConcorrente';
import { ChecklistFluxometrosBombas } from './ChecklistFluxometrosBombas';
import { PassagemPlantaoTecEnfermagem } from './PassagemPlantaoTecEnfermagem';
import { ChecklistUTIMovel } from './ChecklistUTIMovel';
import { ControleSinaisVitaisOxigenio } from './ControleSinaisVitaisOxigenio';
import { EscalasClinicas } from './EscalasClinicas';
import { PassagemPlantaoSBAR } from './PassagemPlantaoSBAR';
import { DiagnosticoPrescricaoEnfermagem } from './DiagnosticoPrescricaoEnfermagem';
import { TermoConsentimentoRiscos } from './TermoConsentimentoRiscos';
import { SAEAdulto } from './SAEAdulto';
import { SAEPediatrico } from './SAEPediatrico';
import { TermoGuardaMedicamento } from './TermoGuardaMedicamento';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToCSV, exportToExcel } from '@/lib/export-utils';
import { cn } from '@/lib/utils';

const SUB_NAV_ITEMS = [
  { id: 'checklist-setor', label: 'Checklist Setor', icon: ClipboardList },
  { id: 'carrinho', label: 'Carrinho de Urgência', icon: ShieldAlert },
  { id: 'sinais-vitais', label: 'Sinais Vitais', icon: Thermometer },
  { id: 'evasao-rouparia', label: 'Evasão Rouparia', icon: Shirt },
  { id: 'nsp', label: 'NSP', icon: Shield },
  { id: 'limpeza', label: 'Limpeza Concorrente', icon: SprayCanIcon },
  { id: 'fluxometros', label: 'Fluxômetros/Bombas', icon: Gauge },
  { id: 'passagem-plantao', label: 'Passagem Plantão', icon: ClipboardPen },
  { id: 'uti-movel', label: 'UTI Móvel', icon: Ambulance },
  { id: 'sv-oxigenio', label: 'SV/Oxigenioterapia', icon: Activity },
  { id: 'escalas', label: 'Escalas Clínicas', icon: Stethoscope },
  { id: 'sbar', label: 'SBAR Enfermeiros', icon: FileText },
  { id: 'prescricao', label: 'Prescrição Enf.', icon: ClipboardList },
  { id: 'termo', label: 'Termo Riscos', icon: ShieldCheck },
  { id: 'sae', label: 'SAE Adulto', icon: HeartPulse },
  { id: 'sae-ped', label: 'SAE Pediátrico', icon: HeartPulse },
  { id: 'guarda-med', label: 'Guarda Medicamento', icon: Pill },
];

export function UrgenciaArea() {
  const [activeTab, setActiveTab] = useState('checklist-setor');

  const handleExport = (type: 'pdf' | 'excel') => {
    const exportOptions = {
      title: `Urgência — ${SUB_NAV_ITEMS.find(i => i.id === activeTab)?.label || 'Relatório'}`,
      headers: ['Seção', 'Informação'],
      rows: [['Setor', 'Urgência'], ['Aba Ativa', SUB_NAV_ITEMS.find(i => i.id === activeTab)?.label || activeTab]] as (string | number)[][],
      fileName: `urgencia_${activeTab}`,
    };
    if (type === 'pdf') exportToPDF(exportOptions);
    else exportToExcel(exportOptions);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'checklist-setor':
        return <ChecklistSetorUrgencia />;
      case 'carrinho':
        return <ChecklistCarrinhoUrgencia />;
      case 'sinais-vitais':
        return <ChecklistSinaisVitais storageKey="enf-sinais-vitais-urgencia" setor="Urgência" />;
      case 'evasao-rouparia':
        return <ProtocoloEvasaoRouparia storageKey="enf-evasao-rouparia-urgencia" setor="Urgência" />;
      case 'nsp':
        return <ChecklistGeralNSP storageKey="enf-nsp-urgencia" setor="Urgência" />;
      case 'limpeza':
        return <ChecklistLimpezaConcorrente storageKey="enf-limpeza-concorrente-urgencia" setor="Urgência" />;
      case 'fluxometros':
        return <ChecklistFluxometrosBombas storageKey="enf-fluxometros-bombas-urgencia" setor="Urgência" />;
      case 'passagem-plantao':
        return <PassagemPlantaoTecEnfermagem storageKey="enf-passagem-plantao-tec-urgencia" setor="Urgência" />;
      case 'uti-movel':
        return <ChecklistUTIMovel storageKey="enf-uti-movel-urgencia" setor="Urgência" />;
      case 'sv-oxigenio':
        return <ControleSinaisVitaisOxigenio storageKey="enf-sv-oxigenio-urgencia" setor="Urgência" />;
      case 'escalas':
        return <EscalasClinicas storageKey="enf-escalas-clinicas-urgencia" setor="Urgência" />;
      case 'sbar':
        return <PassagemPlantaoSBAR storageKey="enf-sbar-urgencia" setor="Urgência" />;
      case 'prescricao':
        return <DiagnosticoPrescricaoEnfermagem storageKey="enf-prescricao-urgencia" setor="Urgência" />;
      case 'termo':
        return <TermoConsentimentoRiscos storageKey="enf-termo-riscos-urgencia" setor="Urgência" />;
      case 'sae':
        return <SAEAdulto storageKey="enf-sae-adulto-urgencia" setor="Urgência" />;
      case 'sae-ped':
        return <SAEPediatrico storageKey="enf-sae-ped-urgencia" setor="Urgência" />;
      case 'guarda-med':
        return <TermoGuardaMedicamento storageKey="enf-guarda-med-urgencia" setor="Urgência" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Siren className="h-5 w-5 text-destructive" />
            Urgência
          </h2>
          <p className="text-sm text-muted-foreground">Ferramentas assistenciais e checklists operacionais da urgência</p>
        </div>
        <ExportDropdown
          onExportPDF={() => handleExport('pdf')}
          onExportExcel={() => handleExport('excel')}
        />
      </div>

      <div className="flex gap-4">
        {/* Vertical sub-navigation */}
        <nav className="w-52 flex-shrink-0 space-y-0.5 border-r pr-3">
          {SUB_NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}