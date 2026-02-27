import { Card, CardContent } from '@/components/ui/card';
import { TipoProtocolo } from '@/hooks/useProtocoloAtendimentos';
import { Heart, Clock, Activity, BarChart3, FileText, TrendingUp, ClipboardPlus, Download } from 'lucide-react';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import {
  exportDorToracicaPDF, exportDorToracicaWord,
  exportSepseAdultoPDF, exportSepseAdultoWord,
  exportSepsePediatricoPDF, exportSepsePediatricoWord,
} from './exportProtocolosBranco';

interface Props {
  tipo: TipoProtocolo;
  titulo: string;
  onNovo: () => void;
  onRelatorios?: () => void;
  onConsolidado?: () => void;
}

const protocoloConfig: Record<string, {
  heroTitle: string;
  heroSubtitle: string;
  badges: { icon: React.ReactNode; value: string; label: string }[];
  aboutTitle: string;
  aboutText: string;
}> = {
  dor_toracica: {
    heroTitle: 'Protocolo Dor Torácica',
    heroSubtitle: 'Sistema de Monitoramento UPA',
    badges: [
      { icon: <Clock className="h-5 w-5" />, value: '≤ 10 min', label: 'Meta Protocolo' },
      { icon: <Activity className="h-5 w-5" />, value: 'ECG', label: 'Eletrocardiograma' },
      { icon: <TrendingUp className="h-5 w-5" />, value: 'KPI', label: 'Indicadores' },
    ],
    aboutTitle: 'Sobre o Protocolo Dor Torácica',
    aboutText: 'O tempo Porta-ECG é o intervalo entre a chegada do paciente com queixa de dor torácica e a realização do eletrocardiograma (ECG). A meta estabelecida é de até 10 minutos, visando a identificação precoce de Síndrome Coronariana Aguda (SCA) e início rápido do tratamento adequado. Este sistema permite o registro, monitoramento e análise deste indicador de qualidade assistencial.',
  },
  sepse_adulto: {
    heroTitle: 'Protocolo de Sepse Adulto',
    heroSubtitle: 'Monitoramento e Gestão de Protocolos',
    badges: [
      { icon: <Clock className="h-5 w-5" />, value: '≤ 1h', label: 'Meta ATB' },
      { icon: <Activity className="h-5 w-5" />, value: 'Sepse', label: 'Protocolo Adulto' },
      { icon: <TrendingUp className="h-5 w-5" />, value: 'KPI', label: 'Indicadores' },
    ],
    aboutTitle: 'Sobre o Protocolo de Sepse Adulto',
    aboutText: 'O Protocolo de Sepse Adulto é um conjunto de diretrizes para identificação e tratamento precoce de sepse em pacientes adultos. A meta é o início rápido de antibioticoterapia e medidas de suporte, visando a redução da mortalidade e melhora dos desfechos clínicos. Este sistema permite o registro, monitoramento e análise dos indicadores de qualidade assistencial.',
  },
  sepse_pediatrico: {
    heroTitle: 'Protocolo de Sepse Pediátrico',
    heroSubtitle: 'Monitoramento e Gestão de Protocolos',
    badges: [
      { icon: <Clock className="h-5 w-5" />, value: '≤ 1h', label: 'Meta ATB' },
      { icon: <Activity className="h-5 w-5" />, value: 'Sepse', label: 'Protocolo Pediátrico' },
      { icon: <TrendingUp className="h-5 w-5" />, value: 'KPI', label: 'Indicadores' },
    ],
    aboutTitle: 'Sobre o Protocolo de Sepse Pediátrico',
    aboutText: 'O Protocolo de Sepse Pediátrico é um conjunto de diretrizes para identificação e tratamento precoce de sepse em pacientes pediátricos. A meta é o início rápido de antibioticoterapia e medidas de suporte, visando a redução da mortalidade e melhora dos desfechos clínicos. Este sistema permite o registro, monitoramento e análise dos indicadores de qualidade assistencial.',
  },
};

const actionCards = [
  {
    key: 'cadastrar',
    icon: <ClipboardPlus className="h-6 w-6" />,
    title: 'Cadastrar Atendimento',
    description: 'Registre novos atendimentos de pacientes e calcule os indicadores do protocolo.',
    iconBg: 'bg-primary/10 text-primary',
  },
  {
    key: 'relatorios',
    icon: <FileText className="h-6 w-6" />,
    title: 'Relatórios',
    description: 'Visualize e exporte relatórios individuais de cada atendimento.',
    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    key: 'consolidado',
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Consolidado Mensal',
    description: 'Analise indicadores mensais, gráficos e exporte relatórios consolidados.',
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  },
];

export const ProtocolosList = ({ tipo, titulo, onNovo, onRelatorios, onConsolidado }: Props) => {
  const config = protocoloConfig[tipo];

  const handleCardClick = (key: string) => {
    switch (key) {
      case 'cadastrar': onNovo(); break;
      case 'relatorios': onRelatorios?.(); break;
      case 'consolidado': onConsolidado?.(); break;
    }
  };

  const exportPDF = () => {
    if (tipo === 'dor_toracica') exportDorToracicaPDF();
    else if (tipo === 'sepse_adulto') exportSepseAdultoPDF();
    else exportSepsePediatricoPDF();
  };

  const exportWord = () => {
    if (tipo === 'dor_toracica') exportDorToracicaWord();
    else if (tipo === 'sepse_adulto') exportSepseAdultoWord();
    else exportSepsePediatricoWord();
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center gap-6 border-b pb-3">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">{titulo}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">UPA</span>
        </div>
        <div className="flex items-center gap-4 ml-auto text-sm">
          <button onClick={onNovo} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ClipboardPlus className="h-4 w-4" /> Cadastrar Atendimento
          </button>
          <button onClick={() => onRelatorios?.()} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="h-4 w-4" /> Relatórios
          </button>
          <button onClick={() => onConsolidado?.()} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <BarChart3 className="h-4 w-4" /> Consolidado Mensal
          </button>
          <ExportDropdown
            onExportPDF={exportPDF}
            onExportWord={exportWord}
            label="Formulário em Branco"
            size="sm"
            variant="outline"
          />
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[hsl(210,70%,20%)] to-[hsl(210,60%,45%)] p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{config.heroTitle}</h1>
            <p className="text-sm text-white/70">{config.heroSubtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {config.badges.map((badge, i) => (
            <div
              key={i}
              className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
                i === 0 
                  ? 'bg-white/20' 
                  : 'bg-white/10'
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                {badge.icon}
              </div>
              <div>
                <p className="font-bold text-sm">{badge.value}</p>
                <p className="text-xs text-white/70">{badge.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actionCards.map((card) => (
          <Card
            key={card.key}
            className="cursor-pointer hover:shadow-md transition-shadow group border"
            onClick={() => handleCardClick(card.key)}
          >
            <CardContent className="p-6 space-y-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
              <h3 className="font-semibold text-foreground">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              <span className="text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Acessar →
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* About Section */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-foreground mb-3">{config.aboutTitle}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{config.aboutText}</p>
        </CardContent>
      </Card>
    </div>
  );
};
