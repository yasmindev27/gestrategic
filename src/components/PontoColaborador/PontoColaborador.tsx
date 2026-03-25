import React, { useState, useEffect } from 'react';
import RegistroPontoForm from './RegistroPontoForm';
import ListaRegistrosPonto from './ListaRegistrosPonto';
import SaldoMensal from './SaldoMensal';
import PontoHoje from './PontoHoje';
import { RegistroPonto } from '@/types/ponto';
import { getRegistrosPonto, salvarRegistroPonto } from '@/utils/pontoStorage';

const PontoColaborador: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);

  useEffect(() => {
    setRegistros(getRegistrosPonto());
  }, []);

  const handleRegistrarPonto = (tipo: string) => {
    const novoRegistro: RegistroPonto = {
      data: new Date().toLocaleDateString(),
      tipo,
      horario: new Date().toLocaleTimeString(),
      localizacao: 'Simulado',
      status: tipo === 'Retorno Almoço' ? 'Pendente' : 'Aprovado',
    };
    salvarRegistroPonto(novoRegistro);
    setRegistros(getRegistrosPonto());
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Sistema de Ponto</h2>
      <div style={{ display: 'flex', gap: 24 }}>
        <div>
          <PontoHoje />
          <SaldoMensal />
        </div>
        <div>
          <RegistroPontoForm onRegistrar={handleRegistrarPonto} />
        </div>
      </div>
      <ListaRegistrosPonto registros={registros} />
    </div>
  );
};

export default PontoColaborador;
