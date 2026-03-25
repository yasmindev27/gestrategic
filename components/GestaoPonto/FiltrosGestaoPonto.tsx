import React from 'react';

interface Props {
  filtroStatus: string;
  setFiltroStatus: (status: string) => void;
}

const FiltrosGestaoPonto: React.FC<Props> = ({ filtroStatus, setFiltroStatus }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <label>Status: </label>
      <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
        <option value="Todos">Todos</option>
        <option value="Aprovado">Aprovado</option>
        <option value="Pendente">Pendente</option>
      </select>
    </div>
  );
};

export default FiltrosGestaoPonto;
