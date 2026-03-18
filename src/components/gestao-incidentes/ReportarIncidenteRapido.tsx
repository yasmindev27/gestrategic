import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useLogAccess } from "@/hooks/useLogAccess";
import { AlertTriangle, Send, Shield, User, Calendar, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

interface ReportarIncidenteRapidoProps {
  onIncidenteRegistrado?: () => void;
}

import { PersonStanding, Pill, Wrench, Tag, FileStack, MoreHorizontal } from "lucide-react";

const tiposIncidente = [
  { value: "queda", label: "Queda", icon: PersonStanding },
  { value: "erro_medicacao", label: "Erro de Medicação", icon: Pill },
  { value: "falha_equipamento", label: "Falha em Equipamento", icon: Wrench },
  { value: "erro_identificacao", label: "Erro de Identificação", icon: Tag },
  { value: "atraso_laudo", label: "Atraso em Laudo", icon: FileStack },
  { value: "outros", label: "Outros", icon: MoreHorizontal },
];

const setoresCompletos = [
  // Assistenciais
  "UTI", "Centro Cirúrgico", "Emergência", "Laboratório",
  "UTI Adulto", "UTI Pediátrica", "CME",
  "Observação Adulto", "Observação Pediátrica", "Ambulatório", "Maternidade",
  // Apoio
  "Farmácia", "Radiologia", "Nutrição",
  // Logística
  "Rouparia", "Restaurante", "Almoxarifado", "Transporte",
  // Administrativo
  "Recepção", "Faturamento", "RH/DP", "Administração", "TI", "Manutenção",
  // Outros
  "Engenharia Clínica", "Qualidade", "CCIH", "Outro"
];

export function ReportarIncidenteRapido({ onIncidenteRegistrado }: ReportarIncidenteRapidoProps) {
  const { toast } = useToast();
  const { logAction } = useLogAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; nome: string }>({ id: "", nome: "" });
  
  const [form, setForm] = useState({
    tipo_identificacao: "anonima", // "anonima" ou "identificada"
    data_ocorrencia: format(new Date(), "yyyy-MM-dd"),
    hora_ocorrencia: format(new Date(), "HH:mm"),
    setor: "",
    local_especifico: "",
    tipo_incidente: "",
    descricao: "",
  });

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    
    setCurrentUser({ id: user.id, nome: profile?.full_name || user.email || "" });
  };

  const handleSubmit = async () => {
    if (!form.setor || !form.tipo_incidente || !form.descricao) {
      toast({ 
        title: "Campos obrigatórios", 
        description: "Preencha o setor, tipo de incidente e descrição", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const isAnonimo = form.tipo_identificacao === "anonima";
      const dataHoraOcorrencia = new Date(`${form.data_ocorrencia}T${form.hora_ocorrencia}:00`);
      
      // Mapear tipo de incidente para classificação de risco padrão
      const classificacaoRiscoPadrao = form.tipo_incidente === "queda" ? "moderado" :
                                        form.tipo_incidente === "erro_medicacao" ? "grave" :
                                        form.tipo_incidente === "falha_equipamento" ? "moderado" :
                                        "leve";
      
      const { error: incidenteError } = await supabase
        .from("incidentes_nsp")
        .insert({
          numero_notificacao: "",
          tipo_incidente: form.tipo_incidente,
          data_ocorrencia: dataHoraOcorrencia.toISOString(),
          local_ocorrencia: form.local_especifico || form.setor,
          setor: form.setor,
          setor_origem: form.setor,
          categoria_operacional: form.tipo_incidente === "falha_equipamento" ? "equipamento" :
                                  form.tipo_incidente === "atraso_laudo" ? "laudo" :
                                  form.tipo_incidente === "erro_medicacao" ? "medicamento" : null,
          descricao: form.descricao,
          classificacao_risco: classificacaoRiscoPadrao,
          notificacao_anonima: isAnonimo,
          notificador_id: isAnonimo ? null : currentUser.id,
          notificador_nome: isAnonimo ? null : currentUser.nome,
        });
      
      if (incidenteError) throw incidenteError;
      
      toast({ title: "Incidente registrado", description: "Notificação enviada para análise" });
      logAction("registro_incidente_rapido", "gestao-incidentes", { tipo: form.tipo_incidente });
      
      // Reset form
      setForm({
        tipo_identificacao: "anonima",
        data_ocorrencia: format(new Date(), "yyyy-MM-dd"),
        hora_ocorrencia: format(new Date(), "HH:mm"),
        setor: "",
        local_especifico: "",
        tipo_incidente: "",
        descricao: "",
      });
      
      onIncidenteRegistrado?.();
    } catch (error) {
      console.error("Erro ao registrar incidente:", error);
      toast({ title: "Erro", description: "Falha ao registrar incidente", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Abrir Notificação
        </CardTitle>
        <CardDescription>
          Notifique quase-erros, incidentes ou eventos adversos de forma rápida
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* 1. Identificação */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Identificação
          </Label>
          <RadioGroup
            value={form.tipo_identificacao}
            onValueChange={(v) => setForm({ ...form, tipo_identificacao: v })}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="anonima" id="anonima" />
              <Label htmlFor="anonima" className="cursor-pointer flex items-center gap-2 font-normal">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Notificação Anônima
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="identificada" id="identificada" />
              <Label htmlFor="identificada" className="cursor-pointer flex items-center gap-2 font-normal">
                <User className="h-4 w-4 text-muted-foreground" />
                Notificação Identificada
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            A cultura justa da ONA encoraja notificações anônimas para promover a transparência sem medo de punição.
          </p>
        </div>

        {/* 2. Data, Hora e Local */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data, Hora e Local
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Data *</Label>
              <Input
                type="date"
                value={form.data_ocorrencia}
                onChange={(e) => setForm({ ...form, data_ocorrencia: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Hora *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={form.hora_ocorrencia}
                  onChange={(e) => setForm({ ...form, hora_ocorrencia: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Setor *</Label>
              <Select value={form.setor} onValueChange={(v) => setForm({ ...form, setor: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {setoresCompletos.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Local Específico</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.local_especifico}
                  onChange={(e) => setForm({ ...form, local_especifico: e.target.value })}
                  placeholder="Ex: Leito 05"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Tipo de Incidente */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tipo de Incidente *</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {tiposIncidente.map((tipo) => {
              const Icon = tipo.icon;
              return (
              <button
                key={tipo.value}
                type="button"
                onClick={() => setForm({ ...form, tipo_incidente: tipo.value })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  form.tipo_incidente === tipo.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-sm">{tipo.label}</span>
                </div>
              </button>
            );
            })}
          </div>
        </div>

        {/* 4. Descrição do Fato */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Descrição do Fato *</Label>
          <Textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descreva detalhadamente o que aconteceu, quando e quais as circunstâncias..."
            rows={5}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  size="lg"
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Enviando..." : "Enviar Notificação"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Registrar a notificação para análise da equipe de Qualidade/NSP</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
