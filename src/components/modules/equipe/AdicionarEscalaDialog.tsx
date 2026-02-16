import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSetoresNomes } from "@/hooks/useSetores";
import { format } from "date-fns";

interface AdicionarEscalaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
}

interface Profissional {
  id: string;
  nome: string;
  tipo: "medico" | "enfermagem";
  registro_profissional: string | null;
  especialidade: string | null;
}

const AdicionarEscalaDialog = ({ open, onOpenChange, selectedDate }: AdicionarEscalaDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: setoresUPA = [] } = useSetoresNomes();
  const [tipoProfissional, setTipoProfissional] = useState<"medico" | "enfermagem">("medico");
  const [formData, setFormData] = useState({
    profissional_id: "",
    data_plantao: format(selectedDate, "yyyy-MM-dd"),
    hora_inicio: "07:00",
    hora_fim: "19:00",
    setor: "Emergência",
    tipo_plantao: "regular",
    observacoes: "",
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      data_plantao: format(selectedDate, "yyyy-MM-dd"),
    }));
  }, [selectedDate]);

  // Query profissionais filtrados por tipo
  const { data: profissionais } = useQuery({
    queryKey: ["profissionais_por_tipo", tipoProfissional],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais_saude")
        .select("id, nome, tipo, registro_profissional, especialidade")
        .eq("tipo", tipoProfissional)
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;
      return data as Profissional[];
    },
  });

  const addMedicoMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("escalas_medicos").insert({
        profissional_id: data.profissional_id,
        data_plantao: data.data_plantao,
        hora_inicio: data.hora_inicio,
        hora_fim: data.hora_fim,
        setor: data.setor,
        tipo_plantao: data.tipo_plantao,
        status: "confirmado",
        observacoes: data.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas_medicos_equipe"] });
      toast({ title: "Sucesso", description: "Médico adicionado à escala!" });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const addEnfermagemMutation = useMutation({
    mutationFn: async (data: typeof formData & { profissional_nome: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const prof = profissionais?.find((p) => p.id === data.profissional_id);
      
      const { error } = await supabase.from("enfermagem_escalas").insert({
        profissional_saude_id: data.profissional_id,
        profissional_id: userData.user?.id || data.profissional_id,
        profissional_nome: prof?.nome || "",
        data_plantao: data.data_plantao,
        hora_inicio: data.hora_inicio,
        hora_fim: data.hora_fim,
        setor: data.setor,
        tipo_plantao: data.tipo_plantao,
        status: "confirmado",
        observacoes: data.observacoes || null,
        created_by: userData.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas_enfermagem_equipe"] });
      toast({ title: "Sucesso", description: "Profissional de enfermagem adicionado à escala!" });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      profissional_id: "",
      data_plantao: format(selectedDate, "yyyy-MM-dd"),
      hora_inicio: "07:00",
      hora_fim: "19:00",
      setor: "Emergência",
      tipo_plantao: "regular",
      observacoes: "",
    });
    setTipoProfissional("medico");
  };

  const handleSubmit = () => {
    if (!formData.profissional_id) {
      toast({ title: "Erro", description: "Selecione um profissional", variant: "destructive" });
      return;
    }

    const prof = profissionais?.find((p) => p.id === formData.profissional_id);

    if (tipoProfissional === "medico") {
      addMedicoMutation.mutate(formData);
    } else {
      addEnfermagemMutation.mutate({
        ...formData,
        profissional_nome: prof?.nome || "",
      });
    }
  };

  const handleTipoChange = (tipo: "medico" | "enfermagem") => {
    setTipoProfissional(tipo);
    setFormData((prev) => ({ ...prev, profissional_id: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar à Escala</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de Profissional</Label>
            <Select value={tipoProfissional} onValueChange={(v) => handleTipoChange(v as "medico" | "enfermagem")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="enfermagem">Enfermagem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Profissional *</Label>
            <Select 
              value={formData.profissional_id} 
              onValueChange={(v) => setFormData({ ...formData, profissional_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {profissionais?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} {p.registro_profissional && `(${p.registro_profissional})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {profissionais?.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum profissional cadastrado. Importe colaboradores primeiro.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={formData.data_plantao}
                onChange={(e) => setFormData({ ...formData, data_plantao: e.target.value })}
              />
            </div>
            <div>
              <Label>Início</Label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type="time"
                value={formData.hora_fim}
                onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Setor</Label>
              <Select 
                value={formData.setor} 
                onValueChange={(v) => setFormData({ ...formData, setor: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {setoresUPA.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo Plantão</Label>
              <Select 
                value={formData.tipo_plantao} 
                onValueChange={(v) => setFormData({ ...formData, tipo_plantao: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="extra">Extra</SelectItem>
                  <SelectItem value="cobertura">Cobertura</SelectItem>
                  <SelectItem value="sobreaviso">Sobreaviso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={addMedicoMutation.isPending || addEnfermagemMutation.isPending}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdicionarEscalaDialog;
