import React, { useState, useEffect } from 'react';
import { DashboardBIHospitalar } from '@/components/bi/DashboardBIHospitalar';
import { DashboardConformidade } from '@/components/qualidade/DashboardConformidade';
import { DashboardFaturamento } from '@/components/faturamento/DashboardFaturamento';
import { DashboardIAIncidentes } from '@/components/gestao-incidentes/DashboardIAIncidentes';
import { AlertTriangle, ChevronRight, Clock, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Dashboard {
  id: string;
  nome: string;
  descricao: string;
  componente: React.ReactNode;
}

const AUTO_SCROLL_DELAY = 45000; // 45 segundos por dashboard

export const ModoTV: React.FC = () => {
  const [paginaAtiva, setPaginaAtiva] = useState(0);
  const [tempoRestante, setTempoRestante] = useState(45);
  const [emPausa, setEmPausa] = useState(false);
  const [atualizarTimestamp, setAtualizarTimestamp] = useState(new Date());

  const dashboards: Dashboard[] = [
    {
      id: 'bi',
      nome: 'Business Intelligence',
      descricao: 'Operacional, Financeiro, Qualidade e RH',
      componente: <DashboardBIHospitalar periodoMeses={3} />,
    },
    {
      id: 'conformidade',
      nome: 'Conformidade',
      descricao: 'Protocolos, Auditorias e Qualidade',
      componente: <DashboardConformidade />,
    },
    {
      id: 'faturamento',
      nome: 'Faturamento',
      descricao: 'Receitas, Custos e Resultado',
      componente: <DashboardFaturamento />,
    },
    {
      id: 'incidentes',
      nome: 'Incidentes',
      descricao: 'Monitoramento e Análise',
      componente: <DashboardIAIncidentes />,
    },
  ];

  const dashboard_atual = dashboards[paginaAtiva];

  // Auto-scroll entre painéis
  useEffect(() => {
    if (emPausa) return;

    const interval = setInterval(() => {
      setPaginaAtiva((prev) => (prev + 1) % dashboards.length);
      setTempoRestante(45);
      setAtualizarTimestamp(new Date());
    }, AUTO_SCROLL_DELAY);

    return () => clearInterval(interval);
  }, [emPausa, dashboards.length]);

  // Countdown timer
  useEffect(() => {
    if (emPausa) return;

    const interval = setInterval(() => {
      setTempoRestante((prev) => (prev > 1 ? prev - 1 : 45));
    }, 1000);

    return () => clearInterval(interval);
  }, [emPausa]);

  const proximoDashboard = () => {
    setPaginaAtiva((prev) => (prev + 1) % dashboards.length);
    setTempoRestante(45);
  };

  const dashboardAnterior = () => {
    setPaginaAtiva((prev) => (prev - 1 + dashboards.length) % dashboards.length);
    setTempoRestante(45);
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-black/70 backdrop-blur-md border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            <div>
              <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-400">
                AO VIVO
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {format(new Date(atualizarTimestamp), 'HH:mm:ss', { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Info */}
        <div className="text-center flex-1">
          <h2 className="text-3xl font-black text-white tracking-tight">
            {dashboard_atual.nome}
          </h2>
          <p className="text-sm text-slate-300 mt-1">{dashboard_atual.descricao}</p>
        </div>

        {/* Controles Direita */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-600">
            <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="text-white font-mono font-bold text-lg">{tempoRestante}s</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={dashboardAnterior}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white font-semibold"
          >
            ←
          </Button>

          <Button
            size="sm"
            onClick={() => setEmPausa(!emPausa)}
            className={
              emPausa
                ? 'bg-red-600 hover:bg-red-700 text-white font-semibold'
                : 'bg-blue-600 hover:bg-blue-700 text-white font-semibold'
            }
          >
            {emPausa ? '▶' : '⏸'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={proximoDashboard}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white font-semibold"
          >
            →
          </Button>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="h-1.5 bg-slate-700">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-1000 shadow-glow"
          style={{
            width: `${((45 - tempoRestante) / 45) * 100}%`,
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)',
          }}
        />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-auto p-6 bg-gradient-to-b from-slate-800/20 to-slate-900/50">
        <div key={atualizarTimestamp.getTime()} className="h-full animate-fadeIn">
          {dashboard_atual.componente}
        </div>
      </div>

      {/* Footer com navegação */}
      <div className="bg-black/70 backdrop-blur-md border-t border-slate-700 px-6 py-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {dashboards.map((d, idx) => (
              <button
                key={d.id}
                onClick={() => {
                  setPaginaAtiva(idx);
                  setTempoRestante(45);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${
                  paginaAtiva === idx
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-105'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {d.nome}
                {paginaAtiva === idx && <ChevronRight className="w-3 h-3" />}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Badge 
              className="bg-gradient-to-r from-slate-700 to-slate-600 text-slate-100 border-0 font-mono"
            >
              {paginaAtiva + 1}/{dashboards.length}
            </Badge>
            <Volume2 className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0.8;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in;
        }
      `}</style>
    </div>
  );
};

export default ModoTV;
