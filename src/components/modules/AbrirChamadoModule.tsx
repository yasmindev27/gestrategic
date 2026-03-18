import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Ticket, 
  Plus, 
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Chamado {
  id: string;
  numero_chamado: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  solicitante_id: string;
  solicitante_nome: string;
  data_abertura: string;
  data_resolucao: string | null;
  solucao: string | null;
}

const categoriaLabels: Record<string, string> = {
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Engenharia Clínica",
};

const prioridadeColors: Record<string, string> = {
  baixa: "bg-green-500 text-white",
  media: "bg-yellow-500 text-black",
  alta: "bg-orange-500 text-white",
  urgente: "bg-red-500 text-white",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const statusColors: Record<string, string> = {
  aberto: "bg-blue-500 text-white",
  em_andamento: "bg-yellow-500 text-black",
  pendente: "bg-orange-500 text-white",
  resolvido: "bg-green-500 text-white",
  cancelado: "bg-gray-500 text-white",
};

const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em Andamento",
  pendente: "Pendente",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
};

interface AbrirChamadoModuleProps {
  onOpenExternal?: (url: string, title: string) => void;
}

export const AbrirChamadoModule = ({ onOpenExternal }: AbrirChamadoModuleProps) => {
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [meusChamados, setMeusChamados] = useState<Chamado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [createDialog, setCreateDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClassificando, setIsClassificando] = useState(false);
  
  const [chamadoForm, setChamadoForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "ti" as string,
    prioridade: "",
    prioridadeManual: false,
  });

  useEffect(() => {
    fetchMeusChamados();
    logAction("acesso", "abrir_chamado");
  }, []);

  const fetchMeusChamados = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("chamados")
        .select("*")
        .eq("solicitante_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMeusChamados(data || []);
    } catch (error) {
      console.error("Error fetching chamados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar seus chamados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const classificarPrioridade = async () => {
    if (!chamadoForm.titulo || !chamadoForm.descricao) {
      toast({
        title: "Atenção",
        description: "Preencha título e descrição para classificar automaticamente.",
        variant: "destructive",
      });
      return;
    }

    setIsClassificando(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classificar-prioridade`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            titulo: chamadoForm.titulo,
            descricao: chamadoForm.descricao,
            categoria: chamadoForm.categoria,
          }),
        }
      );

      const result = await response.json();

      if (result.prioridade) {
        setChamadoForm(prev => ({ 
          ...prev, 
          prioridade: result.prioridade,
          prioridadeManual: false,
        }));
        toast({
          title: "Classificação automática",
          description: `Prioridade sugerida: ${prioridadeLabels[result.prioridade]}`,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro na classificação",
        description: "Não foi possível classificar automaticamente. Selecione manualmente.",
        variant: "destructive",
      });
    } finally {
      setIsClassificando(false);
    }
  };

  const handleCreateChamado = async () => {
    if (!chamadoForm.titulo || !chamadoForm.descricao || !chamadoForm.categoria) {
      toast({
        title: "Erro",
        description: "Título, descrição e categoria são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Se não tiver prioridade, classificar automaticamente primeiro
    let prioridadeFinal = chamadoForm.prioridade;
    if (!prioridadeFinal) {
      setIsClassificando(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classificar-prioridade`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session?.access_token}`,
            },
            body: JSON.stringify({
              titulo: chamadoForm.titulo,
              descricao: chamadoForm.descricao,
              categoria: chamadoForm.categoria,
            }),
          }
        );
        const result = await response.json();
        prioridadeFinal = result.prioridade || "media";
      } catch {
        prioridadeFinal = "media";
      } finally {
        setIsClassificando(false);
      }
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, setor")
        .eq("user_id", user?.id)
        .single();
      
      const { error } = await supabase
        .from("chamados")
        .insert({
          numero_chamado: `TEMP-${Date.now()}`, // Will be generated by trigger
          titulo: chamadoForm.titulo,
          descricao: chamadoForm.descricao,
          prioridade: prioridadeFinal,
          categoria: chamadoForm.categoria,
          solicitante_id: user?.id,
          solicitante_nome: profile?.full_name || user?.email || "Usuário",
          solicitante_setor: profile?.setor,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Chamado aberto com prioridade ${prioridadeLabels[prioridadeFinal]}.`,
      });

      await logAction("abrir_chamado", "chamados", { 
        titulo: chamadoForm.titulo,
        categoria: chamadoForm.categoria,
        prioridade: prioridadeFinal,
      });
      
      setCreateDialog(false);
      setChamadoForm({ titulo: "", descricao: "", categoria: "ti", prioridade: "", prioridadeManual: false });
      fetchMeusChamados();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao abrir chamado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetails = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setDetailsDialog(true);
  };

  const filteredChamados = meusChamados.filter(c => 
    c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.numero_chamado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: meusChamados.length,
    abertos: meusChamados.filter(c => c.status === 'aberto' || c.status === 'em_andamento').length,
    resolvidos: meusChamados.filter(c => c.status === 'resolvido').length,
  };

  const handleAbrirChamado = () => {
    const url = "https://suporte.santacasachavantes.org/index.php";
    if (onOpenExternal) {
      onOpenExternal(url, "GLPI - Suporte");
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      {/* Card de acesso ao portal GLPI */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Ticket className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Portal GLPI - Suporte</h2>
                <p className="text-muted-foreground text-sm">
                  Acesse o portal GLPI para abrir e acompanhar chamados de TI, Manutenção e Engenharia Clínica
                </p>
              </div>
            </div>
            <Button 
              onClick={() => window.open("https://suporte.santacasachavantes.org/index.php", "_blank", "noopener,noreferrer")} 
              size="lg" 
              className="gap-2 whitespace-nowrap"
            >
              <ExternalLink className="h-5 w-5" />
              Acessar Portal
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chamados Internos</h2>
          <p className="text-muted-foreground">Abra e acompanhe chamados internos pelo sistema</p>
        </div>
        <Button onClick={() => setCreateDialog(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Novo Chamado Interno
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Meus chamados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.abertos}</p>
                <p className="text-sm text-muted-foreground">Em aberto</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolvidos}</p>
                <p className="text-sm text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and List */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Chamados</CardTitle>
          <CardDescription>Acompanhe o status dos seus chamados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredChamados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Você ainda não abriu nenhum chamado.</p>
              <Button 
                variant="link" 
                onClick={handleAbrirChamado}
                className="mt-2"
              >
                Abrir primeiro chamado
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Abertura</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChamados.map((chamado) => (
                  <TableRow key={chamado.id}>
                    <TableCell className="font-mono">{chamado.numero_chamado}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{chamado.titulo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoriaLabels[chamado.categoria] || chamado.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={prioridadeColors[chamado.prioridade]}>
                        {prioridadeLabels[chamado.prioridade] || chamado.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[chamado.status]}>
                        {statusLabels[chamado.status] || chamado.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(chamado.data_abertura), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openDetails(chamado)}>
                        <Eye className="h-4 w-4" />
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
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Abrir Novo Chamado
            </DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo. A prioridade será classificada automaticamente com IA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Setor *</Label>
              <Select 
                value={chamadoForm.categoria} 
                onValueChange={(v) => setChamadoForm(prev => ({ ...prev, categoria: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ti">TI - Tecnologia da Informação</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="engenharia_clinica">Engenharia Clínica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Título *</Label>
              <Input
                placeholder="Descreva brevemente o problema"
                value={chamadoForm.titulo}
                onChange={(e) => setChamadoForm(prev => ({ ...prev, titulo: e.target.value }))}
              />
            </div>

            <div>
              <Label>Descrição detalhada *</Label>
              <Textarea
                placeholder="Descreva o problema com o máximo de detalhes possível..."
                value={chamadoForm.descricao}
                onChange={(e) => setChamadoForm(prev => ({ ...prev, descricao: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Prioridade com IA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prioridade</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={classificarPrioridade}
                  disabled={isClassificando || !chamadoForm.titulo || !chamadoForm.descricao}
                >
                  {isClassificando ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Classificar com IA
                </Button>
              </div>

              {chamadoForm.prioridade && !chamadoForm.prioridadeManual && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm">Sugestão da IA:</span>
                  <Badge className={prioridadeColors[chamadoForm.prioridade]}>
                    {prioridadeLabels[chamadoForm.prioridade]}
                  </Badge>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ml-auto text-xs"
                    onClick={() => setChamadoForm(prev => ({ ...prev, prioridadeManual: true }))}
                  >
                    Corrigir manualmente
                  </Button>
                </div>
              )}

              {(chamadoForm.prioridadeManual || !chamadoForm.prioridade) && (
                <Select 
                  value={chamadoForm.prioridade} 
                  onValueChange={(v) => setChamadoForm(prev => ({ ...prev, prioridade: v, prioridadeManual: true }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione ou deixe em branco para IA classificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa - Melhorias, preventivas</SelectItem>
                    <SelectItem value="media">Média — Afeta produtividade</SelectItem>
                    <SelectItem value="alta">Alta — Equipamentos importantes</SelectItem>
                    <SelectItem value="urgente">Urgente — Risco à vida / suporte vital</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Se não selecionar, a IA classificará automaticamente ao enviar
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateChamado} 
              disabled={isSubmitting || isClassificando}
            >
              {isSubmitting || isClassificando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Abrir Chamado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Chamado</DialogTitle>
          </DialogHeader>
          
          {selectedChamado && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {selectedChamado.numero_chamado}
                </span>
                <Badge variant="outline">
                  {categoriaLabels[selectedChamado.categoria]}
                </Badge>
                <Badge className={prioridadeColors[selectedChamado.prioridade]}>
                  {prioridadeLabels[selectedChamado.prioridade]}
                </Badge>
                <Badge className={statusColors[selectedChamado.status]}>
                  {statusLabels[selectedChamado.status]}
                </Badge>
              </div>

              <div>
                <Label className="text-muted-foreground">Título</Label>
                <p className="font-medium">{selectedChamado.titulo}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="text-sm whitespace-pre-wrap">{selectedChamado.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Abertura</Label>
                  <p className="text-sm">
                    {format(new Date(selectedChamado.data_abertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {selectedChamado.data_resolucao && (
                  <div>
                    <Label className="text-muted-foreground">Resolução</Label>
                    <p className="text-sm">
                      {format(new Date(selectedChamado.data_resolucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>

              {selectedChamado.solucao && (
                <div>
                  <Label className="text-muted-foreground">Solução</Label>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                    {selectedChamado.solucao}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
