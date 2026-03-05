import { useState, useEffect } from "react";
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
import { ATIVIDADES, Atividade, RegistroProducao } from "./types";
import { salvarRegistroDB } from "./storage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { getBrasiliaDateString, getBrasiliaTimeString } from "@/lib/brasilia-time";

interface Props {
  onRegistroAdded: () => void;
}

export function RegistroForm({ onRegistroAdded }: Props) {
  const [colaborador, setColaborador] = useState("");
  const [atividade, setAtividade] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [data] = useState(() => getBrasiliaDateString());
  const [horario, setHorario] = useState(() => getBrasiliaTimeString());

  // Auto-fill colaborador from logged-in user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      if (profile?.full_name) {
        setColaborador(profile.full_name);
      }
    };
    loadUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      await salvarRegistroDB(registro);
      toast.success("Tarefa registrada com sucesso!");
      setAtividade("");
      setQuantidade("");
      setObservacao("");
      onRegistroAdded();
    } catch {
      toast.error("Erro ao registrar tarefa.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary" />
        Registrar Tarefa
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Colaborador *</Label>
          <Input value={colaborador} disabled className="bg-muted" />
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
          <Input type="date" value={data} disabled className="bg-muted" />
        </div>

        <div className="space-y-2">
          <Label>Horário *</Label>
          <Input
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observação</Label>
        <Textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Detalhes adicionais sobre a tarefa..."
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full md:w-auto">
        Registrar Tarefa
      </Button>
    </form>
  );
}
