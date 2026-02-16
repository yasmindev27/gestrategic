import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, FileText, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SetupReuniaoProps {
  onStart: (reuniaoId: string) => void;
}

const SetupReuniao = ({ onStart }: SetupReuniaoProps) => {
  const { toast } = useToast();
  const [titulo, setTitulo] = useState("");
  const [pauta, setPauta] = useState("");
  const [participantesSelecionados, setParticipantesSelecionados] = useState<{ id: string; nome: string }[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: colaboradores } = useQuery({
    queryKey: ["profiles_reuniao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const addParticipante = (userId: string) => {
    const colab = colaboradores?.find((c) => c.user_id === userId);
    if (colab && !participantesSelecionados.find((p) => p.id === userId)) {
      setParticipantesSelecionados((prev) => [...prev, { id: userId, nome: colab.full_name || "" }]);
    }
  };

  const removeParticipante = (userId: string) => {
    setParticipantesSelecionados((prev) => prev.filter((p) => p.id !== userId));
  };

  const handleCreate = async () => {
    if (!titulo.trim()) {
      toast({ title: "Erro", description: "Informe o título da reunião.", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase.from("reunioes").insert({
        titulo: titulo.trim(),
        pauta: pauta.trim() || null,
        participantes: participantesSelecionados.map((p) => p.id),
        criado_por: user.id,
        status: "em_andamento",
      }).select("id").single();

      if (error) throw error;
      toast({ title: "Reunião iniciada", description: "A sala de reunião está pronta." });
      onStart(data.id);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Video className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Nova Reunião</h2>
          <p className="text-sm text-muted-foreground">Configure e inicie a sala de reunião virtual</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Dados da Reunião
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Reunião *</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Reunião de Alinhamento Mensal" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pauta">Pauta / Objetivos</Label>
            <Textarea id="pauta" value={pauta} onChange={(e) => setPauta(e.target.value)} placeholder="Descreva os pontos a serem discutidos..." rows={4} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Participantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select onValueChange={addParticipante}>
            <SelectTrigger>
              <SelectValue placeholder="Adicionar participante..." />
            </SelectTrigger>
            <SelectContent>
              {colaboradores
                ?.filter((c) => !participantesSelecionados.find((p) => p.id === c.user_id))
                .map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id}>
                    {c.full_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {participantesSelecionados.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {participantesSelecionados.map((p) => (
                <Badge key={p.id} variant="secondary" className="gap-1">
                  {p.nome}
                  <button onClick={() => removeParticipante(p.id)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleCreate} disabled={isCreating} className="w-full" size="lg">
        <Video className="h-4 w-4 mr-2" />
        {isCreating ? "Iniciando..." : "Iniciar Reunião"}
      </Button>
    </div>
  );
};

export default SetupReuniao;
