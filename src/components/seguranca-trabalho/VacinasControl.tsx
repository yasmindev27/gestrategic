import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Syringe, Plus, Trash2, Edit, AlertCircle, Calendar,
  CheckCircle2, Clock, ClipboardList, History, Users,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { SectionHeader, ActionButton } from "@/components/ui/action-buttons";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  cargo: string | null;
  setor: string | null;
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
];

const DOSES = [
  "Dose Única",
  "1ª Dose",
  "2ª Dose",
  "3ª Dose",
  "Reforço",
  "Reforço Anual",
];

interface CartaoVacinaItem {
  tipo_vacina: string;
  ativo: boolean;
  dose: string;
  data_aplicacao: string;
  data_proxima_dose: string;
  lote: string;
  local_aplicacao: string;
  status: string;
}

const createEmptyCartao = (): CartaoVacinaItem[] =>
  TIPOS_VACINA.map((tipo) => ({
    tipo_vacina: tipo,
    ativo: false,
    dose: "",
    data_aplicacao: format(new Date(), "yyyy-MM-dd"),
    data_proxima_dose: "",
    lote: "",
    local_aplicacao: "",
    status: "aplicada",
  }));

// ---- Collapsed collaborator list with expandable vaccine table ----
function ColaboradorVacinaList({
  vacinas,
  searchTerm,
  getStatusBadge,
  onEdit,
  onDelete,
}: {
  vacinas: Vacina[];
  searchTerm: string;
  getStatusBadge: (status: string) => React.ReactNode;
  onEdit: (v: Vacina) => void;
  onDelete: (id: string) => void;
}) {
  const [expandedColab, setExpandedColab] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Vacina[]> = {};
    vacinas.forEach((v) => {
      if (!map[v.usuario_nome]) map[v.usuario_nome] = [];
      map[v.usuario_nome].push(v);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([nome]) => nome.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [vacinas, searchTerm]);

  if (grouped.length === 0) {
    return <EmptyState icon={Users} title="Nenhum colaborador encontrado" description="Registre vacinas para visualizar aqui." />;
  }

  return (
    <div className="space-y-1">
      {grouped.map(([nome, vacinasColab]) => {
        const aplicadas = vacinasColab.filter((v) => v.status === "aplicada").length;
        const pendentes = vacinasColab.filter((v) => v.status === "pendente").length;
        const isOpen = expandedColab === nome;

        return (
          <div key={nome} className="border rounded-lg overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer select-none"
              onClick={(e) => { e.stopPropagation(); setExpandedColab(isOpen ? null : nome); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedColab(isOpen ? null : nome); } }}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{nome}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">{aplicadas} aplicada(s)</Badge>
                {pendentes > 0 && <Badge variant="outline" className="text-xs">{pendentes} pendente(s)</Badge>}
                <span className="text-muted-foreground text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {isOpen && (
              <div className="border-t px-3 pb-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vacina</TableHead>
                      <TableHead>Dose</TableHead>
                      <TableHead>Aplicação</TableHead>
                      <TableHead>Próxima Dose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registrado por</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vacinasColab.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.tipo_vacina}</TableCell>
                        <TableCell>{v.dose || "-"}</TableCell>
                        <TableCell>{format(new Date(v.data_aplicacao), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{v.data_proxima_dose ? format(new Date(v.data_proxima_dose), "dd/MM/yyyy") : "-"}</TableCell>
                        <TableCell>{getStatusBadge(v.status)}</TableCell>
                        <TableCell className="text-xs">{v.registrado_por_nome}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(v)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(v.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function VacinasControl() {
  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cartaoDialogOpen, setCartaoDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Single record form
  const [formData, setFormData] = useState({
    usuario_id: "",
    usuario_nome: "",
    tipo_vacina: "",
    dose: "",
    data_aplicacao: format(new Date(), "yyyy-MM-dd"),
    data_proxima_dose: "",
    lote: "",
    local_aplicacao: "",
    status: "aplicada",
    observacao: "",
  });

  // Bulk card
  const [cartaoColab, setCartaoColab] = useState({ user_id: "", full_name: "", cargo: "", setor: "" });
  const [buscaCartao, setBuscaCartao] = useState("");
  const [showCartaoList, setShowCartaoList] = useState(false);
  const [cartaoItens, setCartaoItens] = useState<CartaoVacinaItem[]>(createEmptyCartao());

  // Single record search
  const [buscaColab, setBuscaColab] = useState("");
  const [showColabList, setShowColabList] = useState(false);

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

      const { data: vacinasData, error } = await supabase
        .from("vacinas_seguranca")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVacinas(vacinasData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro", description: "Não foi possível carregar as vacinas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ---- Single record handlers ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.usuario_id || !formData.tipo_vacina) {
      toast({ title: "Erro", description: "Preencha colaborador e tipo de vacina.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        usuario_id: formData.usuario_id,
        usuario_nome: formData.usuario_nome,
        tipo_vacina: formData.tipo_vacina,
        dose: formData.dose || null,
        data_aplicacao: formData.data_aplicacao,
        data_proxima_dose: formData.data_proxima_dose || null,
        lote: formData.lote || null,
        local_aplicacao: formData.local_aplicacao || null,
        status: formData.status,
        observacao: formData.observacao || null,
        registrado_por: currentUserId,
        registrado_por_nome: currentUserName,
      };

      if (editingId) {
        const { error } = await supabase.from("vacinas_seguranca").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Vacina atualizada!" });
      } else {
        const { error } = await supabase.from("vacinas_seguranca").insert(payload);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Vacina registrada!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (vacina: Vacina) => {
    setFormData({
      usuario_id: vacina.usuario_id,
      usuario_nome: vacina.usuario_nome,
      tipo_vacina: vacina.tipo_vacina,
      dose: vacina.dose || "",
      data_aplicacao: vacina.data_aplicacao,
      data_proxima_dose: vacina.data_proxima_dose || "",
      lote: vacina.lote || "",
      local_aplicacao: vacina.local_aplicacao || "",
      status: vacina.status,
      observacao: vacina.observacao || "",
    });
    setBuscaColab(vacina.usuario_nome);
    setEditingId(vacina.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este registro?")) return;
    try {
      const { error } = await supabase.from("vacinas_seguranca").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Registro excluído!" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      usuario_id: "", usuario_nome: "", tipo_vacina: "", dose: "",
      data_aplicacao: format(new Date(), "yyyy-MM-dd"), data_proxima_dose: "",
      lote: "", local_aplicacao: "", status: "aplicada", observacao: "",
    });
    setBuscaColab("");
    setEditingId(null);
  };

  // ---- Bulk card handlers ----
  const openCartaoDialog = () => {
    setCartaoColab({ user_id: "", full_name: "", cargo: "", setor: "" });
    setBuscaCartao("");
    setCartaoItens(createEmptyCartao());
    setCartaoDialogOpen(true);
  };

  const selectCartaoColab = (user: Usuario) => {
    setCartaoColab({
      user_id: user.user_id,
      full_name: user.full_name,
      cargo: user.cargo || "",
      setor: user.setor || "",
    });
    setBuscaCartao(user.full_name);
    setShowCartaoList(false);

    // Pre-fill with existing records for this user
    const userVacinas = vacinas.filter(v => v.usuario_id === user.user_id);
    const newCartao = createEmptyCartao();
    for (const item of newCartao) {
      const existing = userVacinas.find(v => v.tipo_vacina === item.tipo_vacina);
      if (existing) {
        item.ativo = true;
        item.dose = existing.dose || "";
        item.data_aplicacao = existing.data_aplicacao;
        item.data_proxima_dose = existing.data_proxima_dose || "";
        item.lote = existing.lote || "";
        item.local_aplicacao = existing.local_aplicacao || "";
        item.status = existing.status;
      }
    }
    setCartaoItens(newCartao);
  };

  const updateCartaoItem = (index: number, field: keyof CartaoVacinaItem, value: string | boolean) => {
    setCartaoItens((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveCartao = async () => {
    if (!cartaoColab.user_id) {
      toast({ title: "Erro", description: "Selecione um colaborador.", variant: "destructive" });
      return;
    }

    const ativos = cartaoItens.filter((item) => item.ativo);
    if (ativos.length === 0) {
      toast({ title: "Erro", description: "Marque ao menos uma vacina.", variant: "destructive" });
      return;
    }

    // Validate: all active items must have data_aplicacao
    const invalid = ativos.find((item) => !item.data_aplicacao);
    if (invalid) {
      toast({ title: "Erro", description: `Preencha a data de aplicação de "${invalid.tipo_vacina}".`, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Delete existing records for this user's vaccine types being updated
      const tiposAtivos = ativos.map(a => a.tipo_vacina);
      const { error: delError } = await supabase
        .from("vacinas_seguranca")
        .delete()
        .eq("usuario_id", cartaoColab.user_id)
        .in("tipo_vacina", tiposAtivos);

      if (delError) throw delError;

      // Insert new records
      const payloads = ativos.map((item) => ({
        usuario_id: cartaoColab.user_id,
        usuario_nome: cartaoColab.full_name,
        tipo_vacina: item.tipo_vacina,
        dose: item.dose || null,
        data_aplicacao: item.data_aplicacao,
        data_proxima_dose: item.data_proxima_dose || null,
        lote: item.lote || null,
        local_aplicacao: item.local_aplicacao || null,
        status: item.status,
        observacao: null,
        registrado_por: currentUserId,
        registrado_por_nome: currentUserName,
      }));

      const { error: insError } = await supabase.from("vacinas_seguranca").insert(payloads);
      if (insError) throw insError;

      toast({ title: "Sucesso", description: `${ativos.length} vacina(s) registrada(s) para ${cartaoColab.full_name}.` });
      setCartaoDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar cartão:", error);
      toast({ title: "Erro", description: "Não foi possível salvar o cartão de vacinação.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Helpers ----
  const handleSelectColab = (user: Usuario) => {
    setFormData({ ...formData, usuario_id: user.user_id, usuario_nome: user.full_name });
    setBuscaColab(user.full_name);
    setShowColabList(false);
  };

  const colabsFiltrados = (busca: string) =>
    usuarios.filter((u) => u.full_name.toLowerCase().includes(busca.toLowerCase()));

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      aplicada: { variant: "default", label: "Aplicada" },
      pendente: { variant: "outline", label: "Pendente" },
      atrasada: { variant: "destructive", label: "Atrasada" },
    };
    const s = config[status] || { variant: "default", label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getProximaDoseBadge = (dataProxima: string | null) => {
    if (!dataProxima) return null;
    const dias = differenceInDays(new Date(dataProxima), new Date());
    if (dias < 0) return <Badge variant="destructive" className="ml-1">Atrasada</Badge>;
    if (dias <= 30) return (
      <Badge variant="outline" className="ml-1 border-yellow-500 text-yellow-600">
        <Calendar className="h-3 w-3 mr-1" />{dias}d
      </Badge>
    );
    return null;
  };

  const filteredVacinas = vacinas.filter(
    (v) =>
      v.usuario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.tipo_vacina.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalAplicadas = vacinas.filter((v) => v.status === "aplicada").length;
  const totalPendentes = vacinas.filter((v) => v.status === "pendente").length;
  const totalAtrasadas = vacinas.filter(
    (v) => v.status === "atrasada" || (v.data_proxima_dose && differenceInDays(new Date(v.data_proxima_dose), new Date()) < 0)
  ).length;
  const colabsVacinados = new Set(vacinas.map((v) => v.usuario_id)).size;

  if (loading) return <LoadingState message="Carregando vacinação..." />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Controle de Vacinação" description="Gestão do cartão de vacinação dos colaboradores">
        <div className="flex gap-2">
          <ActionButton type="add" label="Registro Individual" onClick={() => { resetForm(); setDialogOpen(true); }} />
          <Button onClick={openCartaoDialog} variant="outline" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Cartão de Vacinação
          </Button>
        </div>
      </SectionHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Vacinas Aplicadas" value={totalAplicadas} icon={CheckCircle2} variant="success" />
        <StatCard title="Pendentes" value={totalPendentes} icon={Clock} variant="warning" />
        <StatCard title="Atrasadas" value={totalAtrasadas} icon={AlertCircle} variant="warning" />
        <StatCard title="Colaboradores Vacinados" value={colabsVacinados} icon={Users} variant="primary" />
      </div>

      <Tabs defaultValue="registros">
        <TabsList>
          <TabsTrigger value="registros"><Syringe className="h-4 w-4 mr-2" />Registros</TabsTrigger>
          <TabsTrigger value="cartoes"><ClipboardList className="h-4 w-4 mr-2" />Por Colaborador</TabsTrigger>
        </TabsList>

        {/* Tab: Registros */}
        <TabsContent value="registros" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por colaborador ou vacina..." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registros de Vacinação</CardTitle>
              <CardDescription>{filteredVacinas.length} registro(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredVacinas.length === 0 ? (
                <EmptyState icon={Syringe} title="Nenhuma vacina registrada" description="Comece registrando vacinas individualmente ou via Cartão de Vacinação" />
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
                        <TableHead>Registrado por</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVacinas.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.usuario_nome}</TableCell>
                          <TableCell>{v.tipo_vacina}</TableCell>
                          <TableCell>{v.dose || "-"}</TableCell>
                          <TableCell>{format(new Date(v.data_aplicacao), "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            {v.data_proxima_dose ? format(new Date(v.data_proxima_dose), "dd/MM/yyyy") : "-"}
                            {getProximaDoseBadge(v.data_proxima_dose)}
                          </TableCell>
                          <TableCell>{getStatusBadge(v.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{v.registrado_por_nome}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => handleEdit(v)}><Edit className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
        </TabsContent>

        {/* Tab: Por Colaborador */}
        <TabsContent value="cartoes" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar colaborador..." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cartão de Vacinação por Colaborador</CardTitle>
              <CardDescription>Clique no nome para ver todas as vacinas</CardDescription>
            </CardHeader>
            <CardContent>
              <ColaboradorVacinaList vacinas={vacinas} searchTerm={searchTerm} getStatusBadge={getStatusBadge} onEdit={handleEdit} onDelete={handleDelete} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Registro Individual */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Vacina" : "Registrar Vacina Individual"}</DialogTitle>
            <DialogDescription>{editingId ? "Atualize os dados da vacina." : "Registre uma vacina para um colaborador."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2 relative">
              <Label>Colaborador *</Label>
              <Input
                value={buscaColab || formData.usuario_nome}
                onChange={(e) => {
                  setBuscaColab(e.target.value);
                  setShowColabList(true);
                  if (!e.target.value) setFormData({ ...formData, usuario_id: "", usuario_nome: "" });
                }}
                onFocus={() => buscaColab && setShowColabList(true)}
                placeholder="Digite o nome do colaborador..."
              />
              {showColabList && buscaColab.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {colabsFiltrados(buscaColab).slice(0, 10).map((u) => (
                    <button key={u.user_id} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                      onClick={() => handleSelectColab(u)}>
                      <span className="font-medium">{u.full_name}</span>
                      <span className="text-muted-foreground text-xs ml-2">{u.cargo || ""}</span>
                    </button>
                  ))}
                  {colabsFiltrados(buscaColab).length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum encontrado</div>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Vacina *</Label>
                <Select value={formData.tipo_vacina} onValueChange={(v) => setFormData({ ...formData, tipo_vacina: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_VACINA.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    <SelectItem value="Outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dose</Label>
                <Select value={formData.dose} onValueChange={(v) => setFormData({ ...formData, dose: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {DOSES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Aplicação *</Label>
                <Input type="date" value={formData.data_aplicacao} onChange={(e) => setFormData({ ...formData, data_aplicacao: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Próxima Dose</Label>
                <Input type="date" value={formData.data_proxima_dose} onChange={(e) => setFormData({ ...formData, data_proxima_dose: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lote</Label>
                <Input value={formData.lote} onChange={(e) => setFormData({ ...formData, lote: e.target.value })} placeholder="Nº do lote" />
              </div>
              <div className="space-y-2">
                <Label>Local de Aplicação</Label>
                <Input value={formData.local_aplicacao} onChange={(e) => setFormData({ ...formData, local_aplicacao: e.target.value })} placeholder="Ex: Posto de Saúde" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aplicada">Aplicada</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="atrasada">Atrasada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} placeholder="Observações..." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoadingSpinner className="mr-2" />}
                {editingId ? "Atualizar" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cartão de Vacinação em massa */}
      <Dialog open={cartaoDialogOpen} onOpenChange={setCartaoDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Cartão de Vacinação
            </DialogTitle>
            <DialogDescription>
              Selecione o colaborador e marque todas as vacinas do cartão de uma só vez. Vacinas já registradas serão pré-preenchidas.
            </DialogDescription>
          </DialogHeader>

          {/* Colaborador search */}
          <div className="space-y-2 relative">
            <Label>Colaborador *</Label>
            <Input
              value={buscaCartao}
              onChange={(e) => {
                setBuscaCartao(e.target.value);
                setShowCartaoList(true);
                if (!e.target.value) setCartaoColab({ user_id: "", full_name: "", cargo: "", setor: "" });
              }}
              onFocus={() => buscaCartao && setShowCartaoList(true)}
              placeholder="Digite o nome do colaborador..."
            />
            {showCartaoList && buscaCartao.length >= 2 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {colabsFiltrados(buscaCartao).slice(0, 10).map((u) => (
                  <button key={u.user_id} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between"
                    onClick={() => selectCartaoColab(u)}>
                    <span className="font-medium">{u.full_name}</span>
                    <span className="text-muted-foreground text-xs">{u.cargo || ""} • {u.setor || ""}</span>
                  </button>
                ))}
                {colabsFiltrados(buscaCartao).length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum encontrado</div>}
              </div>
            )}
          </div>

          {cartaoColab.user_id && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cargo</Label>
                <Input value={cartaoColab.cargo} readOnly className="bg-muted h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Setor</Label>
                <Input value={cartaoColab.setor} readOnly className="bg-muted h-8 text-sm" />
              </div>
            </div>
          )}

          {/* Vaccine grid */}
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-3 pr-4">
              {cartaoItens.map((item, idx) => (
                <div key={item.tipo_vacina} className={`rounded-lg border p-3 transition-colors ${item.ativo ? "bg-accent/30 border-primary/30" : "opacity-60"}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Checkbox
                      checked={item.ativo}
                      onCheckedChange={(checked) => updateCartaoItem(idx, "ativo", !!checked)}
                    />
                    <span className="font-medium text-sm">{item.tipo_vacina}</span>
                    {item.ativo && getStatusBadge(item.status)}
                  </div>

                  {item.ativo && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 ml-7">
                      <div className="space-y-1">
                        <Label className="text-xs">Dose</Label>
                        <Select value={item.dose} onValueChange={(v) => updateCartaoItem(idx, "dose", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Dose" /></SelectTrigger>
                          <SelectContent>
                            {DOSES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Aplicação *</Label>
                        <Input type="date" className="h-8 text-xs" value={item.data_aplicacao}
                          onChange={(e) => updateCartaoItem(idx, "data_aplicacao", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Próxima Dose</Label>
                        <Input type="date" className="h-8 text-xs" value={item.data_proxima_dose}
                          onChange={(e) => updateCartaoItem(idx, "data_proxima_dose", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Lote</Label>
                        <Input className="h-8 text-xs" value={item.lote} placeholder="Nº lote"
                          onChange={(e) => updateCartaoItem(idx, "lote", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select value={item.status} onValueChange={(v) => updateCartaoItem(idx, "status", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aplicada">Aplicada</SelectItem>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="atrasada">Atrasada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {cartaoItens.filter(i => i.ativo).length} de {TIPOS_VACINA.length} vacinas selecionadas
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCartaoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveCartao} disabled={isSubmitting}>
                {isSubmitting && <LoadingSpinner className="mr-2" />}
                Salvar Cartão
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
