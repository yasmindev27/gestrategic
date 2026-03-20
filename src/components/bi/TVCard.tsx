import React from 'react';

export const TVCard: React.FC<{ titulo: string; valor: string; sub: string; corSub?: string }> = ({ 
  titulo, 
  valor, 
  sub, 
  corSub = 'text-slate-400' 
}) => (
  <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-between min-h-[160px]">
    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{titulo}</p>
    <p className="text-5xl font-black text-white mt-2 tabular-nums tracking-tight">{valor}</p>
    <p className={`text-sm font-medium mt-1 ${corSub}`}>{sub}</p>
  </div>
);
