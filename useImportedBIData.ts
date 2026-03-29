import { useState } from 'react';

export interface BIDadosMes {
  mes: string; // formato: "2026-03"
  ano: number;
  mes_numero: number;
  
  // Operacionais
  ocupacao_leitos: number;
  taxa_mortalidade: number;
  tempo_medio_internacao: number;
  eficiencia_operacional: number;
  
  // Financeiros
  receita_total: number;
  custos_totais: number;
  resultado_operacional: number;
  margem_operacional: number;
  
  // Qualidade
  conformidade_protocolos: number;
  tempo_resposta_chamados: number;
  incidentes_reportados: number;
  satisfacao_paciente: number;
  
  // RH
  total_colaboradores: number;
  absenteismo: number;
  rotatividade: number;
  treinamentos_realizados: number;
  
  createdAt: string;
}

const STORAGE_KEY = 'gestrategic_bi_dados_importados';

export const useImportedBIData = () => {
  const [dados, setDados] = useState<BIDadosMes[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const loading = false;

  // Importar novo mês
  const importarMes = (novoDado: BIDadosMes) => {
    const index = dados.findIndex(d => d.mes === novoDado.mes);
    let novosDados;
    
    if (index >= 0) {
      // Atualizar mês existente
      novosDados = [...dados];
      novosDados[index] = { ...novoDado, createdAt: new Date().toISOString() };
    } else {
      // Adicionar novo mês
      novosDados = [{ ...novoDado, createdAt: new Date().toISOString() }, ...dados];
    }
    
    setDados(novosDados);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novosDados));
    return true;
  };

  // Obter dados do mês
  const obterMes = (mes: string) => {
    return dados.find(d => d.mes === mes);
  };

  // Obter últimos N meses
  const obterUltimosMeses = (n: number = 3) => {
    return dados.slice(0, n).sort((a, b) => new Date(a.mes).getTime() - new Date(b.mes).getTime());
  };

  // Deletar mês
  const deletarMes = (mes: string) => {
    const novosDados = dados.filter(d => d.mes !== mes);
    setDados(novosDados);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novosDados));
  };

  // Limpar todos os dados
  const limparTodos = () => {
    setDados([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    dados,
    loading,
    importarMes,
    obterMes,
    obterUltimosMeses,
    deletarMes,
    limparTodos,
  };
};
