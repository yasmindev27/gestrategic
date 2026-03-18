import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useSetoresNomes } from "@/hooks/useSetores";
import { Plus, ClipboardCheck, Trash2, Eye, Bell, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Ronda {
  id: string;
  data_ronda: string;
  hora_ronda: string;
  responsavel_id: string;
  responsavel_nome: string;
  setor: string;
  checklist: Record<string, boolean>;
  observacoes: string | null;
  status: string;
  created_at: string;
}

interface Notificacao {
  id: string;
  ronda_id: string;
  tipo_notificacao: string;
  descricao: string;
  setor: string;
  responsavel_notificado: string | null;
  prioridade: string;
  status: string;
}

const CHECKLIST_ITEMS = [
  { id: "extintores", label: "Extintores de incêndio em dia e acessíveis" },
  { id: "saidas_emergencia", label: "Saídas de emergência desobstruídas" },
  { id: "sinalizacao", label: "Sinalização de segurança visível" },
  { id: "iluminacao", label: "Iluminação adequada" },
  { id: "piso", label: "Piso sem irregularidades ou riscos" },
  { id: "equipamentos", label: "Equipamentos de proteção disponíveis" },
  { id: "limpeza", label: "Ambiente limpo e organizado" },
  { id: "eletrica", label: "Instalações elétricas em bom estado" },
  { id: "vazamentos", label: "Ausência de vazamentos" },
  { id: "ventilacao", label: "Ventilação adequada" },
  { id: "epis", label: "Colaboradores utilizando EPIs corretamente" },
  { id: "primeiros_socorros", label: "Kit de primeiros socorros disponível" }
];

const TIPOS_NOTIFICACAO = [
  "Risco de Incêndio",
  "Risco Elétrico",
  "Risco de Queda",
  "Falta de EPI",
  "Condição Insalubre",
  "Obstrução de Passagem",
  "Equipamento Danificado",
  "Vazamento",
  "Outro"
];

export function RondasControl() {
  const { data: SETORES = [] } = useSetoresNomes();
  const [rondas, setRondas] = useState<Ronda[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [notificacaoDialogOpen, setNotificacaoDialogOpen] = useState(false);
  const [selectedRonda, setSelectedRonda] = useState<Ronda | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    setor: "",
    checklist: {} as Record<string, boolean>,
    observacoes: "",
    status: "em_andamento"
  });

  const [notificacaoData, setNotificacaoData] = useState({
    tipo_notificacao: "",
    descricao: "",
    responsavel_notificado: "",
    prioridade: "media"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          setCurrentUserName(profile.full_name);
        }
      }

      const { data: rondasData, error } = await supabase
        .from("rondas_seguranca")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Cast checklist from Json to Record<string, boolean>
      const typedRondas: Ronda[] = (rondasData || []).map(r => ({
        ...r,
        checklist: (r.checklist as Record<string, boolean>) || {}
      }));
      setRondas(typedRondas);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as rondas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUserId || !formData.setor) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        responsavel_id: currentUserId,
        responsavel_nome: currentUserName,
        setor: formData.setor,
        checklist: formData.checklist,
        observacoes: formData.observacoes || null,
        status: formData.status
      };

      const { error } = await supabase
        .from("rondas_seguranca")
        .insert(payload);
      
      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Ronda registrada!" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a ronda.",
        variant: "destructive"
      });
    }
  };

  const handleCreateNotificacao = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRonda) return;

    try {
      const payload = {
        ronda_id: selectedRonda.id,
        tipo_notificacao: notificacaoData.tipo_notificacao,
        descricao: notificacaoData.descricao,
        setor: selectedRonda.setor,
        responsavel_notificado: notificacaoData.responsavel_notificado || null,
        prioridade: notificacaoData.prioridade,
        status: "pendente"
      };

      const { error } = await supabase
        .from("notificacoes_seguranca")
        .insert(payload);
      
      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Notificação gerada!" });
      setNotificacaoDialogOpen(false);
      setNotificacaoData({
        tipo_notificacao: "",
        descricao: "",
        responsavel_notificado: "",
        prioridade: "media"
      });
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a notificação.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir esta ronda?")) return;
    
    try {
      const { error } = await supabase
        .from("rondas_seguranca")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Ronda excluída!" });
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir.",
        variant: "destructive"
      });
    }
  };

  const handleChecklistChange = (itemId: string, checked: boolean) => {
    setFormData({
      ...formData,
      checklist: {
        ...formData.checklist,
        [itemId]: checked
      }
    });
  };

  const resetForm = () => {
    setFormData({
      setor: "",
      checklist: {},
      observacoes: "",
      status: "em_andamento"
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      em_andamento: "outline",
      concluida: "default",
      com_pendencias: "destructive"
    };
    const labels: Record<string, string> = {
      em_andamento: "Em Andamento",
      concluida: "Concluída",
      com_pendencias: "Com Pendências"
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const countChecklistStatus = (checklist: Record<string, boolean>) => {
    const total = CHECKLIST_ITEMS.length;
    const checked = Object.values(checklist).filter(Boolean).length;
    return { checked, total };
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Rondas Diárias
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Ronda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Ronda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select
                    value={formData.setor}
                    onValueChange={(v) => setFormData({ ...formData, setor: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {SETORES.map((setor) => (
                        <SelectItem key={setor} value={setor}>{setor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="com_pendencias">Com Pendências</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Checklist de Verificação</Label>
                <div className="grid gap-3 p-4 border rounded-lg bg-muted/50">
                  {CHECKLIST_ITEMS.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={item.id}
                        checked={formData.checklist[item.id] || false}
                        onCheckedChange={(checked) => handleChecklistChange(item.id, checked as boolean)}
                      />
                      <label
                        htmlFor={item.id}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {item.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações adicionais sobre a ronda..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Registrar Ronda
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {rondas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma ronda registrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rondas.map((ronda) => {
                  const { checked, total } = countChecklistStatus(ronda.checklist);
                  return (
                    <TableRow key={ronda.id}>
                      <TableCell>
                        {format(new Date(ronda.data_ronda), "dd/MM/yyyy")} {ronda.hora_ronda.slice(0, 5)}
                      </TableCell>
                      <TableCell>{ronda.setor}</TableCell>
                      <TableCell className="font-medium">{ronda.responsavel_nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={checked < total ? "text-yellow-600" : "text-green-600"}>
                            {checked}/{total}
                          </span>
                          {checked < total && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(ronda.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRonda(ronda);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRonda(ronda);
                              setNotificacaoDialogOpen(true);
                            }}
                          >
                            <Bell className="h-4 w-4 text-yellow-500" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(ronda.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Ronda</DialogTitle>
          </DialogHeader>
          {selectedRonda && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Data:</span>{" "}
                  {format(new Date(selectedRonda.data_ronda), "dd/MM/yyyy")}
                </div>
                <div>
                  <span className="font-medium">Hora:</span>{" "}
                  {selectedRonda.hora_ronda.slice(0, 5)}
                </div>
                <div>
                  <span className="font-medium">Setor:</span>{" "}
                  {selectedRonda.setor}
                </div>
                <div>
                  <span className="font-medium">Responsável:</span>{" "}
                  {selectedRonda.responsavel_nome}
                </div>
              </div>
              <div>
                <span className="font-medium">Status:</span>{" "}
                {getStatusBadge(selectedRonda.status)}
              </div>
              <div className="space-y-2">
                <span className="font-medium">Checklist:</span>
                <div className="grid gap-2 p-3 border rounded-lg bg-muted/50">
                  {CHECKLIST_ITEMS.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {selectedRonda.checklist[item.id] ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                      <span className={!selectedRonda.checklist[item.id] ? "text-red-600" : ""}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedRonda.observacoes && (
                <div>
                  <span className="font-medium">Observações:</span>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedRonda.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notificação Dialog */}
      <Dialog open={notificacaoDialogOpen} onOpenChange={setNotificacaoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Gerar Notificação
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateNotificacao} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Notificação</Label>
              <Select
                value={notificacaoData.tipo_notificacao}
                onValueChange={(v) => setNotificacaoData({ ...notificacaoData, tipo_notificacao: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_NOTIFICACAO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={notificacaoData.prioridade}
                onValueChange={(v) => setNotificacaoData({ ...notificacaoData, prioridade: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={notificacaoData.descricao}
                onChange={(e) => setNotificacaoData({ ...notificacaoData, descricao: e.target.value })}
                placeholder="Descreva o problema encontrado..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNotificacaoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Gerar Notificação
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
