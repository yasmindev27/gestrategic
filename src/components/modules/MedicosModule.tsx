import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Stethoscope, Plus, Upload, Calendar, Clock, MapPin, 
  ChevronLeft, ChevronRight, Users, Download, FileSpreadsheet,
  MoreHorizontal, Pencil, Trash2, CheckCircle, AlertCircle, ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays, subDays, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

interface Profissional {
  id: string;
  nome: string;
  registro_profissional: string | null;
  especialidade: string | null;
}

interface EscalaMedico {
  id: string;
  profissional_id: string;
  data_plantao: string;
  hora_inicio: string;
  hora_fim: string;
  setor: string;
  tipo_plantao: string;
  status: string;
  observacoes: string | null;
  profissionais_saude?: Profissional;
}

const setoresUPA = [
  "Emergência",
  "Sala Vermelha",
  "Sala Amarela",
  "Sala Verde",
  "Observação Adulto",
  "Observação Pediátrica",
  "Pediatria",
  "Ortopedia",
];

const tipoPlantaoConfig = {
  regular: { label: "Regular", variant: "default" as const },
  sobreaviso: { label: "Sobreaviso", variant: "secondary" as const },
  extra: { label: "Extra", variant: "outline" as const },
  cobertura: { label: "Cobertura", variant: "outline" as const },
};

const statusConfig = {
  confirmado: { label: "Confirmado", variant: "default" as const, icon: CheckCircle },
  pendente: { label: "Pendente", variant: "secondary" as const, icon: AlertCircle },
  cancelado: { label: "Cancelado", variant: "destructive" as const, icon: AlertCircle },
};

