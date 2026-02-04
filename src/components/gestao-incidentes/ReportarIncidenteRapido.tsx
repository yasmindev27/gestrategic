import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLogAccess } from "@/hooks/useLogAccess";
import { AlertTriangle, Send, Shield, Clock } from "lucide-react";
import { format } from "date-fns";

interface ReportarIncidenteRapidoProps {
  onIncidenteRegistrado?: () => void;
}

const tiposIncidente = [
  { value: "quase_erro", label: "Quase Erro (Near Miss)", icon: "⚠️", desc: "Evento que poderia ter causado dano" },
  { value: "incidente_sem_dano", label: "Incidente sem Dano", icon: "🔶", desc: "Ocorreu mas não causou dano" },
  { value: "evento_adverso", label: "Evento Adverso", icon: "🔴", desc: "Evento que causou dano ao paciente" },
];

const classificacoesRisco = [
  { value: "leve", label: "Leve", color: "bg-green-500" },
  { value: "moderado", label: "Moderado", color: "bg-yellow-500" },
  { value: "grave", label: "Grave", color: "bg-orange-500" },
  { value: "catastrofico", label: "Catastrófico", color: "bg-red-600" },
];

const setoresCompletos = [
  // Assistenciais
  "Emergência", "UTI Adulto", "UTI Pediátrica", "Centro Cirúrgico", "CME",
  "Observação Adulto", "Observação Pediátrica", "Ambulatório", "Maternidade",
  // Apoio
  "Laboratório", "Farmácia", "Radiologia", "Nutrição",
  // Logística
  "Rouparia", "Restaurante", "Almoxarifado", "Transporte",
  // Administrativo
  "Recepção", "Faturamento", "RH/DP", "Administração", "TI", "Manutenção",
  // Outros
  "Engenharia Clínica", "Qualidade", "CCIH", "Outro"
];

const categoriasOperacionais = [
  { value: "equipamento", label: "Falha em Equipamento" },
  { value: "laudo", label: "Atraso em Laudo/Exame" },
  { value: "medicamento", label: "Medicamento" },
  { value: "procedimento", label: "Procedimento" },
  { value: "comunicacao", label: "Falha de Comunicação" },
  { value: "infraestrutura", label: "Infraestrutura" },
  { value: "processo", label: "Falha de Processo" },
  { value: "outro", label: "Outro" },
];

