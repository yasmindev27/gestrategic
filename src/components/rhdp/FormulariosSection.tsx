import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, 
  Plus, 
  Search, 
  ExternalLink, 
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  Edit,
  Trash2
} from "lucide-react";
import { FormularioDialog } from "./FormularioDialog";
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

interface Formulario {
  id: string;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  status: string;
  created_at: string;
  respostas_count?: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-success/10 text-success border-success/20" },
  encerrado: { label: "Encerrado", className: "bg-muted text-muted-foreground border-muted" },
  rascunho: { label: "Rascunho", className: "bg-warning/10 text-warning border-warning/20" }
};

export const FormulariosSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFormulario, setSelectedFormulario] = useState<Formulario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formularioToDelete, setFormularioToDelete] = useState<Formulario | null>(null);

  useEffect(() => {
    loadFormularios();
  }, []);

  const loadFormularios = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("formularios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Carregar contagem de respostas para cada formulário
      const formulariosComRespostas = await Promise.all(
        (data || []).map(async (form) => {
          const { count } = await supabase
            .from("formulario_respostas")
            .select("*", { count: "exact", head: true })
            .eq("formulario_id", form.id);
          
          return {
            ...form,
            respostas_count: count || 0
          };
        })
      );

      setFormularios(formulariosComRespostas);
    } catch (error) {
      console.error("Erro ao carregar formulários:", error);
      toast.error("Erro ao carregar formulários");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (formulario: Formulario) => {
    setSelectedFormulario(formulario);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedFormulario(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!formularioToDelete) return;

    try {
      const { error } = await supabase
        .from("formularios")
        .delete()
        .eq("id", formularioToDelete.id);

      if (error) throw error;

      toast.success("Formulário excluído com sucesso");
      loadFormularios();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir formulário");
    } finally {
      setDeleteDialogOpen(false);
      setFormularioToDelete(null);
    }
  };

  const filteredFormularios = formularios.filter(form =>
    form.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (form.descricao && form.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalRespostas = formularios.reduce((acc, form) => acc + (form.respostas_count || 0), 0);
  const formulariosAtivos = formularios.filter(f => f.status === "ativo").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formularios.length}</p>
                <p className="text-sm text-muted-foreground">Total de Formulários</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formulariosAtivos}</p>
                <p className="text-sm text-muted-foreground">Formulários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRespostas}</p>
                <p className="text-sm text-muted-foreground">Total de Respostas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar formulários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Formulário
        </Button>
      </div>

      {/* Lista de formulários */}
      <div className="grid gap-4">
        {filteredFormularios.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum formulário encontrado" : "Nenhum formulário criado ainda"}
              </p>
              {!searchTerm && (
                <Button onClick={handleCreate} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro formulário
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredFormularios.map((form) => (
            <Card key={form.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{form.titulo}</h3>
                      <Badge 
                        variant="outline" 
                        className={statusConfig[form.status]?.className || ""}
                      >
                        {statusConfig[form.status]?.label || form.status}
                      </Badge>
                    </div>
                    {form.descricao && (
                      <p className="text-sm text-muted-foreground">{form.descricao}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {form.respostas_count || 0} respostas
                      </span>
                      {form.prazo && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Prazo: {new Date(form.prazo).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Criado em: {new Date(form.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => handleEdit(form)}
                    >
                      <Edit className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setFormularioToDelete(form);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de criação/edição */}
      <FormularioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        formulario={selectedFormulario}
        onSuccess={loadFormularios}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O formulário "{formularioToDelete?.titulo}" 
              e todas as suas respostas serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
