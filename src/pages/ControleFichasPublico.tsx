import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CadastroInconsistente {
  id: string;
  numero_prontuario: string | null;
  paciente_nome: string | null;
  tipo_inconsistencia: string;
  descricao: string;
  status: string;
  registrado_por: string | null;
  resolvido_por: string | null;
  resolvido_por_nome: string | null;
  resolvido_em: string | null;
  created_at: string;
}

const tiposInconsistencia = [
  { value: "dados_incompletos", label: "Dados Incompletos" },
  { value: "dados_divergentes", label: "Dados Divergentes" },
  { value: "prontuario_nao_localizado", label: "Prontuário Não Localizado" },
  { value: "documentacao_faltante", label: "Documentação Faltante" },
  { value: "outro", label: "Outro" },
];

const ControleFichasPublico = () => {
  const { toast } = useToast();
  
  const [inconsistencias, setInconsistencias] = useState<CadastroInconsistente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [numeroProntuario, setNumeroProntuario] = useState("");
  const [tipoInconsistencia, setTipoInconsistencia] = useState("");
  const [descricao, setDescricao] = useState("");
  const [registradoPorNome, setRegistradoPorNome] = useState("");

  useEffect(() => {
    fetchInconsistencias();
  }, []);

  const fetchInconsistencias = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("cadastros_inconsistentes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInconsistencias(data || []);
    } catch (error) {
      console.error("Error fetching inconsistencias:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cadastros inconsistentes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInconsistencia = async () => {
    if (!tipoInconsistencia || !descricao.trim() || !registradoPorNome.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("cadastros_inconsistentes")
        .insert({
          numero_prontuario: numeroProntuario.trim() || null,
          tipo_inconsistencia: tipoInconsistencia,
          descricao: descricao.trim(),
          paciente_nome: registradoPorNome.trim(),
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Inconsistência registrada com sucesso!",
      });

      setDialogOpen(false);
      setNumeroProntuario("");
      setTipoInconsistencia("");
      setDescricao("");
      setRegistradoPorNome("");
      fetchInconsistencias();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar inconsistência.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolverInconsistencia = async (id: string) => {
    const nomeResponsavel = prompt("Digite seu nome para registrar a resolução:");
    if (!nomeResponsavel?.trim()) return;
    
    try {
      const { error } = await supabase
        .from("cadastros_inconsistentes")
        .update({
          status: "resolvido",
          resolvido_por_nome: nomeResponsavel.trim(),
          resolvido_em: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Inconsistência marcada como resolvida!",
      });

      fetchInconsistencias();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pendente: { label: "Pendente", className: "bg-warning text-warning-foreground" },
      em_analise: { label: "Em Análise", className: "bg-info text-info-foreground" },
      resolvido: { label: "Resolvido", className: "bg-success text-success-foreground" },
    };
    
    const config = statusConfig[status] || { label: status, className: "bg-secondary" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTipoLabel = (tipo: string) => {
    return tiposInconsistencia.find(t => t.value === tipo)?.label || tipo;
  };

  const filteredInconsistencias = inconsistencias.filter(
    i => (i.numero_prontuario?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
         (i.paciente_nome?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
         i.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <FileText className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">Controle de Fichas</h1>
            <p className="text-sm opacity-90">UPA 24h - Cadastros Inconsistentes</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Controle de Fichas</h2>
            <p className="text-muted-foreground">Cadastros inconsistentes e fichas com dados incompletos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Inconsistência
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Inconsistência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Nome do Paciente *</label>
                  <Input
                    value={registradoPorNome}
                    onChange={(e) => setRegistradoPorNome(e.target.value)}
                    placeholder="Digite o nome do paciente"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Número do Prontuário (opcional)</label>
                  <Input
                    value={numeroProntuario}
                    onChange={(e) => setNumeroProntuario(e.target.value)}
                    placeholder="Digite o número do prontuário"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Inconsistência *</label>
                  <Select value={tipoInconsistencia} onValueChange={setTipoInconsistencia}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposInconsistencia.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição *</label>
                  <Textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva a inconsistência encontrada..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddInconsistencia} 
                  disabled={!tipoInconsistencia || !descricao.trim() || !registradoPorNome.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ClipboardX className="h-4 w-4 mr-2" />
                  )}
                  Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-warning">
                    {inconsistencias.filter(i => i.status === "pendente").length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-warning opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Análise</p>
                  <p className="text-2xl font-bold text-info">
                    {inconsistencias.filter(i => i.status === "em_analise").length}
                  </p>
                </div>
                <ClipboardX className="h-8 w-8 text-info opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolvidos</p>
                  <p className="text-2xl font-bold text-success">
                    {inconsistencias.filter(i => i.status === "resolvido").length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-success opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por prontuário ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cadastros Inconsistentes</CardTitle>
            <CardDescription>
              Registros de fichas e prontuários com dados incompletos ou divergentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredInconsistencias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma inconsistência registrada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Prontuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInconsistencias.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.paciente_nome || "-"}
                        </TableCell>
                        <TableCell>
                          {item.numero_prontuario || "-"}
                        </TableCell>
                        <TableCell>{getTipoLabel(item.tipo_inconsistencia)}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.descricao}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {format(new Date(item.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {item.status !== "resolvido" && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleResolverInconsistencia(item.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-4 mt-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          UPA 24h - Sistema de Gestão Hospitalar © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default ControleFichasPublico;
