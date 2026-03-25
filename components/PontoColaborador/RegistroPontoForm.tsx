import React from 'react';

interface Props {
  onRegistrar: (tipo: string) => void;
}

const RegistroPontoForm: React.FC<Props> = ({ onRegistrar }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => onRegistrar('Entrada')}>Registrar Entrada</button>{' '}
      <button onClick={() => onRegistrar('Saída Almoço')}>Saída Almoço</button>{' '}
      <button onClick={() => onRegistrar('Retorno Almoço')}>Retorno Almoço</button>{' '}
      <button onClick={() => onRegistrar('Saída Fim')}>Saída Fim</button>
    </div>
  );
};

export default RegistroPontoForm;
