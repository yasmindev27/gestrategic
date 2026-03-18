import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Users, 
  Loader2,
  UserPlus,
  FileDown,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ColaboradorRestaurante {
  id: string;
  nome: string;
  matricula: string | null;
  setor: string | null;
  cargo: string | null;
  ativo: boolean;
  created_at: string;
}

export const ColaboradoresManager = () => {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [colaboradores, setColaboradores] = useState<ColaboradorRestaurante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState<"todos" | "ativos" | "inativos">("ativos");
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    matricula: "",
    setor: "",
    cargo: "",
    ativo: true,
  });

  useEffect(() => {
    fetchColaboradores();
  }, []);

  const fetchColaboradores = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("colaboradores_restaurante")
        .select("*")
        .order("nome");

      if (error) throw error;
      setColaboradores(data || []);
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os colaboradores.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (colaborador?: ColaboradorRestaurante) => {
    if (colaborador) {
      setEditingId(colaborador.id);
      setFormData({
        nome: colaborador.nome,
        matricula: colaborador.matricula || "",
        setor: colaborador.setor || "",
        cargo: colaborador.cargo || "",
        ativo: colaborador.ativo,
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: "",
        matricula: "",
        setor: "",
        cargo: "",
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingId) {
        // Atualizar
        const { error } = await supabase
          .from("colaboradores_restaurante")
          .update({
            nome: formData.nome.trim(),
            matricula: formData.matricula.trim() || null,
            setor: formData.setor.trim() || null,
            cargo: formData.cargo.trim() || null,
            ativo: formData.ativo,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Colaborador atualizado!" });
      } else {
        // Criar
        const { error } = await supabase
          .from("colaboradores_restaurante")
          .insert({
            nome: formData.nome.trim(),
            matricula: formData.matricula.trim() || null,
            setor: formData.setor.trim() || null,
            cargo: formData.cargo.trim() || null,
            ativo: formData.ativo,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({ title: "Sucesso", description: "Colaborador cadastrado!" });
      }

      setDialogOpen(false);
      fetchColaboradores();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o colaborador.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from("colaboradores_restaurante")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Colaborador excluído!" });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchColaboradores();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o colaborador.",
        variant: "destructive",
      });
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from("colaboradores_restaurante")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;
      
      toast({ 
        title: "Sucesso", 
        description: `Colaborador ${!ativo ? "ativado" : "desativado"}!` 
      });
      fetchColaboradores();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status.",
        variant: "destructive",
      });
    }
  };

  // Filtrar colaboradores
  const colaboradoresFiltrados = colaboradores.filter(c => {
    const matchPesquisa = c.nome.toLowerCase().includes(pesquisa.toLowerCase()) ||
      (c.matricula?.toLowerCase().includes(pesquisa.toLowerCase())) ||
      (c.setor?.toLowerCase().includes(pesquisa.toLowerCase())) ||
      (c.cargo?.toLowerCase().includes(pesquisa.toLowerCase()));
    
    const matchAtivo = filtroAtivo === "todos" || 
      (filtroAtivo === "ativos" && c.ativo) ||
      (filtroAtivo === "inativos" && !c.ativo);
    
    return matchPesquisa && matchAtivo;
  });

  // Exportar Excel
  const exportExcel = () => {
    const data = colaboradoresFiltrados.map(c => ({
      "Nome": c.nome,
      "Matrícula": c.matricula || "-",
      "Setor": c.setor || "-",
      "Cargo": c.cargo || "-",
      "Status": c.ativo ? "Ativo" : "Inativo",
      "Cadastrado em": format(new Date(c.created_at), "dd/MM/yyyy"),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
    XLSX.writeFile(wb, `colaboradores_restaurante_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast({ title: "Sucesso", description: "Arquivo Excel exportado!" });
  };

  // Exportar PDF
  const exportPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Colaboradores do Restaurante');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${colaboradoresFiltrados.length} colaboradores`, 14, 32);
    
    autoTable(doc, {
      head: [["Nome", "Matrícula", "Setor", "Cargo", "Status"]],
      body: colaboradoresFiltrados.map(c => [
        c.nome,
        c.matricula || "-",
        c.setor || "-",
        c.cargo || "-",
        c.ativo ? "Ativo" : "Inativo",
      ]),
      startY: 38,
      styles: { fontSize: 9 },
      margin: { bottom: 28 },
    });
    
    savePdfWithFooter(doc, 'Colaboradores do Restaurante', `colaboradores_restaurante_${format(new Date(), "yyyyMMdd")}`, logoImg);
    toast({ title: "Sucesso", description: "Arquivo PDF exportado!" });
  };

  // Importar Excel
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

          if (jsonData.length === 0) {
            toast({
              title: "Arquivo vazio",
              description: "A planilha não contém dados para importar.",
              variant: "destructive",
            });
            setIsImporting(false);
            return;
          }

          // Mapear colunas possíveis
          const colaboradoresParaInserir = jsonData.map((row) => {
            const nome = row["Nome"] || row["NOME"] || row["nome"] || row["Colaborador"] || row["COLABORADOR"] || "";
            const matricula = row["Matrícula"] || row["MATRÍCULA"] || row["matricula"] || row["Matricula"] || row["MATRICULA"] || "";
            const setor = row["Setor"] || row["SETOR"] || row["setor"] || "";
            const cargo = row["Cargo"] || row["CARGO"] || row["cargo"] || row["Função"] || row["FUNÇÃO"] || row["funcao"] || "";
            
            return {
              nome: String(nome).trim(),
              matricula: matricula ? String(matricula).trim() : null,
              setor: setor ? String(setor).trim() : null,
              cargo: cargo ? String(cargo).trim() : null,
              ativo: true,
              created_by: user?.id,
            };
          }).filter(c => c.nome); // Remove linhas sem nome

          if (colaboradoresParaInserir.length === 0) {
            toast({
              title: "Erro de formato",
              description: "Nenhum nome encontrado. Verifique se há uma coluna 'Nome' na planilha.",
              variant: "destructive",
            });
            setIsImporting(false);
            return;
          }

          // Inserir em lote
          const { error } = await supabase
            .from("colaboradores_restaurante")
            .insert(colaboradoresParaInserir);

          if (error) throw error;

          toast({
            title: "Importação concluída!",
            description: `${colaboradoresParaInserir.length} colaborador(es) importado(s) com sucesso.`,
          });
          
          fetchColaboradores();
        } catch (parseError) {
          console.error("Erro ao processar arquivo:", parseError);
          toast({
            title: "Erro na importação",
            description: "Não foi possível processar o arquivo. Verifique o formato.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
          // Limpar o input para permitir reimportar o mesmo arquivo
          event.target.value = "";
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível importar os colaboradores.",
        variant: "destructive",
      });
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Colaboradores da UPA
              </CardTitle>
              <CardDescription>
                Funcionários CLT, Externos e PJ
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportDropdown onExportExcel={exportExcel} onExportPDF={exportPDF} />
              {isAdmin && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={isImporting}
                    onClick={() => document.getElementById("import-excel-input")?.click()}
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Importar
                  </Button>
                  <input
                    id="import-excel-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                  <Button onClick={() => handleOpenDialog()}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Novo
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, matrícula, setor ou cargo..."
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filtroAtivo === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroAtivo("todos")}
              >
                Todos ({colaboradores.length})
              </Button>
              <Button
                variant={filtroAtivo === "ativos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroAtivo("ativos")}
              >
                Ativos ({colaboradores.filter(c => c.ativo).length})
              </Button>
              <Button
                variant={filtroAtivo === "inativos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroAtivo("inativos")}
              >
                Inativos ({colaboradores.filter(c => !c.ativo).length})
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colaboradoresFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {pesquisa 
                        ? "Nenhum colaborador encontrado para esta busca."
                        : "Nenhum colaborador cadastrado ainda."}
                    </TableCell>
                  </TableRow>
                ) : (
                  colaboradoresFiltrados.map((colaborador) => (
                    <TableRow key={colaborador.id}>
                      <TableCell className="font-medium">{colaborador.nome}</TableCell>
                      <TableCell>{colaborador.matricula || "-"}</TableCell>
                      <TableCell>{colaborador.setor || "-"}</TableCell>
                      <TableCell>{colaborador.cargo || "-"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={colaborador.ativo ? "default" : "secondary"}
                          className={isAdmin ? "cursor-pointer" : ""}
                          onClick={isAdmin ? () => toggleAtivo(colaborador.id, colaborador.ativo) : undefined}
                        >
                          {colaborador.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(colaborador)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingId(colaborador.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground">
            Total: {colaboradoresFiltrados.length} colaborador(es)
          </p>
        </CardContent>
      </Card>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Colaborador" : "Novo Colaborador"}
            </DialogTitle>
            <DialogDescription>
              {editingId 
                ? "Atualize as informações do colaborador."
                : "Cadastre um novo colaborador para o totem de refeições."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do colaborador"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula</Label>
                <Input
                  id="matricula"
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                  placeholder="Ex: 12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setor">Setor</Label>
                <Input
                  id="setor"
                  value={formData.setor}
                  onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                  placeholder="Ex: Enfermagem"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Ex: Técnico de Enfermagem"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="ativo">Colaborador ativo</Label>
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
