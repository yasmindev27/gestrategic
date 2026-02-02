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
import { useToast } from "@/hooks/use-toast";
import { Plus, Syringe, Trash2, Edit, AlertTriangle, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Vacina {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  tipo_vacina: string;
  dose: string | null;
  data_aplicacao: string;
  data_proxima_dose: string | null;
  lote: string | null;
  local_aplicacao: string | null;
  status: string;
  observacao: string | null;
  registrado_por_nome: string;
  created_at: string;
}

interface Usuario {
  user_id: string;
  full_name: string;
}

const TIPOS_VACINA = [
  "Hepatite B",
  "Tétano",
  "Difteria",
  "Influenza (Gripe)",
  "COVID-19",
  "Febre Amarela",
  "Sarampo",
  "Rubéola",
  "Tríplice Viral",
  "Varicela",
  "Meningite",
  "Outra"
];

const DOSES = [
  "Dose Única",
  "1ª Dose",
  "2ª Dose",
  "3ª Dose",
  "Reforço",
  "Reforço Anual"
];

export function VacinasControl() {
  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    usuario_id: "",
    tipo_vacina: "",
    dose: "",
    data_aplicacao: format(new Date(), "yyyy-MM-dd"),
    data_proxima_dose: "",
    lote: "",
    local_aplicacao: "",
    status: "aplicada",
    observacao: ""
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

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      
      if (profilesData) {
        setUsuarios(profilesData);
      }

      const { data: vacinasData, error } = await supabase
        .from("vacinas_seguranca")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVacinas(vacinasData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as vacinas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedUser = usuarios.find(u => u.user_id === formData.usuario_id);
    if (!selectedUser || !currentUserId) {
      toast({
        title: "Erro",
        description: "Selecione um colaborador.",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        usuario_id: formData.usuario_id,
        usuario_nome: selectedUser.full_name,
        tipo_vacina: formData.tipo_vacina,
        dose: formData.dose || null,
        data_aplicacao: formData.data_aplicacao,
        data_proxima_dose: formData.data_proxima_dose || null,
        lote: formData.lote || null,
        local_aplicacao: formData.local_aplicacao || null,
        status: formData.status,
        observacao: formData.observacao || null,
        registrado_por: currentUserId,
        registrado_por_nome: currentUserName
      };

      if (editingId) {
        const { error } = await supabase
          .from("vacinas_seguranca")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Vacina atualizada!" });
      } else {
        const { error } = await supabase
          .from("vacinas_seguranca")
          .insert(payload);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Vacina registrada!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a vacina.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (vacina: Vacina) => {
    setFormData({
      usuario_id: vacina.usuario_id,
      tipo_vacina: vacina.tipo_vacina,
      dose: vacina.dose || "",
      data_aplicacao: vacina.data_aplicacao,
      data_proxima_dose: vacina.data_proxima_dose || "",
      lote: vacina.lote || "",
      local_aplicacao: vacina.local_aplicacao || "",
      status: vacina.status,
      observacao: vacina.observacao || ""
    });
    setEditingId(vacina.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este registro?")) return;
    
    try {
      const { error } = await supabase
        .from("vacinas_seguranca")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Registro excluído!" });
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

  const resetForm = () => {
    setFormData({
      usuario_id: "",
      tipo_vacina: "",
      dose: "",
      data_aplicacao: format(new Date(), "yyyy-MM-dd"),
      data_proxima_dose: "",
      lote: "",
      local_aplicacao: "",
      status: "aplicada",
      observacao: ""
    });
    setEditingId(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      aplicada: "default",
      pendente: "outline",
      atrasada: "destructive"
    };
    const labels: Record<string, string> = {
      aplicada: "Aplicada",
      pendente: "Pendente",
      atrasada: "Atrasada"
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getProximaDoseBadge = (dataProxima: string | null) => {
    if (!dataProxima) return null;
    const dias = differenceInDays(new Date(dataProxima), new Date());
    if (dias < 0) {
      return <Badge variant="destructive" className="ml-2">Atrasada</Badge>;
    }
    if (dias <= 30) {
      return <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600">
        <Calendar className="h-3 w-3 mr-1" />
        {dias}d
      </Badge>;
    }
    return null;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Syringe className="h-5 w-5" />
          Controle de Vacinação
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Vacina" : "Registrar Vacina"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select
                  value={formData.usuario_id}
                  onValueChange={(v) => setFormData({ ...formData, usuario_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Vacina</Label>
                  <Select
                    value={formData.tipo_vacina}
                    onValueChange={(v) => setFormData({ ...formData, tipo_vacina: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_VACINA.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dose</Label>
                  <Select
                    value={formData.dose}
                    onValueChange={(v) => setFormData({ ...formData, dose: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOSES.map((dose) => (
                        <SelectItem key={dose} value={dose}>{dose}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Aplicação</Label>
                  <Input
                    type="date"
                    value={formData.data_aplicacao}
                    onChange={(e) => setFormData({ ...formData, data_aplicacao: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Próxima Dose</Label>
                  <Input
                    type="date"
                    value={formData.data_proxima_dose}
                    onChange={(e) => setFormData({ ...formData, data_proxima_dose: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lote</Label>
                  <Input
                    value={formData.lote}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                    placeholder="Número do lote"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Local de Aplicação</Label>
                  <Input
                    value={formData.local_aplicacao}
                    onChange={(e) => setFormData({ ...formData, local_aplicacao: e.target.value })}
                    placeholder="Ex: Posto de Saúde"
                  />
                </div>
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
                    <SelectItem value="aplicada">Aplicada</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="atrasada">Atrasada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Observações adicionais..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? "Atualizar" : "Registrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {vacinas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma vacina registrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Vacina</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Aplicação</TableHead>
                  <TableHead>Próxima Dose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacinas.map((vacina) => (
                  <TableRow key={vacina.id}>
                    <TableCell className="font-medium">{vacina.usuario_nome}</TableCell>
                    <TableCell>{vacina.tipo_vacina}</TableCell>
                    <TableCell>{vacina.dose || "-"}</TableCell>
                    <TableCell>{format(new Date(vacina.data_aplicacao), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      {vacina.data_proxima_dose ? format(new Date(vacina.data_proxima_dose), "dd/MM/yyyy") : "-"}
                      {getProximaDoseBadge(vacina.data_proxima_dose)}
                    </TableCell>
                    <TableCell>{getStatusBadge(vacina.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(vacina)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(vacina.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
