import React from 'react';
import { RegistroPonto } from '../../types/ponto';

interface Props {
  registros: RegistroPonto[];
}

const ListaRegistrosPonto: React.FC<Props> = ({ registros }) => {
  return (
    <div>
      <h3>Registros Recentes de Ponto</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Horário</th>
            <th>Localização</th>
            <th>Status</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ListaRegistrosPonto;
