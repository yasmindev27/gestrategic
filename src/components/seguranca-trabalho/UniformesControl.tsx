import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shirt, Plus, Trash2, Edit, AlertCircle, Package, CheckCircle2, Clock, Warehouse } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SectionHeader, ActionButton } from "@/components/ui/action-buttons";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { InventarioModule } from "@/components/modules/InventarioModule";

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
  cargo: string | null;
  setor: string | null;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [buscaColab, setBuscaColab] = useState("");
  const [showColabList, setShowColabList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [movResumo, setMovResumo] = useState<{ usuario_nome: string; responsavel_entrega: string; produto: string; entradas: number; saidas: number }[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    usuario_id: "",
    usuario_nome: "",
    tipo_uniforme: "",
    tamanho: "",
    quantidade: 1,
    data_entrega: format(new Date(), "yyyy-MM-dd"),
    data_devolucao: "",
    status: "entregue",
    observacao: "",
    cargo: "",
    setor: "",
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
        if (profile) setCurrentUserName(profile.full_name);
      }

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, cargo, setor")
        .order("full_name");
      if (profilesData) setUsuarios(profilesData);

      const { data: uniformesData, error } = await supabase
        .from("uniformes_seguranca")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUniformes(uniformesData || []);

      // Build resumo from movimentacoes_estoque for seguranca_uniformes
      const { data: movData } = await supabase
        .from("movimentacoes_estoque")
        .select("*, produtos(nome)")
        .eq("setor", "seguranca_uniformes");

      if (movData && movData.length > 0) {
        // Resolve usuario_id -> profile name (responsável pela entrega)
        const userIds = [...new Set(movData.map(m => m.usuario_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

        const resumoMap = new Map<string, { usuario_nome: string; responsavel_entrega: string; produto: string; entradas: number; saidas: number }>();
        movData.forEach(m => {
          // Extract collaborator name from observacao: [COLAB:Name] or fallback to observacao text
          let colabName = "-";
          const colabMatch = (m.observacao || "").match(/\[COLAB:(.+?)\]/);
          if (colabMatch) {
            colabName = colabMatch[1];
          } else if (m.observacao && m.observacao.trim()) {
            colabName = m.observacao.trim();
          }

          const responsavel = nameMap.get(m.usuario_id) || "-";
          const produto = (m.produtos as any)?.nome || "-";
          const key = `${colabName}_${m.produto_id}`;
          const existing = resumoMap.get(key) || {
            usuario_nome: colabName,
            responsavel_entrega: responsavel,
            produto,
            entradas: 0,
            saidas: 0,
          };
          if (m.tipo === 'entrada') existing.entradas += m.quantidade;
          else existing.saidas += m.quantidade;
          existing.responsavel_entrega = responsavel;
          resumoMap.set(key, existing);
        });
        setMovResumo(Array.from(resumoMap.values()).sort((a, b) => a.usuario_nome.localeCompare(b.usuario_nome)));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os uniformes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.usuario_id || !formData.tipo_uniforme || !formData.tamanho) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        usuario_id: formData.usuario_id,
        usuario_nome: formData.usuario_nome,
        tipo_uniforme: formData.tipo_uniforme,
        tamanho: formData.tamanho,
        quantidade: formData.quantidade,
        data_entrega: formData.data_entrega,
        data_devolucao: formData.data_devolucao || null,
        status: formData.status,
        observacao: formData.observacao || null,
        registrado_por: currentUserId,
        registrado_por_nome: currentUserName,
      };

      if (editingId) {
        const { error } = await supabase.from("uniformes_seguranca").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Uniforme atualizado com sucesso." });
      } else {
        const { error } = await supabase.from("uniformes_seguranca").insert(payload);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Uniforme registrado com sucesso." });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro", description: "Não foi possível salvar o uniforme.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (uniforme: Uniforme) => {
    const user = usuarios.find(u => u.user_id === uniforme.usuario_id);
    setFormData({
      usuario_id: uniforme.usuario_id,
      usuario_nome: uniforme.usuario_nome,
      tipo_uniforme: uniforme.tipo_uniforme,
      tamanho: uniforme.tamanho,
      quantidade: uniforme.quantidade,
      data_entrega: uniforme.data_entrega,
      data_devolucao: uniforme.data_devolucao || "",
      status: uniforme.status,
      observacao: uniforme.observacao || "",
      cargo: user?.cargo || "",
      setor: user?.setor || "",
    });
    setBuscaColab(uniforme.usuario_nome);
    setEditingId(uniforme.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este registro?")) return;
    try {
      const { error } = await supabase.from("uniformes_seguranca").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Registro excluído!" });
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      usuario_id: "",
      usuario_nome: "",
      tipo_uniforme: "",
      tamanho: "",
      quantidade: 1,
      data_entrega: format(new Date(), "yyyy-MM-dd"),
      data_devolucao: "",
      status: "entregue",
      observacao: "",
      cargo: "",
      setor: "",
    });
    setBuscaColab("");
    setEditingId(null);
  };

  const handleSelectColab = (user: Usuario) => {
    setFormData({
      ...formData,
      usuario_id: user.user_id,
      usuario_nome: user.full_name,
      cargo: user.cargo || "",
      setor: user.setor || "",
    });
    setBuscaColab(user.full_name);
    setShowColabList(false);
  };

  const colabsFiltrados = usuarios.filter(u =>
    u.full_name.toLowerCase().includes(buscaColab.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      entregue: { variant: "default", label: "Entregue" },
      devolvido: { variant: "secondary", label: "Devolvido" },
      extraviado: { variant: "destructive", label: "Extraviado" },
      desgastado: { variant: "outline", label: "Desgastado" },
    };
    const s = config[status] || { variant: "default", label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const filteredUniformes = uniformes.filter(u =>
    u.usuario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.tipo_uniforme.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalEntregues = uniformes.filter(u => u.status === "entregue").length;
  const totalDevolvidos = uniformes.filter(u => u.status === "devolvido").length;
  const totalExtraviados = uniformes.filter(u => u.status === "extraviado" || u.status === "desgastado").length;
  const totalRegistros = uniformes.length;

  if (loading) {
    return <LoadingState message="Carregando uniformes..." />;
  }

  return (
    <div className="space-y-6">

      <Tabs defaultValue="inventario">
        <TabsList>
          <TabsTrigger value="inventario">
            <Warehouse className="h-4 w-4 mr-2" />
            Inventário
          </TabsTrigger>
          <TabsTrigger value="resumo">
            <Package className="h-4 w-4 mr-2" />
            Resumo por Colaborador
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventario" className="mt-4">
          <InventarioModule setor="seguranca_uniformes" />
        </TabsContent>


        <TabsContent value="resumo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Colaborador</CardTitle>
              <CardDescription>Movimentações de uniformes por colaborador e tipo de produto</CardDescription>
            </CardHeader>
            <CardContent>
              {movResumo.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Responsável pela Entrega</TableHead>
                        <TableHead>Produto / Uniforme</TableHead>
                        <TableHead className="text-center">Entradas</TableHead>
                        <TableHead className="text-center">Saídas</TableHead>
                        <TableHead className="text-center">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movResumo.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.usuario_nome}</TableCell>
                          <TableCell>{r.responsavel_entrega}</TableCell>
                          <TableCell>{r.produto}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default">{r.entradas}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">{r.saidas}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{r.entradas - r.saidas}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Registro */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Registro" : "Novo Registro de Uniforme"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize as informações do registro." : "Registre a entrega de uniforme para um colaborador."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Busca de colaborador */}
            <div className="space-y-2 relative">
              <Label>Colaborador *</Label>
              <Input
                value={buscaColab}
                onChange={(e) => {
                  setBuscaColab(e.target.value);
                  setShowColabList(true);
                  if (!e.target.value) {
                    setFormData({ ...formData, usuario_id: "", usuario_nome: "", cargo: "", setor: "" });
                  }
                }}
                onFocus={() => buscaColab && setShowColabList(true)}
                placeholder="Digite o nome do colaborador..."
              />
              {showColabList && buscaColab.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {colabsFiltrados.slice(0, 10).map((u) => (
                    <button
                      key={u.user_id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between"
                      onClick={() => handleSelectColab(u)}
                    >
                      <span className="font-medium">{u.full_name}</span>
                      <span className="text-muted-foreground text-xs">{u.cargo || ""}</span>
                    </button>
                  ))}
                  {colabsFiltrados.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum colaborador encontrado</div>
                  )}
                </div>
              )}
            </div>

            {/* Cargo e Setor readonly */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={formData.cargo} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input value={formData.setor} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Uniforme *</Label>
                <Select
                  value={formData.tipo_uniforme}
                  onValueChange={(v) => setFormData({ ...formData, tipo_uniforme: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_UNIFORME.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tamanho *</Label>
                <Select
                  value={formData.tamanho}
                  onValueChange={(v) => setFormData({ ...formData, tamanho: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TAMANHOS.map((tam) => (
                      <SelectItem key={tam} value={tam}>{tam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                <Label>Data Entrega *</Label>
                <Input
                  type="date"
                  value={formData.data_entrega}
                  onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entregue">Entregue</SelectItem>
                    <SelectItem value="devolvido">Devolvido</SelectItem>
                    <SelectItem value="extraviado">Extraviado</SelectItem>
                    <SelectItem value="desgastado">Desgastado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.status === "devolvido" && (
              <div className="space-y-2">
                <Label>Data de Devolução</Label>
                <Input
                  type="date"
                  value={formData.data_devolucao}
                  onChange={(e) => setFormData({ ...formData, data_devolucao: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Observações adicionais..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoadingSpinner className="mr-2" />}
                {editingId ? "Atualizar" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
