import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ClipboardX, 
  Plus, 
  Search,
  AlertCircle,
  Loader2,
  CheckCircle,
  Filter,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CadastroInconsistente {
  id: string;
  numero_prontuario: string | null;
  paciente_nome: string | null;
  tipo_inconsistencia: string;
  descricao: string;
  status: string;
  registrado_por: string;
  resolvido_por: string | null;
  resolvido_por_nome: string | null;
  resolvido_em: string | null;
  created_at: string;
  registrado_por_nome_display?: string;
}

const tiposInconsistencia = [
  { value: "dados_incompletos", label: "Dados Incompletos" },
  { value: "dados_divergentes", label: "Dados Divergentes" },
  { value: "prontuario_nao_localizado", label: "Prontuário Não Localizado" },
  { value: "documentacao_faltante", label: "Documentação Faltante" },
  { value: "outro", label: "Outro" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-800 border-amber-200" },
  em_analise: { label: "Em Análise", color: "bg-sky-100 text-sky-800 border-sky-200" },
  resolvido: { label: "Resolvido", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

export const ControleFichasModule = () => {
  const { isRecepcao, isAdmin, userId, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [inconsistencias, setInconsistencias] = useState<CadastroInconsistente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesDialog, setDetalhesDialog] = useState<CadastroInconsistente | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [numeroProntuario, setNumeroProntuario] = useState("");
  const [pacienteNome, setPacienteNome] = useState("");
  const [tipoInconsistencia, setTipoInconsistencia] = useState("");
  const [descricao, setDescricao] = useState("");

  const canAccess = isRecepcao || isAdmin;

  useEffect(() => {
    if (!isLoadingRole && canAccess) {
      fetchInconsistencias();
      logAction("acesso", "controle_fichas");
    }
  }, [canAccess, isLoadingRole]);

  const fetchInconsistencias = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("cadastros_inconsistentes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch registrado_por names
      const userIds = [...new Set((data || []).map(d => d.registrado_por).filter(Boolean))];
      let namesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        if (profiles) {
          profiles.forEach(p => { namesMap[p.user_id] = p.full_name || "Usuário"; });
        }
      }

      setInconsistencias((data || []).map(d => ({
        ...d,
        registrado_por_nome_display: d.registrado_por ? (namesMap[d.registrado_por] || "Usuário") : "—",
      })));
    } catch (error) {
      console.error("Error fetching inconsistencias:", error);
      toast({ title: "Erro", description: "Erro ao carregar cadastros inconsistentes.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInconsistencia = async () => {
    if (!tipoInconsistencia || !descricao.trim() || !userId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("cadastros_inconsistentes")
        .insert({
          numero_prontuario: numeroProntuario.trim() || null,
          paciente_nome: pacienteNome.trim().toUpperCase() || null,
          tipo_inconsistencia: tipoInconsistencia,
          descricao: descricao.trim(),
          registrado_por: userId,
        });

      if (error) throw error;

      await logAction("registrar_inconsistencia", "controle_fichas", { 
        tipo: tipoInconsistencia,
        prontuario: numeroProntuario || "N/A"
      });

      toast({ title: "Sucesso", description: "Inconsistência registrada com sucesso!" });
      setDialogOpen(false);
      setNumeroProntuario("");
      setPacienteNome("");
      setTipoInconsistencia("");
      setDescricao("");
      fetchInconsistencias();
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Erro", description: "Erro ao registrar inconsistência.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolverInconsistencia = async (id: string) => {
    if (!userId) return;
    
    try {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
      const { error } = await supabase
        .from("cadastros_inconsistentes")
        .update({
          status: "resolvido",
          resolvido_por: userId,
          resolvido_por_nome: profile?.full_name || "Usuário",
          resolvido_em: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      await logAction("resolver_inconsistencia", "controle_fichas", { id });
      toast({ title: "Sucesso", description: "Inconsistência marcada como resolvida!" });
      fetchInconsistencias();
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Erro", description: "Erro ao atualizar status.", variant: "destructive" });
    }
  };

  const getTipoLabel = (tipo: string) => tiposInconsistencia.find(t => t.value === tipo)?.label || tipo;

  const counts = useMemo(() => ({
    pendente: inconsistencias.filter(i => i.status === "pendente").length,
    em_analise: inconsistencias.filter(i => i.status === "em_analise").length,
    resolvido: inconsistencias.filter(i => i.status === "resolvido").length,
    total: inconsistencias.length,
  }), [inconsistencias]);

  const filtered = useMemo(() => {
    return inconsistencias.filter(i => {
      const matchSearch = !searchTerm || 
        (i.numero_prontuario?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (i.paciente_nome?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        i.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "todos" || i.status === statusFilter;
      const matchTipo = tipoFilter === "todos" || i.tipo_inconsistencia === tipoFilter;
      return matchSearch && matchStatus && matchTipo;
    });
  }, [inconsistencias, searchTerm, statusFilter, tipoFilter]);

  if (isLoadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Você não tem permissão para acessar esta área.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Controle de Fichas</h2>
          <p className="text-xs text-muted-foreground">Cadastros inconsistentes e fichas com dados incompletos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Registrar Inconsistência
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Inconsistência</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nº Prontuário</label>
                  <Input
                    value={numeroProntuario}
                    onChange={(e) => setNumeroProntuario(e.target.value)}
                    placeholder="Opcional"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nome do Paciente</label>
                  <Input
                    value={pacienteNome}
                    onChange={(e) => setPacienteNome(e.target.value)}
                    placeholder="Opcional"
                    className="mt-1 uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo de Inconsistência *</label>
                <Select value={tipoInconsistencia} onValueChange={setTipoInconsistencia}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposInconsistencia.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Descrição *</label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva a inconsistência encontrada..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleAddInconsistencia} 
                disabled={!tipoInconsistencia || !descricao.trim() || isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards - clickable filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button onClick={() => setStatusFilter("todos")} className="text-left">
          <Card className={`transition-shadow hover:shadow-sm ${statusFilter === "todos" ? "ring-2 ring-primary" : ""}`}>
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground font-medium">Total</p>
              <p className="text-xl font-bold text-foreground">{counts.total}</p>
            </CardContent>
          </Card>
        </button>
        <button onClick={() => setStatusFilter("pendente")} className="text-left">
          <Card className={`transition-shadow hover:shadow-sm ${statusFilter === "pendente" ? "ring-2 ring-amber-400" : ""}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Pendentes</p>
                  <p className="text-xl font-bold text-amber-600">{counts.pendente}</p>
                </div>
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </button>
        <button onClick={() => setStatusFilter("resolvido")} className="text-left">
          <Card className={`transition-shadow hover:shadow-sm ${statusFilter === "resolvido" ? "ring-2 ring-emerald-400" : ""}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Resolvidos</p>
                  <p className="text-xl font-bold text-emerald-600">{counts.resolvido}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar prontuário, paciente ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            {tiposInconsistencia.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[11px] text-muted-foreground ml-auto">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Nenhuma inconsistência encontrada{statusFilter !== "todos" ? " com o filtro aplicado" : ""}.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[hsl(var(--sidebar-background))] hover:bg-[hsl(var(--sidebar-background))]">
                <TableHead className="text-[11px] font-semibold text-white uppercase tracking-wider w-[100px]">Prontuário</TableHead>
                <TableHead className="text-[11px] font-semibold text-white uppercase tracking-wider">Paciente</TableHead>
                <TableHead className="text-[11px] font-semibold text-white uppercase tracking-wider w-[150px]">Tipo</TableHead>
                <TableHead className="text-[11px] font-semibold text-white uppercase tracking-wider">Descrição</TableHead>
                <TableHead className="text-[11px] font-semibold text-white uppercase tracking-wider w-[90px]">Status</TableHead>
                <TableHead className="text-[11px] font-semibold text-white uppercase tracking-wider w-[140px]">Responsável</TableHead>
                <TableHead className="text-[11px] font-semibold text-white uppercase tracking-wider w-[110px]">Data</TableHead>
                <TableHead className="text-[11px] font-semibold text-white uppercase tracking-wider w-[90px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow key={item.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                  <TableCell className="text-xs font-mono font-medium py-2">
                    {item.numero_prontuario || "—"}
                  </TableCell>
                  <TableCell className="text-xs font-medium uppercase py-2">
                    {item.paciente_nome || "—"}
                  </TableCell>
                  <TableCell className="text-xs py-2">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {getTipoLabel(item.tipo_inconsistencia)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs py-2 max-w-[250px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="line-clamp-2 cursor-default">{item.descricao}</span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-sm">
                          <p className="text-xs whitespace-pre-wrap">{item.descricao}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="py-2">
                    {(() => {
                      const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: "bg-secondary" };
                      return <Badge className={`text-[10px] border ${cfg.color}`}>{cfg.label}</Badge>;
                    })()}
                  </TableCell>
                  <TableCell className="text-xs py-2">
                    {item.status === "resolvido" 
                      ? (item.resolvido_por_nome || "—") 
                      : (item.registrado_por_nome_display || "—")
                    }
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground py-2">
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => setDetalhesDialog(item)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver Detalhes</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {item.status !== "resolvido" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleResolverInconsistencia(item.id)}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Marcar como Resolvido</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detalhes Dialog */}
      <Dialog open={!!detalhesDialog} onOpenChange={(open) => !open && setDetalhesDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Inconsistência</DialogTitle>
          </DialogHeader>
          {detalhesDialog && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Prontuário</p>
                  <p className="text-sm font-mono">{detalhesDialog.numero_prontuario || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Paciente</p>
                  <p className="text-sm font-medium uppercase">{detalhesDialog.paciente_nome || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Tipo</p>
                  <p className="text-sm">{getTipoLabel(detalhesDialog.tipo_inconsistencia)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Status</p>
                  {(() => {
                    const cfg = STATUS_CONFIG[detalhesDialog.status] || { label: detalhesDialog.status, color: "bg-secondary" };
                    return <Badge className={`text-[10px] border ${cfg.color}`}>{cfg.label}</Badge>;
                  })()}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Data de Registro</p>
                  <p className="text-sm">{format(new Date(detalhesDialog.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                {detalhesDialog.resolvido_em && (
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Resolvido em</p>
                    <p className="text-sm">{format(new Date(detalhesDialog.resolvido_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    {detalhesDialog.resolvido_por_nome && (
                      <p className="text-[11px] text-muted-foreground">por {detalhesDialog.resolvido_por_nome}</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-1">Descrição</p>
                <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">{detalhesDialog.descricao}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            {detalhesDialog && detalhesDialog.status !== "resolvido" && (
              <Button 
                variant="outline"
                onClick={() => {
                  handleResolverInconsistencia(detalhesDialog.id);
                  setDetalhesDialog(null);
                }}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Marcar como Resolvido
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetalhesDialog(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
