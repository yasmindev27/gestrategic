import React, { useState, useEffect } from 'react';
import { RegistroPonto } from '../../types/ponto';
import { getRegistrosPonto, salvarRegistroPonto } from '../../utils/pontoStorage';
import FiltrosGestaoPonto from './FiltrosGestaoPonto';
import ListaRegistrosRH from './ListaRegistrosRH';

const GestaoPonto: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');

  useEffect(() => {
    setRegistros(getRegistrosPonto());
  }, []);

  const handleAprovar = (idx: number) => {
    const novos = [...registros];
    novos[idx].status = 'Aprovado';
    salvarRegistroPonto(novos[idx]);
    setRegistros(getRegistrosPonto());
  };

  const handleRejeitar = (idx: number) => {
    const novos = [...registros];
    novos[idx].status = 'Pendente'; // Simulação de rejeição
    setRegistros(novos);
  };

  const registrosFiltrados =
    filtroStatus === 'Todos'
      ? registros
      : registros.filter((r) => r.status === filtroStatus);

  return (
    <div style={{ padding: 24 }}>
      <h2>Gestão de Ponto (RH)</h2>
      <FiltrosGestaoPonto filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus} />
      <ListaRegistrosRH registros={registrosFiltrados} onAprovar={handleAprovar} onRejeitar={handleRejeitar} />
    </div>
  );
};

export default GestaoPonto;
