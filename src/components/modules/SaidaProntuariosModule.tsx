import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  FileOutput, 
  Plus, 
  Search,
  Check,
  AlertCircle,
  Loader2,
  ClipboardCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SaidaProntuario {
  id: string;
  numero_prontuario: string;
  status: string;
  registrado_recepcao_em: string | null;
  registrado_recepcao_por: string | null;
  validado_classificacao_em: string | null;
  validado_classificacao_por: string | null;
  existe_fisicamente: boolean | null;
  observacao_classificacao: string | null;
  conferido_nir_em: string | null;
  conferido_nir_por: string | null;
  observacao_nir: string | null;
  created_at: string;
}

export const SaidaProntuariosModule = () => {
  const { isRecepcao, isClassificacao, isNir, isAdmin, userId, role, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [saidas, setSaidas] = useState<SaidaProntuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newProntuarioOpen, setNewProntuarioOpen] = useState(false);
  const [validarOpen, setValidarOpen] = useState(false);
  const [selectedSaida, setSelectedSaida] = useState<SaidaProntuario | null>(null);
  
  // Form states
  const [numeroProntuario, setNumeroProntuario] = useState("");
  const [existeFisicamente, setExisteFisicamente] = useState(true);
  const [observacao, setObservacao] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAccess = isRecepcao || isClassificacao || isNir || isAdmin;
  const canInsert = isRecepcao || isAdmin;
  const canValidateClassificacao = isClassificacao || isAdmin;
  const canValidateNir = isNir || isAdmin;

  useEffect(() => {
    if (!isLoadingRole && canAccess) {
      fetchSaidas();
      logAction("acesso", "saida_prontuarios", { role: role || "unknown" });
    }
  }, [canAccess, isLoadingRole, role]);

  const fetchSaidas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("saida_prontuarios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSaidas(data || []);
    } catch (error) {
      console.error("Error fetching saidas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de saída.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSaida = async () => {
    if (!numeroProntuario.trim() || !userId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("saida_prontuarios")
        .insert({
          numero_prontuario: numeroProntuario.trim(),
          registrado_recepcao_por: userId,
          registrado_recepcao_em: new Date().toISOString(),
          status: "aguardando_classificacao",
        });

      if (error) throw error;

      await logAction("registrar_saida", "saida_prontuarios", { 
        prontuario: numeroProntuario 
      });

      toast({
        title: "Sucesso",
        description: "Saída de prontuário registrada!",
      });

      setNewProntuarioOpen(false);
      setNumeroProntuario("");
      fetchSaidas();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar saída.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidarClassificacao = async () => {
    if (!selectedSaida || !userId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("saida_prontuarios")
        .update({
          validado_classificacao_por: userId,
          validado_classificacao_em: new Date().toISOString(),
          existe_fisicamente: existeFisicamente,
          observacao_classificacao: observacao || null,
          status: "aguardando_nir",
        })
        .eq("id", selectedSaida.id);

      if (error) throw error;

      await logAction("validar_classificacao", "saida_prontuarios", { 
        prontuario: selectedSaida.numero_prontuario,
        existe: existeFisicamente
      });

      toast({
        title: "Sucesso",
        description: "Validação de classificação registrada!",
      });

      setValidarOpen(false);
      setSelectedSaida(null);
      setObservacao("");
      setExisteFisicamente(true);
      fetchSaidas();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao validar.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidarNir = async () => {
    if (!selectedSaida || !userId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("saida_prontuarios")
        .update({
          conferido_nir_por: userId,
          conferido_nir_em: new Date().toISOString(),
          observacao_nir: observacao || null,
          status: "aguardando_faturamento",
        })
        .eq("id", selectedSaida.id);

      if (error) throw error;

      await logAction("validar_nir", "saida_prontuarios", { 
        prontuario: selectedSaida.numero_prontuario
      });

      toast({
        title: "Sucesso",
        description: "Conferência NIR registrada!",
      });

      setValidarOpen(false);
      setSelectedSaida(null);
      setObservacao("");
      fetchSaidas();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao conferir.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      aguardando_classificacao: { label: "Aguardando Classificação", className: "bg-warning text-warning-foreground" },
      aguardando_nir: { label: "Aguardando NIR", className: "bg-info text-info-foreground" },
      aguardando_faturamento: { label: "Aguardando Faturamento", className: "bg-primary text-primary-foreground" },
      em_avaliacao: { label: "Em Avaliação", className: "bg-secondary text-secondary-foreground" },
      concluido: { label: "Concluído", className: "bg-success text-success-foreground" },
      pendente: { label: "Pendente", className: "bg-destructive text-destructive-foreground" },
    };
    
    const config = statusConfig[status] || { label: status, className: "bg-secondary" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getActionButton = (saida: SaidaProntuario) => {
    if (canValidateClassificacao && saida.status === "aguardando_classificacao") {
      return (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => {
            setSelectedSaida(saida);
            setValidarOpen(true);
          }}
        >
          <ClipboardCheck className="h-4 w-4 mr-1" />
          Validar
        </Button>
      );
    }
    
    if (canValidateNir && saida.status === "aguardando_nir") {
      return (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => {
            setSelectedSaida(saida);
            setValidarOpen(true);
          }}
        >
          <Check className="h-4 w-4 mr-1" />
          Conferir
        </Button>
      );
    }

    return null;
  };

  const filteredSaidas = saidas.filter(
    s => s.numero_prontuario.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold text-foreground">Lista de Saída de Prontuários</h2>
          <p className="text-muted-foreground">Controle de fluxo entre setores</p>
        </div>
        {canInsert && (
          <Dialog open={newProntuarioOpen} onOpenChange={setNewProntuarioOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Saída
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Saída de Prontuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Número do Prontuário</label>
                  <Input
                    value={numeroProntuario}
                    onChange={(e) => setNumeroProntuario(e.target.value)}
                    placeholder="Digite o número do prontuário"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddSaida} 
                  disabled={!numeroProntuario.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileOutput className="h-4 w-4 mr-2" />
                  )}
                  Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
          <CardTitle>Prontuários em Fluxo</CardTitle>
          <CardDescription>
            {role === "recepcao" && "Registre a saída inicial dos prontuários físicos."}
            {role === "classificacao" && "Valide se os prontuários registrados existem fisicamente."}
            {role === "nir" && "Confira e valide os registros da Classificação."}
            {isAdmin && "Visualização completa de todos os fluxos."}
          </CardDescription>
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
                      <div className="flex flex-col">
                        {saida.validado_classificacao_em 
                          ? format(new Date(saida.validado_classificacao_em), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "-"}
                        {saida.existe_fisicamente !== null && (
                          <span className={`text-xs ${saida.existe_fisicamente ? "text-success" : "text-destructive"}`}>
                            {saida.existe_fisicamente ? "✓ Existe" : "✗ Não existe"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {saida.conferido_nir_em 
                        ? format(new Date(saida.conferido_nir_em), "dd/MM/yy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {getActionButton(saida)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Validation Dialog */}
      <Dialog open={validarOpen} onOpenChange={setValidarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSaida?.status === "aguardando_classificacao" 
                ? "Validar Classificação" 
                : "Conferência NIR"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Número do Prontuário</label>
              <Input value={selectedSaida?.numero_prontuario || ""} disabled />
            </div>
            
            {selectedSaida?.status === "aguardando_classificacao" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="existeFisicamente"
                  checked={existeFisicamente}
                  onCheckedChange={(checked) => setExisteFisicamente(checked as boolean)}
                />
                <label htmlFor="existeFisicamente" className="text-sm font-medium cursor-pointer">
                  Prontuário existe fisicamente
                </label>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Adicione observações..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={selectedSaida?.status === "aguardando_classificacao" 
                ? handleValidarClassificacao 
                : handleValidarNir
              }
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
