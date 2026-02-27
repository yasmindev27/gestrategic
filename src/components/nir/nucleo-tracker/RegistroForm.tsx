import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATIVIDADES, Atividade, Colaborador, RegistroProducao } from "./types";
import { salvarRegistro } from "./storage";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Props {
  colaboradores: Colaborador[];
  onRegistroAdded: () => void;
}

export function RegistroForm({ colaboradores, onRegistroAdded }: Props) {
  const [colaborador, setColaborador] = useState("");
  const [atividade, setAtividade] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));

  const ativos = (colaboradores ?? []).filter((c) => c.ativo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colaborador || !atividade || !quantidade || !data) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const registro: RegistroProducao = {
      id: crypto.randomUUID(),
      colaborador,
      atividade: atividade as Atividade,
      quantidade: Number(quantidade),
      observacao,
      data,
      criadoEm: new Date().toISOString(),
    };

    salvarRegistro(registro);
    toast.success("Produção registrada com sucesso!");
    setColaborador("");
    setAtividade("");
    setQuantidade("");
    setObservacao("");
    onRegistroAdded();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary" />
        Registrar Produção
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Colaborador *</Label>
          <Select value={colaborador} onValueChange={setColaborador}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o colaborador" />
            </SelectTrigger>
            <SelectContent>
              {ativos.length === 0 && (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  Cadastre colaboradores primeiro
                </div>
              )}
              {ativos.map((c) => (
                <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Atividade *</Label>
          <Select value={atividade} onValueChange={setAtividade}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a atividade" />
            </SelectTrigger>
            <SelectContent>
              {ATIVIDADES.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Quantidade *</Label>
          <Input
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="Ex: 10"
          />
        </div>

        <div className="space-y-2">
          <Label>Data *</Label>
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observação</Label>
        <Textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Detalhes adicionais sobre a produção..."
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full md:w-auto">
        Registrar Produção
      </Button>
    </form>
  );
}
