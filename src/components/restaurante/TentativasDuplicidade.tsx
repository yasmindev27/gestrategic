import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  AlertTriangle, 
  Loader2,
  FileDown,
  FileSpreadsheet,
  Trash2,
  Coffee,
  Sun,
  Cookie,
  Moon,
  Clock,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TentativaDuplicidade {
  id: string;
  tipo_pessoa: string;
  colaborador_nome: string;
  visitante_cpf_hash: string | null;
  tipo_refeicao: string;
  data_tentativa: string;
  hora_tentativa: string;
  created_at: string;
}

const tipoRefeicaoLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  cafe: { label: "Café da Manhã", icon: <Coffee className="h-4 w-4" /> },
  almoco: { label: "Almoço", icon: <Sun className="h-4 w-4" /> },
  lanche: { label: "Café da Tarde", icon: <Cookie className="h-4 w-4" /> },
  jantar: { label: "Jantar", icon: <Moon className="h-4 w-4" /> },
  fora_horario: { label: "Fora de Horário", icon: <Clock className="h-4 w-4" /> },
};

export const TentativasDuplicidade = () => {
  const { toast } = useToast();
  const [tentativas, setTentativas] = useState<TentativaDuplicidade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTentativas();
  }, []);

  const fetchTentativas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tentativas_duplicidade_refeicoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTentativas(data || []);
    } catch (error) {
      console.error("Erro ao buscar tentativas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as tentativas de duplicidade.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("tentativas_duplicidade_refeicoes")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      setTentativas(prev => prev.filter(t => t.id !== deletingId));
      toast({
        title: "Sucesso",
        description: "Registro removido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o registro.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const tentativasFiltradas = tentativas.filter((t) => {
    const searchLower = pesquisa.toLowerCase();
    return (
      t.colaborador_nome.toLowerCase().includes(searchLower) ||
      t.tipo_pessoa.toLowerCase().includes(searchLower) ||
      (tipoRefeicaoLabels[t.tipo_refeicao]?.label || t.tipo_refeicao).toLowerCase().includes(searchLower)
    );
  });

  const exportExcel = () => {
    const dataExport = tentativasFiltradas.map((t) => ({
      "Data": format(new Date(t.data_tentativa), "dd/MM/yyyy"),
      "Hora": t.hora_tentativa,
      "Nome": t.colaborador_nome,
      "Tipo": t.tipo_pessoa === "colaborador" ? "Colaborador" : "Visitante",
      "Refeição": tipoRefeicaoLabels[t.tipo_refeicao]?.label || t.tipo_refeicao,
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tentativas Duplicidade");
    XLSX.writeFile(wb, `tentativas_duplicidade_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Tentativas de Duplicidade de Refeições');

    const tableData = tentativasFiltradas.map((t) => [
      format(new Date(t.data_tentativa), "dd/MM/yyyy"),
      t.hora_tentativa,
      t.colaborador_nome,
      t.tipo_pessoa === "colaborador" ? "Colaborador" : "Visitante",
      tipoRefeicaoLabels[t.tipo_refeicao]?.label || t.tipo_refeicao,
    ]);

    autoTable(doc, {
      head: [["Data", "Hora", "Nome", "Tipo", "Refeição"]],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 125, 210] },
      margin: { bottom: 28 },
    });

    savePdfWithFooter(doc, 'Tentativas de Duplicidade de Refeições', `tentativas_duplicidade_${format(new Date(), "yyyy-MM-dd")}`, logoImg);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Tentativas de Duplicidade
            </CardTitle>
            <CardDescription>
              Registro de tentativas de refeições duplicadas no mesmo dia
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={fetchTentativas}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            <ExportDropdown onExportExcel={exportExcel} onExportPDF={exportPDF} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtro */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, tipo ou refeição..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Estatísticas */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total de tentativas: <strong className="text-foreground">{tentativas.length}</strong></span>
          {pesquisa && (
            <span>Filtrados: <strong className="text-foreground">{tentativasFiltradas.length}</strong></span>
          )}
        </div>

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Refeição</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tentativasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {pesquisa 
                      ? "Nenhuma tentativa encontrada para esta busca."
                      : "Nenhuma tentativa de duplicidade registrada."}
                  </TableCell>
                </TableRow>
              ) : (
                tentativasFiltradas.map((tentativa) => (
                  <TableRow key={tentativa.id}>
                    <TableCell>
                      {format(new Date(tentativa.data_tentativa), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{tentativa.hora_tentativa}</TableCell>
                    <TableCell className="font-medium">{tentativa.colaborador_nome}</TableCell>
                    <TableCell>
                      <Badge variant={tentativa.tipo_pessoa === "colaborador" ? "default" : "secondary"}>
                        {tentativa.tipo_pessoa === "colaborador" ? "Colaborador" : "Visitante"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tipoRefeicaoLabels[tentativa.tipo_refeicao]?.icon}
                        <span>{tipoRefeicaoLabels[tentativa.tipo_refeicao]?.label || tentativa.tipo_refeicao}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingId(tentativa.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-sm text-muted-foreground">
          Total: {tentativasFiltradas.length} registro(s)
        </p>
      </CardContent>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de tentativa de duplicidade?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
