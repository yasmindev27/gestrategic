import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSetoresNomes } from "@/hooks/useSetores";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus, Monitor, AlertTriangle, CheckCircle, Wrench, Package, ShieldAlert, Archive,
} from "lucide-react";

interface GestaoAtivosProps {
  setor: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  operacional: { label: "Em Uso", className: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
  reserva: { label: "Reserva (Backup)", className: "bg-blue-500/15 text-blue-700 border-blue-300" },
  em_manutencao: { label: "Em Manutenção", className: "bg-amber-500/15 text-amber-700 border-amber-300" },
  inoperante: { label: "Inoperante", className: "bg-red-500/15 text-red-700 border-red-300" },
  desativado: { label: "Desativado", className: "bg-muted text-muted-foreground" },
};

const CRITICIDADE_CONFIG: Record<string, { label: string; className: string }> = {
  critica: { label: "Crítica", className: "bg-red-500/15 text-red-700 border-red-300" },
  alta: { label: "Alta", className: "bg-orange-500/15 text-orange-700 border-orange-300" },
  media: { label: "Média", className: "bg-yellow-500/15 text-yellow-700 border-yellow-300" },
  baixa: { label: "Baixa", className: "bg-blue-500/15 text-blue-700 border-blue-300" },
};

const CATEGORIAS = [
  "Equipamento Médico", "Equipamento de TI", "Infraestrutura",
  "Climatização", "Elétrico", "Hidráulico", "Mobiliário", "Outro",
];

export function GestaoAtivos({ setor }: GestaoAtivosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: setores = [] } = useSetoresNomes();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "", descricao: "", numero_patrimonio: "", numero_serie: "",
    fabricante: "", modelo: "", categoria: "Outro",
    setor_localizacao: "", data_aquisicao: "", data_garantia_fim: "",
    vida_util_meses: "", valor_aquisicao: "", criticidade: "media",
    observacoes: "",
  });

  const { data: ativos = [], isLoading } = useQuery({
    queryKey: ["ativos", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos")
        .select("*")
        .eq("setor_responsavel", setor)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("ativos").insert({
        nome: data.nome,
        descricao: data.descricao || null,
        numero_patrimonio: data.numero_patrimonio || null,
        numero_serie: data.numero_serie || null,
        fabricante: data.fabricante || null,
        modelo: data.modelo || null,
        categoria: data.categoria,
        setor_responsavel: setor,
        setor_localizacao: data.setor_localizacao || null,
        data_aquisicao: data.data_aquisicao || null,
        data_garantia_fim: data.data_garantia_fim || null,
        vida_util_meses: data.vida_util_meses ? parseInt(data.vida_util_meses) : null,
        valor_aquisicao: data.valor_aquisicao ? parseFloat(data.valor_aquisicao) : null,
        criticidade: data.criticidade,
        observacoes: data.observacoes || null,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ativos", setor] });
      toast({ title: "Ativo cadastrado com sucesso!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("ativos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ativos", setor] });
      toast({ title: "Status atualizado!" });
    },
  });

  const resetForm = () => setFormData({
    nome: "", descricao: "", numero_patrimonio: "", numero_serie: "",
    fabricante: "", modelo: "", categoria: "Outro",
    setor_localizacao: "", data_aquisicao: "", data_garantia_fim: "",
    vida_util_meses: "", valor_aquisicao: "", criticidade: "media",
    observacoes: "",
  });

  const filtered = ativos.filter(a => {
    if (filterStatus !== "todos" && a.status !== filterStatus) return false;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      return a.nome.toLowerCase().includes(t) ||
        (a.numero_patrimonio?.toLowerCase() || "").includes(t) ||
        (a.fabricante?.toLowerCase() || "").includes(t);
    }
    return true;
  });

  const stats = {
    total: ativos.length,
    emUso: ativos.filter(a => a.status === "operacional").length,
    reserva: ativos.filter(a => a.status === "reserva").length,
    manutencao: ativos.filter(a => a.status === "em_manutencao").length,
    inoperantes: ativos.filter(a => a.status === "inoperante").length,
  };

  // Alert: critical items with zero backup
  const criticosGrouped = new Map<string, { emUso: number; reserva: number }>();
  ativos.filter(a => a.criticidade === "critica").forEach(a => {
    const key = a.categoria || a.nome;
    const entry = criticosGrouped.get(key) || { emUso: 0, reserva: 0 };
    if (a.status === "operacional") entry.emUso++;
    if (a.status === "reserva") entry.reserva++;
    criticosGrouped.set(key, entry);
  });
  const alertasBackupZero = Array.from(criticosGrouped.entries())
    .filter(([_, v]) => v.emUso > 0 && v.reserva === 0)
    .map(([name]) => name);

  if (isLoading) return <LoadingState message="Carregando ativos..." />;

  return (
    <div className="space-y-4">
      {/* Alert: Risco de Parada Operacional */}
      {alertasBackupZero.length > 0 && (
        <Card className="border-destructive bg-destructive/10 ring-2 ring-destructive/30">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-3 rounded-full bg-destructive/20 animate-pulse">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">⚠ Risco de Parada Operacional</p>
              <p className="text-sm text-destructive/80 mb-2">
                Itens críticos sem equipamento de reserva (backup):
              </p>
              <div className="flex flex-wrap gap-2">
                {alertasBackupZero.map(name => (
                  <Badge key={name} variant="destructive" className="text-xs">{name}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total de Ativos" value={stats.total} icon={Package} variant="primary" />
        <StatCard title="Em Uso" value={stats.emUso} icon={CheckCircle} variant="success" />
        <StatCard title="Reserva (Backup)" value={stats.reserva} icon={Archive} variant="primary" />
        <StatCard title="Em Manutenção" value={stats.manutencao} icon={Wrench} variant="warning" />
        <StatCard title="Inoperantes" value={stats.inoperantes} icon={AlertTriangle} variant="destructive" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome, patrimônio..." />
          </div>
          <div className="w-[180px]">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Ativo
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Monitor} title="Nenhum ativo encontrado" description="Cadastre ativos para começar" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Patrimônio</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Criticidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{a.nome}</p>
                        <p className="text-xs text-muted-foreground">{a.fabricante} {a.modelo}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{a.numero_patrimonio || "-"}</TableCell>
                    <TableCell>{a.categoria}</TableCell>
                    <TableCell>{a.setor_localizacao || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CRITICIDADE_CONFIG[a.criticidade]?.className}>
                        {CRITICIDADE_CONFIG[a.criticidade]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CONFIG[a.status]?.className || ""}>
                        {STATUS_CONFIG[a.status]?.label || a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={a.status} onValueChange={(s) => updateStatusMutation.mutate({ id: a.id, status: s })}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Novo Ativo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Ativo</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <Label>Nº Patrimônio</Label>
              <Input value={formData.numero_patrimonio} onChange={e => setFormData(p => ({ ...p, numero_patrimonio: e.target.value }))} />
            </div>
            <div>
              <Label>Nº Série</Label>
              <Input value={formData.numero_serie} onChange={e => setFormData(p => ({ ...p, numero_serie: e.target.value }))} />
            </div>
            <div>
              <Label>Fabricante</Label>
              <Input value={formData.fabricante} onChange={e => setFormData(p => ({ ...p, fabricante: e.target.value }))} />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={formData.modelo} onChange={e => setFormData(p => ({ ...p, modelo: e.target.value }))} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={formData.categoria} onValueChange={v => setFormData(p => ({ ...p, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Localização</Label>
              <Select value={formData.setor_localizacao} onValueChange={v => setFormData(p => ({ ...p, setor_localizacao: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Criticidade</Label>
              <Select value={formData.criticidade} onValueChange={v => setFormData(p => ({ ...p, criticidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CRITICIDADE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Aquisição</Label>
              <Input type="date" value={formData.data_aquisicao} onChange={e => setFormData(p => ({ ...p, data_aquisicao: e.target.value }))} />
            </div>
            <div>
              <Label>Garantia até</Label>
              <Input type="date" value={formData.data_garantia_fim} onChange={e => setFormData(p => ({ ...p, data_garantia_fim: e.target.value }))} />
            </div>
            <div>
              <Label>Vida útil (meses)</Label>
              <Input type="number" value={formData.vida_util_meses} onChange={e => setFormData(p => ({ ...p, vida_util_meses: e.target.value }))} />
            </div>
            <div>
              <Label>Valor Aquisição (R$)</Label>
              <Input type="number" step="0.01" value={formData.valor_aquisicao} onChange={e => setFormData(p => ({ ...p, valor_aquisicao: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!formData.nome) { toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" }); return; }
              createMutation.mutate(formData);
            }} disabled={createMutation.isPending}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