export function ReportarIncidenteRapido({ onIncidenteRegistrado }: ReportarIncidenteRapidoProps) {
  const { toast } = useToast();
  const { logAction } = useLogAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; nome: string }>({ id: "", nome: "" });
  
  const [form, setForm] = useState({
    tipo_incidente: "",
    classificacao_risco: "",
    setor: "",
    setor_origem: "",
    categoria_operacional: "",
    local_ocorrencia: "",
    descricao: "",
    notificacao_anonima: false,
    paciente_envolvido: false,
    paciente_nome: "",
    paciente_prontuario: "",
    equipamento_nome: "",
    observacoes: "",
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
    if (!form.tipo_incidente || !form.classificacao_risco || !form.setor || !form.descricao) {
      toast({ 
        title: "Campos obrigatórios", 
        description: "Preencha tipo, risco, setor e descrição", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Registrar no incidentes_nsp
      const { data: incidente, error: incidenteError } = await supabase
        .from("incidentes_nsp")
        .insert({
          numero_notificacao: "",
          tipo_incidente: form.tipo_incidente,
          data_ocorrencia: new Date().toISOString(),
          local_ocorrencia: form.local_ocorrencia || form.setor,
          setor: form.setor,
          setor_origem: form.setor_origem || form.setor,
          categoria_operacional: form.categoria_operacional,
          descricao: form.descricao,
          classificacao_risco: form.classificacao_risco,
          notificacao_anonima: form.notificacao_anonima,
          paciente_envolvido: form.paciente_envolvido,
          paciente_nome: form.paciente_nome || null,
          paciente_prontuario: form.paciente_prontuario || null,
          observacoes: form.observacoes || null,
          notificador_id: form.notificacao_anonima ? null : currentUser.id,
          notificador_nome: form.notificacao_anonima ? null : currentUser.nome,
        })
        .select()
        .single();
      
      if (incidenteError) throw incidenteError;

      // 2. Se for categoria de equipamento ou laudo, criar risco operacional
      if (["equipamento", "laudo"].includes(form.categoria_operacional)) {
        await supabase.from("riscos_operacionais").insert({
          tipo_risco: form.categoria_operacional,
          categoria: form.setor_origem || form.setor,
          descricao: form.descricao,
          severidade: form.classificacao_risco === "catastrofico" ? "critico" : 
                     form.classificacao_risco === "grave" ? "alto" :
                     form.classificacao_risco === "moderado" ? "medio" : "baixo",
          incidente_id: incidente?.id,
          setor_afetado: form.setor,
          equipamento_nome: form.equipamento_nome || null,
          registrado_por: currentUser.id,
          registrado_por_nome: currentUser.nome,
        });
      }
      
      toast({ title: "Incidente registrado", description: "Notificação enviada para análise" });
      logAction("registro_incidente_rapido", "gestao-incidentes", { tipo: form.tipo_incidente });
      
      // Reset form
      setForm({
        tipo_incidente: "",
        classificacao_risco: "",
        setor: "",
        setor_origem: "",
        categoria_operacional: "",
        local_ocorrencia: "",
        descricao: "",
        notificacao_anonima: false,
        paciente_envolvido: false,
        paciente_nome: "",
        paciente_prontuario: "",
        equipamento_nome: "",
        observacoes: "",
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
          Reportar Incidente Rápido
        </CardTitle>
        <CardDescription>
          Qualquer colaborador pode notificar um quase-erro ou incidente de forma anônima
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Tipo de Incidente - Cards selecionáveis */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de Ocorrência *</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tiposIncidente.map((tipo) => (
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{tipo.icon}</span>
                  <span className="font-medium text-sm">{tipo.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{tipo.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Risco e Setor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Classificação de Risco *</Label>
            <Select value={form.classificacao_risco} onValueChange={(v) => setForm({ ...form, classificacao_risco: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o risco" />
              </SelectTrigger>
              <SelectContent>
                {classificacoesRisco.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${r.color}`} />
                      {r.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Setor onde ocorreu *</Label>
            <Select value={form.setor} onValueChange={(v) => setForm({ ...form, setor: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {setoresCompletos.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Categoria Operacional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Categoria do Problema</Label>
            <Select value={form.categoria_operacional} onValueChange={(v) => setForm({ ...form, categoria_operacional: v })}>
              <SelectTrigger>
                <SelectValue placeholder="O que falhou?" />
              </SelectTrigger>
              <SelectContent>
                {categoriasOperacionais.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {form.categoria_operacional === "equipamento" && (
            <div className="space-y-2">
              <Label>Nome do Equipamento</Label>
              <Input
                value={form.equipamento_nome}
                onChange={(e) => setForm({ ...form, equipamento_nome: e.target.value })}
                placeholder="Ex: Monitor multiparâmetros, Ventilador..."
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Local Específico</Label>
            <Input
              value={form.local_ocorrencia}
              onChange={(e) => setForm({ ...form, local_ocorrencia: e.target.value })}
              placeholder="Ex: Leito 05, Sala de procedimentos..."
            />
          </div>
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <Label>Descrição do Ocorrido *</Label>
          <Textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descreva detalhadamente o que aconteceu, quando e quais as circunstâncias..."
            rows={4}
          />
        </div>

        {/* Opções */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="anonimo"
              checked={form.notificacao_anonima}
              onCheckedChange={(c) => setForm({ ...form, notificacao_anonima: c === true })}
            />
            <Label htmlFor="anonimo" className="flex items-center gap-1 text-sm cursor-pointer">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Notificação anônima
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox
              id="paciente"
              checked={form.paciente_envolvido}
              onCheckedChange={(c) => setForm({ ...form, paciente_envolvido: c === true })}
            />
            <Label htmlFor="paciente" className="text-sm cursor-pointer">
              Paciente envolvido
            </Label>
          </div>
        </div>

        {/* Dados do paciente se envolvido */}
        {form.paciente_envolvido && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Nome do Paciente</Label>
              <Input
                value={form.paciente_nome}
                onChange={(e) => setForm({ ...form, paciente_nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Prontuário</Label>
              <Input
                value={form.paciente_prontuario}
                onChange={(e) => setForm({ ...form, paciente_prontuario: e.target.value })}
                placeholder="Número do prontuário"
              />
            </div>
          </div>
        )}

        {/* Observações */}
        <div className="space-y-2">
          <Label>Observações Adicionais</Label>
          <Textarea
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Informações complementares, sugestões de melhoria..."
            rows={2}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            size="lg"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Enviando..." : "Enviar Notificação"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
