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
import { Plus, HardHat, Trash2, Edit, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface EPI {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  tipo_epi: string;
  ca_numero: string | null;
  quantidade: number;
  data_entrega: string;
  data_validade: string | null;
  status: string;
  observacao: string | null;
  registrado_por_nome: string;
  created_at: string;
}

interface Usuario {
  user_id: string;
  full_name: string;
}

const TIPOS_EPI = [
  "Capacete",
  "Óculos de Proteção",
  "Protetor Auricular",
  "Luvas",
  "Máscara Respiratória",
  "Avental",
  "Bota de Segurança",
  "Cinto de Segurança",
  "Protetor Facial",
  "Macacão",
  "Colete Refletivo",
  "Outro"
];

export function EPIsControl() {
  const [epis, setEpis] = useState<EPI[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    usuario_id: "",
    tipo_epi: "",
    ca_numero: "",
    quantidade: 1,
    data_entrega: format(new Date(), "yyyy-MM-dd"),
    data_validade: "",
    status: "em_uso",
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

      const { data: episData, error } = await supabase
        .from("epis_seguranca")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEpis(episData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os EPIs.",
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
        tipo_epi: formData.tipo_epi,
        ca_numero: formData.ca_numero || null,
        quantidade: formData.quantidade,
        data_entrega: formData.data_entrega,
        data_validade: formData.data_validade || null,
        status: formData.status,
        observacao: formData.observacao || null,
        registrado_por: currentUserId,
        registrado_por_nome: currentUserName
      };

      if (editingId) {
        const { error } = await supabase
          .from("epis_seguranca")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Sucesso", description: "EPI atualizado!" });
      } else {
        const { error } = await supabase
          .from("epis_seguranca")
          .insert(payload);
        if (error) throw error;
        toast({ title: "Sucesso", description: "EPI registrado!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o EPI.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (epi: EPI) => {
    setFormData({
      usuario_id: epi.usuario_id,
      tipo_epi: epi.tipo_epi,
      ca_numero: epi.ca_numero || "",
      quantidade: epi.quantidade,
      data_entrega: epi.data_entrega,
      data_validade: epi.data_validade || "",
      status: epi.status,
      observacao: epi.observacao || ""
    });
    setEditingId(epi.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este registro?")) return;
    
    try {
      const { error } = await supabase
        .from("epis_seguranca")
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
      tipo_epi: "",
      ca_numero: "",
      quantidade: 1,
      data_entrega: format(new Date(), "yyyy-MM-dd"),
      data_validade: "",
      status: "em_uso",
      observacao: ""
    });
    setEditingId(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      em_uso: "default",
      devolvido: "secondary",
      vencido: "destructive",
      danificado: "outline"
    };
    const labels: Record<string, string> = {
      em_uso: "Em Uso",
      devolvido: "Devolvido",
      vencido: "Vencido",
      danificado: "Danificado"
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getValidadeBadge = (dataValidade: string | null) => {
    if (!dataValidade) return null;
    const dias = differenceInDays(new Date(dataValidade), new Date());
    if (dias < 0) {
      return <Badge variant="destructive" className="ml-2">Vencido</Badge>;
    }
    if (dias <= 30) {
      return <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600">
        <AlertTriangle className="h-3 w-3 mr-1" />
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
          <HardHat className="h-5 w-5" />
          Controle de EPIs
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
                {editingId ? "Editar EPI" : "Registrar EPI"}
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
                  <Label>Tipo de EPI</Label>
                  <Select
                    value={formData.tipo_epi}
                    onValueChange={(v) => setFormData({ ...formData, tipo_epi: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_EPI.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número do CA</Label>
                  <Input
                    value={formData.ca_numero}
                    onChange={(e) => setFormData({ ...formData, ca_numero: e.target.value })}
                    placeholder="Certificado de Aprovação"
                  />
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
                      <SelectItem value="em_uso">Em Uso</SelectItem>
                      <SelectItem value="devolvido">Devolvido</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                      <SelectItem value="danificado">Danificado</SelectItem>
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
                  <Label>Data de Validade</Label>
                  <Input
                    type="date"
                    value={formData.data_validade}
                    onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
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
        {epis.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum EPI registrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CA</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {epis.map((epi) => (
                  <TableRow key={epi.id}>
                    <TableCell className="font-medium">{epi.usuario_nome}</TableCell>
                    <TableCell>{epi.tipo_epi}</TableCell>
                    <TableCell>{epi.ca_numero || "-"}</TableCell>
                    <TableCell>{epi.quantidade}</TableCell>
                    <TableCell>{format(new Date(epi.data_entrega), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      {epi.data_validade ? format(new Date(epi.data_validade), "dd/MM/yyyy") : "-"}
                      {getValidadeBadge(epi.data_validade)}
                    </TableCell>
                    <TableCell>{getStatusBadge(epi.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(epi)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(epi.id)}>
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
