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
import { Plus, Shirt, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";

interface Uniforme {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  tipo_uniforme: string;
  tamanho: string;
  quantidade: number;
  data_entrega: string;
  data_devolucao: string | null;
  status: string;
  observacao: string | null;
  registrado_por_nome: string;
  created_at: string;
}

interface Usuario {
  user_id: string;
  full_name: string;
}

const TIPOS_UNIFORME = [
  "Camisa",
  "Calça",
  "Jaleco",
  "Sapato/Bota",
  "Avental",
  "Touca",
  "Máscara",
  "Outro"
];

const TAMANHOS = ["PP", "P", "M", "G", "GG", "XG", "34", "36", "38", "40", "42", "44", "46"];

export function UniformesControl() {
  const [uniformes, setUniformes] = useState<Uniforme[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    usuario_id: "",
    tipo_uniforme: "",
    tamanho: "",
    quantidade: 1,
    data_entrega: format(new Date(), "yyyy-MM-dd"),
    data_devolucao: "",
    status: "entregue",
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

      const { data: uniformesData, error } = await supabase
        .from("uniformes_seguranca")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUniformes(uniformesData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os uniformes.",
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
        tipo_uniforme: formData.tipo_uniforme,
        tamanho: formData.tamanho,
        quantidade: formData.quantidade,
        data_entrega: formData.data_entrega,
        data_devolucao: formData.data_devolucao || null,
        status: formData.status,
        observacao: formData.observacao || null,
        registrado_por: currentUserId,
        registrado_por_nome: currentUserName
      };

      if (editingId) {
        const { error } = await supabase
          .from("uniformes_seguranca")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Uniforme atualizado!" });
      } else {
        const { error } = await supabase
          .from("uniformes_seguranca")
          .insert(payload);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Uniforme registrado!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o uniforme.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (uniforme: Uniforme) => {
    setFormData({
      usuario_id: uniforme.usuario_id,
      tipo_uniforme: uniforme.tipo_uniforme,
      tamanho: uniforme.tamanho,
      quantidade: uniforme.quantidade,
      data_entrega: uniforme.data_entrega,
      data_devolucao: uniforme.data_devolucao || "",
      status: uniforme.status,
      observacao: uniforme.observacao || ""
    });
    setEditingId(uniforme.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este registro?")) return;
    
    try {
      const { error } = await supabase
        .from("uniformes_seguranca")
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
      tipo_uniforme: "",
      tamanho: "",
      quantidade: 1,
      data_entrega: format(new Date(), "yyyy-MM-dd"),
      data_devolucao: "",
      status: "entregue",
      observacao: ""
    });
    setEditingId(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      entregue: "default",
      devolvido: "secondary",
      extraviado: "destructive",
      desgastado: "outline"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shirt className="h-5 w-5" />
          Controle de Uniformes
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
                {editingId ? "Editar Uniforme" : "Registrar Uniforme"}
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
                  <Label>Tipo de Uniforme</Label>
                  <Select
                    value={formData.tipo_uniforme}
                    onValueChange={(v) => setFormData({ ...formData, tipo_uniforme: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_UNIFORME.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho</Label>
                  <Select
                    value={formData.tamanho}
                    onValueChange={(v) => setFormData({ ...formData, tamanho: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAMANHOS.map((tam) => (
                        <SelectItem key={tam} value={tam}>{tam}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })}
                  />
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
                      <SelectItem value="entregue">Entregue</SelectItem>
                      <SelectItem value="devolvido">Devolvido</SelectItem>
                      <SelectItem value="extraviado">Extraviado</SelectItem>
                      <SelectItem value="desgastado">Desgastado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Entrega</Label>
                  <Input
                    type="date"
                    value={formData.data_entrega}
                    onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Devolução</Label>
                  <Input
                    type="date"
                    value={formData.data_devolucao}
                    onChange={(e) => setFormData({ ...formData, data_devolucao: e.target.value })}
                  />
                </div>
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
        {uniformes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum uniforme registrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Data Entrega</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uniformes.map((uniforme) => (
                  <TableRow key={uniforme.id}>
                    <TableCell className="font-medium">{uniforme.usuario_nome}</TableCell>
                    <TableCell>{uniforme.tipo_uniforme}</TableCell>
                    <TableCell>{uniforme.tamanho}</TableCell>
                    <TableCell>{uniforme.quantidade}</TableCell>
                    <TableCell>{format(new Date(uniforme.data_entrega), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{getStatusBadge(uniforme.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(uniforme)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(uniforme.id)}>
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
