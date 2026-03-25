import React from 'react';
import { RegistroPonto } from '../../types/ponto';

interface Props {
  registros: RegistroPonto[];
  onAprovar: (idx: number) => void;
  onRejeitar: (idx: number) => void;
}

const ListaRegistrosRH: React.FC<Props> = ({ registros, onAprovar, onRejeitar }) => {
  return (
    <div>
      <h3>Todos os Registros de Ponto</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Horário</th>
            <th>Localização</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((r, idx) => (
            <tr key={idx}>
              <td>{r.data}</td>
              <td>{r.tipo}</td>
              <td>{r.horario}</td>
              <td>{r.localizacao}</td>
              <td>
                <span style={{ color: r.status === 'Aprovado' ? 'green' : 'orange' }}>{r.status}</span>
              </td>
              <td>
                {r.status === 'Pendente' && (
                  <>
                    <button onClick={() => onAprovar(idx)}>Aprovar</button>{' '}
                    <button onClick={() => onRejeitar(idx)}>Rejeitar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ListaRegistrosRH;
