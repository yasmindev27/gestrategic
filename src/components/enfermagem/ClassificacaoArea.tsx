import { Thermometer } from 'lucide-react';
import { ChecklistSinaisVitais } from './ChecklistSinaisVitais';

export function ClassificacaoArea() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            Sinais Vitais
          </h2>
          <p className="text-sm text-muted-foreground">Registro e monitoramento de sinais vitais dos pacientes</p>
        </div>
      </div>

      <ChecklistSinaisVitais storageKey="enf-sinais-vitais-classificacao" setor="Enfermagem" />
    </div>
  );
}
