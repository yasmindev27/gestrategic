import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EscalaEntry {
  id: string;
  mes: number;
  ano: number;
  funcionario_nome: string;
  dia: number;
  turno: string;
  observacao: string | null;
  created_at: string;
}

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const turnos = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "plantao", label: "Plantão" },
];

const turnoColors: Record<string, string> = {
  manha: "bg-yellow-100 text-yellow-800 border-yellow-300",
  tarde: "bg-orange-100 text-orange-800 border-orange-300",
  noite: "bg-indigo-100 text-indigo-800 border-indigo-300",
  plantao: "bg-red-100 text-red-800 border-red-300",
};

export const EscalaLaboratorioModule = () => {
  const { userId } = useUserRole();
  const { toast } = useToast();
  
  const [escalas, setEscalas] = useState<EscalaEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter states
  const now = new Date();
  const [selectedMes, setSelectedMes] = useState(now.getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState(now.getFullYear());
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEscala, setSelectedEscala] = useState<EscalaEntry | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    funcionario_nome: "",
    dia: 1,
    turno: "manha",
    observacao: "",
  });

  useEffect(() => {
    fetchEscalas();
  }, [selectedMes, selectedAno]);

  const fetchEscalas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("escalas_laboratorio")
        .select("*")
        .eq("mes", selectedMes)
        .eq("ano", selectedAno)
        .order("dia", { ascending: true })
        .order("turno", { ascending: true });

      if (error) throw error;
      setEscalas(data || []);
    } catch (error) {
      console.error("Error fetching escalas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar escalas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEscala = async () => {
    if (!formData.funcionario_nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome do funcionário é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("escalas_laboratorio")
        .insert({
          mes: selectedMes,
          ano: selectedAno,
          funcionario_nome: formData.funcionario_nome,
          dia: formData.dia,
          turno: formData.turno,
          observacao: formData.observacao || null,
          created_by: userId,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Escala registrada com sucesso.",
      });

      setCreateDialogOpen(false);
      resetForm();
      fetchEscalas();
    } catch (error: unknown) {
      console.error("Error:", error);
      const message = error instanceof Error ? error.message : "Erro ao registrar escala.";
      toast({
        title: "Erro",
        description: message.includes("duplicate") ? "Esta escala já existe para o funcionário neste dia/turno." : message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEscala = async () => {
    if (!selectedEscala) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("escalas_laboratorio")
        .delete()
        .eq("id", selectedEscala.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Escala removida com sucesso.",
      });

      setDeleteDialogOpen(false);
      setSelectedEscala(null);
      fetchEscalas();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover escala.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      funcionario_nome: "",
      dia: 1,
      turno: "manha",
      observacao: "",
    });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (selectedMes === 1) {
        setSelectedMes(12);
        setSelectedAno(selectedAno - 1);
      } else {
        setSelectedMes(selectedMes - 1);
      }
    } else {
      if (selectedMes === 12) {
        setSelectedMes(1);
        setSelectedAno(selectedAno + 1);
      } else {
        setSelectedMes(selectedMes + 1);
      }
    }
  };

  const getDaysInMonth = () => {
    return new Date(selectedAno, selectedMes, 0).getDate();
  };

  // Group escalas by day
  const escalasByDay = escalas.reduce((acc, escala) => {
    if (!acc[escala.dia]) acc[escala.dia] = [];
    acc[escala.dia].push(escala);
    return acc;
  }, {} as Record<number, EscalaEntry[]>);

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Escala Mensal
            </CardTitle>
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Escala
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xl font-semibold min-w-[200px] text-center">
              {meses[selectedMes - 1]} {selectedAno}
            </div>
            <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Escalas Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : escalas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma escala registrada para este mês.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Dia</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalas.map((escala) => (
                  <TableRow key={escala.id}>
                    <TableCell className="font-medium">{escala.dia}</TableCell>
                    <TableCell>{escala.funcionario_nome}</TableCell>
                    <TableCell>
                      <Badge className={turnoColors[escala.turno]} variant="outline">
                        {turnos.find(t => t.value === escala.turno)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {escala.observacao || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { setSelectedEscala(escala); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Escala</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="funcionario_nome">Nome do Funcionário</Label>
              <Input
                id="funcionario_nome"
                value={formData.funcionario_nome}
                onChange={(e) => setFormData({ ...formData, funcionario_nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dia">Dia</Label>
                <Select
                  value={String(formData.dia)}
                  onValueChange={(value) => setFormData({ ...formData, dia: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="turno">Turno</Label>
                <Select
                  value={formData.turno}
                  onValueChange={(value) => setFormData({ ...formData, turno: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {turnos.map((turno) => (
                      <SelectItem key={turno.value} value={turno.value}>
                        {turno.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <Input
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Observações adicionais"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEscala} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a escala de {selectedEscala?.funcionario_nome} 
              para o dia {selectedEscala?.dia}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEscala}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
