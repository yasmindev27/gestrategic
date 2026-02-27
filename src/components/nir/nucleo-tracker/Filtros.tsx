import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ATIVIDADES, Colaborador } from "./types";
import { Filter } from "lucide-react";

interface Props {
  colaboradores: Colaborador[];
  colaborador: string;
  atividade: string;
  dataInicio: string;
  dataFim: string;
  onColaboradorChange: (v: string) => void;
  onAtividadeChange: (v: string) => void;
  onDataInicioChange: (v: string) => void;
  onDataFimChange: (v: string) => void;
}

export function Filtros({
  colaboradores,
  colaborador,
  atividade,
  dataInicio,
  dataFim,
  onColaboradorChange,
  onAtividadeChange,
  onDataInicioChange,
  onDataFimChange,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Filtros</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select value={colaborador} onValueChange={onColaboradorChange}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Todos os colaboradores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {(colaboradores ?? []).map((c) => (
              <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={atividade} onValueChange={onAtividadeChange}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Todas as atividades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {ATIVIDADES.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dataInicio}
          onChange={(e) => onDataInicioChange(e.target.value)}
          className="text-sm"
          placeholder="Data início"
        />
        <Input
          type="date"
          value={dataFim}
          onChange={(e) => onDataFimChange(e.target.value)}
          className="text-sm"
          placeholder="Data fim"
        />
      </div>
    </div>
  );
}
