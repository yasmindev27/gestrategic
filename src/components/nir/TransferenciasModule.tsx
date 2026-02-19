import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck, Plus, Search, Clock, CheckCircle, AlertTriangle, Loader2, ArrowRight, MapPin, Navigation } from "lucide-react";

interface Veiculo {
  id: string;
  placa: string;
  tipo: string;
  motorista_nome: string;
  status: string;
}

interface Solicitacao {
  id: string;
  paciente_nome: string;
  setor_origem: string;
  destino: string;
  motivo: string | null;
  prioridade: string;
  status: string;
  veiculo_id: string | null;
  hora_saida: string | null;
  hora_chegada: string | null;
  solicitado_por_nome: string;
  created_at: string;
}

interface PacienteInternado {
  bed_id: string;
  patient_name: string;
  sector: string;
  hipotese_diagnostica: string | null;
  data_internacao: string | null;
}

interface Motorista {
  user_id: string;
  full_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pendente: { label: "Pendente", color: "bg-yellow-500", icon: Clock },
  em_transporte: { label: "Em Transporte", color: "bg-blue-500", icon: Truck },
  concluida: { label: "Concluída", color: "bg-green-500", icon: CheckCircle },
  cancelada: { label: "Cancelada", color: "bg-destructive", icon: AlertTriangle },
};

const VEICULO_STATUS: Record<string, { label: string; color: string }> = {
  disponivel: { label: "Disponível", color: "bg-green-500" },
  em_uso: { label: "Em Uso", color: "bg-blue-500" },
  manutencao: { label: "Manutenção", color: "bg-yellow-500" },
  indisponivel: { label: "Indisponível", color: "bg-destructive" },
};