const MedicosModule = ({ onOpenExternal }: { onOpenExternal?: (url: string, title: string) => void }) => {
  const { toast } = useToast();
  const { logAction } = useLogAccess();

  useEffect(() => {
    logAction("acesso_modulo", "medicos");
  }, [logAction]);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingEscala, setEditingEscala] = useState<EscalaMedico | null>(null);
  const [formData, setFormData] = useState({
    profissional_id: "",
    data_plantao: format(new Date(), "yyyy-MM-dd"),
    hora_inicio: "07:00",
    hora_fim: "19:00",
    setor: "Emergência",
    tipo_plantao: "regular",
    status: "confirmado",
    observacoes: "",
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Query médicos cadastrados
  const { data: medicos, isLoading: loadingMedicos } = useQuery({
    queryKey: ["profissionais_medicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais_saude")
        .select("id, nome, registro_profissional, especialidade")
        .eq("tipo", "medico")
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;
      return data as Profissional[];
    },
  });

  // Query escalas do dia
  const { data: escalas, isLoading: loadingEscalas } = useQuery({
    queryKey: ["escalas_medicos", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalas_medicos")
        .select(`
          *,
          profissionais_saude:profissional_id (
            id, nome, registro_profissional, especialidade
          )
        `)
        .eq("data_plantao", dateStr)
        .order("hora_inicio");
      if (error) throw error;
      return data as EscalaMedico[];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("escalas_medicos").insert({
        profissional_id: data.profissional_id,
        data_plantao: data.data_plantao,
        hora_inicio: data.hora_inicio,
        hora_fim: data.hora_fim,
        setor: data.setor,
        tipo_plantao: data.tipo_plantao,
        status: data.status,
        observacoes: data.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas_medicos"] });
      toast({ title: "Sucesso", description: "Escala adicionada com sucesso!" });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("escalas_medicos")
        .update({
          profissional_id: data.profissional_id,
          data_plantao: data.data_plantao,
          hora_inicio: data.hora_inicio,
          hora_fim: data.hora_fim,
          setor: data.setor,
          tipo_plantao: data.tipo_plantao,
          status: data.status,
          observacoes: data.observacoes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas_medicos"] });
      toast({ title: "Sucesso", description: "Escala atualizada com sucesso!" });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("escalas_medicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas_medicos"] });
      toast({ title: "Sucesso", description: "Escala removida!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (records: any[]) => {
      const { error } = await supabase.from("escalas_medicos").insert(records);
      if (error) throw error;
      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["escalas_medicos"] });
      toast({ title: "Sucesso", description: `${count} escalas importadas!` });
      setImportDialogOpen(false);
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
      status: "confirmado",
      observacoes: "",
    });
    setEditingEscala(null);
  };

  const handleEdit = (escala: EscalaMedico) => {
    setEditingEscala(escala);
    setFormData({
      profissional_id: escala.profissional_id,
      data_plantao: escala.data_plantao,
      hora_inicio: escala.hora_inicio,
      hora_fim: escala.hora_fim,
      setor: escala.setor,
      tipo_plantao: escala.tipo_plantao,
      status: escala.status,
      observacoes: escala.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.profissional_id) {
      toast({ title: "Erro", description: "Selecione um médico", variant: "destructive" });
      return;
    }

    if (editingEscala) {
      updateMutation.mutate({ id: editingEscala.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !medicos) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const records: any[] = [];
        jsonData.forEach((row: any) => {
          const nomeMedico = (row.Medico || row.MEDICO || row.Nome || "").toString().toUpperCase();
          const medico = medicos.find((m) => m.nome.toUpperCase() === nomeMedico);
          
          if (medico) {
            records.push({
              profissional_id: medico.id,
              data_plantao: row.Data || format(new Date(), "yyyy-MM-dd"),
              hora_inicio: row["Hora Início"] || row.HoraInicio || "07:00",
              hora_fim: row["Hora Fim"] || row.HoraFim || "19:00",
              setor: row.Setor || "Emergência",
              tipo_plantao: (row.Tipo || "regular").toString().toLowerCase(),
              status: "confirmado",
            });
          }
        });

        if (records.length > 0) {
          importMutation.mutate(records);
        } else {
          toast({ title: "Aviso", description: "Nenhum médico encontrado no cadastro. Cadastre primeiro.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Erro", description: "Erro ao processar arquivo", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      { Medico: "NOME DO MÉDICO", Data: "2026-02-10", "Hora Início": "07:00", "Hora Fim": "19:00", Setor: "Emergência", Tipo: "regular" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Escalas");
    XLSX.writeFile(wb, "modelo_escala_medicos.xlsx");
  };

  // Check if currently on shift
  const isOnShiftNow = (escala: EscalaMedico) => {
    if (!isToday(parseISO(escala.data_plantao))) return false;
    const now = format(new Date(), "HH:mm");
    return now >= escala.hora_inicio && now <= escala.hora_fim && escala.status === "confirmado";
  };

  const stats = {
    total: escalas?.length || 0,
    dePlantao: escalas?.filter((e) => isOnShiftNow(e)).length || 0,
    confirmados: escalas?.filter((e) => e.status === "confirmado").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Escala Médica</h2>
            <p className="text-sm text-muted-foreground">Gestão de plantões médicos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.open("https://www.pegaplantao.com.br/login/", "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Pega Plantão
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Escala
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">
                  {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              {isToday(selectedDate) && (
                <Badge variant="default" className="mt-1">Hoje</Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Escalados</p>
          </CardContent>
        </Card>
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 text-center">
            <Stethoscope className="h-8 w-8 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-primary">{stats.dePlantao}</p>
            <p className="text-sm text-muted-foreground">De Plantão Agora</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-success mb-1" />
            <p className="text-2xl font-bold text-success">{stats.confirmados}</p>
            <p className="text-sm text-muted-foreground">Confirmados</p>
          </CardContent>
        </Card>
      </div>

      {/* Escalas List */}
      <div className="grid gap-4">
        {loadingEscalas ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : escalas?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum médico escalado para este dia</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { resetForm(); setDialogOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Escala
              </Button>
            </CardContent>
          </Card>
        ) : (
          escalas?.map((escala) => {
            const onShift = isOnShiftNow(escala);
            const prof = escala.profissionais_saude;
            const StatusIcon = statusConfig[escala.status as keyof typeof statusConfig]?.icon || AlertCircle;
            
            return (
              <Card 
                key={escala.id} 
                className={onShift ? "border-primary shadow-md ring-2 ring-primary/20" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${onShift ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <Stethoscope className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{prof?.nome || "Médico"}</h3>
                          {onShift && (
                            <Badge className="bg-primary">De Plantão</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {prof?.registro_profissional} • {prof?.especialidade || "Clínico"}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {escala.hora_inicio} - {escala.hora_fim}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {escala.setor}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tipoPlantaoConfig[escala.tipo_plantao as keyof typeof tipoPlantaoConfig]?.variant || "outline"}>
                        {tipoPlantaoConfig[escala.tipo_plantao as keyof typeof tipoPlantaoConfig]?.label || escala.tipo_plantao}
                      </Badge>
                      <Badge variant={statusConfig[escala.status as keyof typeof statusConfig]?.variant || "outline"}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[escala.status as keyof typeof statusConfig]?.label || escala.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(escala)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm("Remover esta escala?")) {
                                deleteMutation.mutate(escala.id);
                              }
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEscala ? "Editar Escala" : "Nova Escala Médica"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Médico *</Label>
              <Select 
                value={formData.profissional_id} 
                onValueChange={(v) => setFormData({ ...formData, profissional_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o médico" />
                </SelectTrigger>
                <SelectContent>
                  {medicos?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome} {m.registro_profissional && `(${m.registro_profissional})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {medicos?.length === 0 && (
                <p className="text-xs text-destructive mt-1">
                  Nenhum médico cadastrado. Cadastre primeiro no RH.
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Tipo</Label>
                <Select 
                  value={formData.tipo_plantao} 
                  onValueChange={(v) => setFormData({ ...formData, tipo_plantao: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="sobreaviso">Sobreaviso</SelectItem>
                    <SelectItem value="extra">Extra</SelectItem>
                    <SelectItem value="cobertura">Cobertura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingEscala ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Escala Médica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importe uma planilha com as escalas. Os médicos devem estar cadastrados no RH.
            </p>
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo
            </Button>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicosModule;
