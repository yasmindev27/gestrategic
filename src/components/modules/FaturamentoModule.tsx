import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { 
  FileText, 
  Plus, 
  Search,
  ClipboardCheck,
  AlertCircle,
  Loader2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SaidaProntuario {
  id: string;
  numero_prontuario: string;
  status: string;
  registrado_recepcao_em: string | null;
  validado_classificacao_em: string | null;
  conferido_nir_em: string | null;
  created_at: string;
}

export const FaturamentoModule = () => {
  const { isFaturamento, isAdmin, userId } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [saidas, setSaidas] = useState<SaidaProntuario[]>([]);
  const [prontuariosFaltantes, setProntuariosFaltantes] = useState<SaidaProntuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"lista" | "faltantes">("lista");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProntuario, setSelectedProntuario] = useState<SaidaProntuario | null>(null);
  const [observacao, setObservacao] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAccess = isFaturamento || isAdmin;

  useEffect(() => {
    if (canAccess) {
      fetchSaidas();
      logAction("acesso", "faturamento", { modulo: "prontuarios" });
    }
  }, [canAccess]);

  const fetchSaidas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("saida_prontuarios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSaidas(data || []);
      setProntuariosFaltantes(
        (data || []).filter(s => s.status === "pendente" || !s.conferido_nir_em)
      );
    } catch (error) {
      console.error("Error fetching saidas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de prontuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const iniciarAvaliacao = async () => {
    if (!selectedProntuario || !userId) return;
    
    setIsSubmitting(true);
    try {
      // Check if prontuario exists, if not create it
      let prontuarioId: string | null = null;
      
      const { data: existingProntuario } = await supabase
        .from("prontuarios")
        .select("id")
        .eq("numero_prontuario", selectedProntuario.numero_prontuario)
        .maybeSingle();

      if (existingProntuario) {
        prontuarioId = existingProntuario.id;
      } else {
        const { data: newProntuario, error: createError } = await supabase
          .from("prontuarios")
          .insert({
            numero_prontuario: selectedProntuario.numero_prontuario,
            paciente_nome: "A identificar",
            created_by: userId,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        prontuarioId = newProntuario.id;
      }

      // Create evaluation
      const { error } = await supabase
        .from("avaliacoes_prontuarios")
        .insert({
          prontuario_id: prontuarioId,
          saida_prontuario_id: selectedProntuario.id,
          avaliador_id: userId,
          observacoes: observacao || null,
        });

      if (error) throw error;

      // Update saida status
      await supabase
        .from("saida_prontuarios")
        .update({ status: "em_avaliacao" })
        .eq("id", selectedProntuario.id);

      await logAction("iniciar_avaliacao", "faturamento", { 
        prontuario: selectedProntuario.numero_prontuario 
      });

      toast({
        title: "Sucesso",
        description: "Avaliação iniciada com sucesso!",
      });

      setDialogOpen(false);
      setSelectedProntuario(null);
      setObservacao("");
      fetchSaidas();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar avaliação.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      aguardando_classificacao: { label: "Aguardando Classificação", variant: "secondary" },
      aguardando_nir: { label: "Aguardando NIR", variant: "secondary" },
      aguardando_faturamento: { label: "Aguardando Faturamento", variant: "default" },
      em_avaliacao: { label: "Em Avaliação", variant: "outline" },
      concluido: { label: "Concluído", variant: "default" },
      pendente: { label: "Pendente", variant: "destructive" },
    };
    
    const config = statusConfig[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredSaidas = (activeTab === "lista" ? saidas : prontuariosFaltantes).filter(
    s => s.numero_prontuario.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canAccess) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Você não tem permissão para acessar este módulo.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Prontuários</h2>
          <p className="text-muted-foreground">Gestão e avaliação de prontuários</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "lista" ? "default" : "outline"}
          onClick={() => setActiveTab("lista")}
        >
          <FileText className="h-4 w-4 mr-2" />
          Lista Geral
        </Button>
        <Button
          variant={activeTab === "faltantes" ? "default" : "outline"}
          onClick={() => setActiveTab("faltantes")}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Faltantes ({prontuariosFaltantes.length})
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número do prontuário..."
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
          <CardTitle>
            {activeTab === "lista" ? "Lista de Prontuários" : "Prontuários Faltantes"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSaidas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum prontuário encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Prontuário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recepção</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>NIR</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSaidas.map((saida) => (
                  <TableRow key={saida.id}>
                    <TableCell className="font-medium">{saida.numero_prontuario}</TableCell>
                    <TableCell>{getStatusBadge(saida.status)}</TableCell>
                    <TableCell>
                      {saida.registrado_recepcao_em 
                        ? format(new Date(saida.registrado_recepcao_em), "dd/MM/yy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {saida.validado_classificacao_em 
                        ? format(new Date(saida.validado_classificacao_em), "dd/MM/yy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {saida.conferido_nir_em 
                        ? format(new Date(saida.conferido_nir_em), "dd/MM/yy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Dialog open={dialogOpen && selectedProntuario?.id === saida.id} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) setSelectedProntuario(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            onClick={() => setSelectedProntuario(saida)}
                            disabled={saida.status === "em_avaliacao" || saida.status === "concluido"}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-1" />
                            Iniciar Avaliação
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Iniciar Avaliação de Prontuário</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div>
                              <label className="text-sm font-medium">Número do Prontuário</label>
                              <Input value={saida.numero_prontuario} disabled />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Observações (opcional)</label>
                              <Textarea
                                value={observacao}
                                onChange={(e) => setObservacao(e.target.value)}
                                placeholder="Adicione observações iniciais..."
                              />
                            </div>
                            <Button 
                              onClick={iniciarAvaliacao} 
                              className="w-full"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                              )}
                              Confirmar Início da Avaliação
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