export const TransferenciasModule = () => {
  const { toast } = useToast();
  const userRole = useUserRole();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [pacientes, setPacientes] = useState<PacienteInternado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchPaciente, setSearchPaciente] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteInternado | null>(null);

  // Form state
  const [formDestino, setFormDestino] = useState("");
  const [formMotivo, setFormMotivo] = useState("");
  const [formPrioridade, setFormPrioridade] = useState("normal");
  const [formPacienteNome, setFormPacienteNome] = useState("");
  const [formSetorOrigem, setFormSetorOrigem] = useState("");
  const [formVeiculoId, setFormVeiculoId] = useState("");
  const [formMotorista, setFormMotorista] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const [veiculosRes, solicitacoesRes, bedRes, motoristasRes] = await Promise.all([
        supabase.from("transferencia_veiculos").select("*").order("motorista_nome"),
        supabase.from("transferencia_solicitacoes").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("bed_records").select("bed_id, patient_name, sector, hipotese_diagnostica, data_internacao").eq("shift_date", today).not("patient_name", "is", null).is("data_alta", null),
        supabase.from("profiles").select("user_id, full_name").eq("cargo", "CONDUTOR DE AMBULÂNCIA").order("full_name"),
      ]);

      if (veiculosRes.data) setVeiculos(veiculosRes.data);
      if (solicitacoesRes.data) setSolicitacoes(solicitacoesRes.data);
      if (bedRes.data) setPacientes(bedRes.data as PacienteInternado[]);
      if (motoristasRes.data) setMotoristas(motoristasRes.data as Motorista[]);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSolicitar = (p: PacienteInternado) => {
    setSelectedPaciente(p);
    setFormPacienteNome(p.patient_name || "");
    setFormSetorOrigem(getSectorLabel(p.sector));
    setFormDestino("");
    setFormMotivo("");
    setFormPrioridade("normal");
    setFormVeiculoId("");
    setFormMotorista("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formPacienteNome || !formDestino || !formVeiculoId || !formMotorista) {
      toast({ title: "Preencha os campos obrigatórios (paciente, destino, veículo e motorista)", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const selectedVeiculo = veiculos.find(v => v.id === formVeiculoId);
      const { error } = await supabase.from("transferencia_solicitacoes").insert({
        paciente_nome: formPacienteNome,
        setor_origem: formSetorOrigem,
        destino: formDestino,
        motivo: formMotivo || null,
        prioridade: formPrioridade,
        veiculo_id: formVeiculoId || null,
        veiculo_placa: selectedVeiculo?.placa || null,
        veiculo_tipo: selectedVeiculo?.tipo || null,
        motorista_nome: formMotorista || null,
        solicitado_por: user?.id,
        solicitado_por_nome: user?.email || "—",
      });

      if (error) throw error;

      toast({ title: "Transferência solicitada com sucesso!" });
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao solicitar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getSectorLabel = (sector: string) => {
    const map: Record<string, string> = {
      "enfermaria-masculina": "Enf. Masculina",
      "enfermaria-feminina": "Enf. Feminina",
      pediatria: "Pediatria",
      isolamento: "Isolamento",
      urgencia: "Urgência",
    };
    return map[sector] || sector;
  };

  // Map patient names to their latest transfer status
  const getPatientTransferStatus = (patientName: string | null) => {
    if (!patientName) return null;
    const sol = solicitacoes.find(
      (s) => s.paciente_nome === patientName && s.status !== "cancelada" && s.status !== "concluida"
    );
    if (!sol) return null;
    if (sol.status === "em_transporte") return { label: "Em Transporte", variant: "default" as const, color: "bg-blue-500 text-white border-0" };
    if (sol.veiculo_id && (sol as any).motorista_nome) return { label: "Aguardando Saída", variant: "outline" as const, color: "border-blue-500 text-blue-600" };
    if (sol.veiculo_id) return { label: "Aguardando Motorista", variant: "outline" as const, color: "border-yellow-500 text-yellow-600" };
    return { label: "Transferência Pendente", variant: "outline" as const, color: "border-orange-500 text-orange-600" };
  };

  const filteredPacientes = pacientes.filter(
    (p) =>
      !searchPaciente ||
      p.patient_name?.toLowerCase().includes(searchPaciente.toLowerCase()) ||
      getSectorLabel(p.sector).toLowerCase().includes(searchPaciente.toLowerCase())
  );

  // ---- Gantt helpers ----
  const now = new Date();
  const ganttStart = new Date(now);
  ganttStart.setHours(0, 0, 0, 0);
  const ganttEnd = new Date(now);
  ganttEnd.setHours(23, 59, 59, 999);
  const totalMs = ganttEnd.getTime() - ganttStart.getTime();

  const getBarStyle = (sol: Solicitacao) => {
    const start = sol.hora_saida ? new Date(sol.hora_saida) : new Date(sol.created_at);
    const end = sol.hora_chegada ? new Date(sol.hora_chegada) : sol.status === "em_transporte" ? now : new Date(start.getTime() + 60 * 60 * 1000);
    const leftPct = Math.max(0, ((start.getTime() - ganttStart.getTime()) / totalMs) * 100);
    const widthPct = Math.max(2, Math.min(100 - leftPct, ((end.getTime() - start.getTime()) / totalMs) * 100));
    return { left: `${leftPct}%`, width: `${widthPct}%` };
  };

  const getBarColor = (status: string) => {
    switch (status) {
      case "em_transporte": return "bg-blue-500";
      case "concluida": return "bg-green-500";
      case "cancelada": return "bg-destructive/60";
      default: return "bg-yellow-500";
    }
  };

  // Group solicitacoes by vehicle/motorista
  const veiculoMap = new Map<string, { label: string; solicitacoes: Solicitacao[] }>();
  veiculos.forEach((v) => {
    veiculoMap.set(v.id, { label: `${v.motorista_nome} — ${v.placa}`, solicitacoes: [] });
  });
  // Add unassigned group
  veiculoMap.set("sem-veiculo", { label: "Sem veículo atribuído", solicitacoes: [] });

  solicitacoes.forEach((s) => {
    const key = s.veiculo_id || "sem-veiculo";
    if (veiculoMap.has(key)) {
      veiculoMap.get(key)!.solicitacoes.push(s);
    } else {
      veiculoMap.get("sem-veiculo")!.solicitacoes.push(s);
    }
  });

  // Time markers
  const hours = Array.from({ length: 13 }, (_, i) => i * 2); // 0,2,4,...,24

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Transferências
          </h3>
          <p className="text-sm text-muted-foreground">Gestão de transferências de pacientes e acompanhamento de veículos</p>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diagrama de Gantt — Veículos / Motoristas</CardTitle>
        </CardHeader>
        <CardContent>
          {veiculos.length === 0 && solicitacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum veículo ou transferência cadastrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Time header */}
                <div className="flex border-b pb-1 mb-2">
                  <div className="w-48 shrink-0 text-xs font-medium text-muted-foreground">Motorista / Veículo</div>
                  <div className="flex-1 relative h-5">
                    {hours.map((h) => (
                      <span
                        key={h}
                        className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
                        style={{ left: `${(h / 24) * 100}%` }}
                      >
                        {String(h).padStart(2, "0")}h
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                {Array.from(veiculoMap.entries()).map(([key, { label, solicitacoes: sols }]) => {
                  if (key === "sem-veiculo" && sols.length === 0) return null;
                  const veiculo = veiculos.find((v) => v.id === key);
                  const vStatus = veiculo ? VEICULO_STATUS[veiculo.status] : null;

                  return (
                    <div key={key} className="flex items-center border-b last:border-0 py-2 min-h-[40px]">
                      <div className="w-48 shrink-0 pr-2">
                        <div className="text-xs font-medium truncate">{label}</div>
                        {vStatus && (
                          <Badge variant="outline" className="text-[10px] gap-1 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${vStatus.color}`} />
                            {vStatus.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 relative h-8 bg-muted/30 rounded">
                        {/* Grid lines */}
                        {hours.map((h) => (
                          <div
                            key={h}
                            className="absolute top-0 bottom-0 border-l border-border/30"
                            style={{ left: `${(h / 24) * 100}%` }}
                          />
                        ))}
                        {/* Now indicator */}
                        <div
                          className="absolute top-0 bottom-0 border-l-2 border-primary z-10"
                          style={{ left: `${((now.getTime() - ganttStart.getTime()) / totalMs) * 100}%` }}
                        />
                        {/* Bars */}
                        <TooltipProvider>
                          {sols.map((s) => {
                            const barStyle = getBarStyle(s);
                            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pendente;
                            return (
                              <Tooltip key={s.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`absolute top-1 bottom-1 rounded ${getBarColor(s.status)} opacity-80 hover:opacity-100 cursor-pointer transition-opacity`}
                                    style={barStyle}
                                    onClick={() => {
                                      setSelectedSolicitacao(s);
                                      setMapDialogOpen(true);
                                    }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="font-medium">{s.paciente_nome}</p>
                                  <p className="text-xs">{s.setor_origem} → {s.destino}</p>
                                  <p className="text-xs">Status: {cfg.label}</p>
                                  <p className="text-xs text-primary">Clique para ver no mapa</p>
                                  {s.hora_saida && <p className="text-xs">Saída: {format(new Date(s.hora_saida), "HH:mm")}</p>}
                                  {s.hora_chegada && <p className="text-xs">Chegada: {format(new Date(s.hora_chegada), "HH:mm")}</p>}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`w-3 h-3 rounded ${getBarColor(key)}`} />
                    {cfg.label}
                  </div>
                ))}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-0.5 bg-primary" />
                  Horário atual
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pacientes Internados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Pacientes Internados</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente ou setor..."
                value={searchPaciente}
                onChange={(e) => setSearchPaciente(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPacientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum paciente internado encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Paciente</TableHead>
                     <TableHead>Setor</TableHead>
                     <TableHead>Hipótese Diagnóstica</TableHead>
                     <TableHead>Data Internação</TableHead>
                     <TableHead>Status Transferência</TableHead>
                     <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPacientes.map((p) => (
                    <TableRow key={p.bed_id}>
                      <TableCell className="font-medium">{p.patient_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getSectorLabel(p.sector)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {p.hipotese_diagnostica || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.data_internacao ? format(new Date(p.data_internacao), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const transferStatus = getPatientTransferStatus(p.patient_name);
                          if (!transferStatus) return <span className="text-xs text-muted-foreground">Sem solicitação</span>;
                          return <Badge className={transferStatus.color}>{transferStatus.label}</Badge>;
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="gap-1.5" onClick={() => handleSolicitar(p)}>
                          <ArrowRight className="h-3.5 w-3.5" />
                          Solicitar Transferência
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Solicitar Transferência */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Transferência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paciente</Label>
              <Input value={formPacienteNome} readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label>Setor de Origem</Label>
              <Input value={formSetorOrigem} readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label>Destino *</Label>
              <Input
                placeholder="Ex: Hospital Regional, UPA Centro..."
                value={formDestino}
                onChange={(e) => setFormDestino(e.target.value)}
              />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={formPrioridade} onValueChange={setFormPrioridade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Veículo *</Label>
              <Select value={formVeiculoId} onValueChange={(val) => {
                setFormVeiculoId(val);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.tipo} — {v.placa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motorista *</Label>
              <Select value={formMotorista} onValueChange={setFormMotorista}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {motoristas.map((m) => (
                    <SelectItem key={m.user_id} value={m.full_name}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo</Label>
              <Textarea
                placeholder="Descreva o motivo da transferência..."
                value={formMotivo}
                onChange={(e) => setFormMotivo(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Solicitar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog Mapa do Veículo */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Localização do Veículo
            </DialogTitle>
          </DialogHeader>
          {selectedSolicitacao && (() => {
            const veiculo = veiculos.find(v => v.id === selectedSolicitacao.veiculo_id);
            const cfg = STATUS_CONFIG[selectedSolicitacao.status] || STATUS_CONFIG.pendente;
            // Simulated coordinates near Governador Valadares, MG
            const simulatedLat = -18.8509 + (Math.random() - 0.5) * 0.05;
            const simulatedLng = -41.9494 + (Math.random() - 0.5) * 0.05;
            const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${simulatedLng - 0.01}%2C${simulatedLat - 0.01}%2C${simulatedLng + 0.01}%2C${simulatedLat + 0.01}&layer=mapnik&marker=${simulatedLat}%2C${simulatedLng}`;

            return (
              <div className="space-y-4">
                {/* Info cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Paciente</p>
                    <p className="font-medium text-sm">{selectedSolicitacao.paciente_nome}</p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={`${getBarColor(selectedSolicitacao.status)} text-white border-0`}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Veículo</p>
                    <p className="font-medium text-sm">
                      {(selectedSolicitacao as any).veiculo_tipo || veiculo?.tipo || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Placa: {(selectedSolicitacao as any).veiculo_placa || veiculo?.placa || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Motorista</p>
                    <p className="font-medium text-sm flex items-center gap-1">
                      <Navigation className="h-3.5 w-3.5 text-primary" />
                      {(selectedSolicitacao as any).motorista_nome || veiculo?.motorista_nome || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Origem</p>
                    <p className="font-medium text-sm">{selectedSolicitacao.setor_origem}</p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Destino</p>
                    <p className="font-medium text-sm">{selectedSolicitacao.destino}</p>
                  </div>
                </div>

                {/* Map */}
                <div className="rounded-lg overflow-hidden border relative">
                  <iframe
                    src={mapUrl}
                    className="w-full h-[350px] border-0"
                    title="Localização do veículo"
                  />
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-md px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 border">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Localização simulada — GPS do motorista será integrado em breve
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
