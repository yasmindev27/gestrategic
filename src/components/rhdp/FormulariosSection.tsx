import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  Search, 
  ExternalLink, 
  Calendar,
  Users,
  CheckCircle2,
  Clock
} from "lucide-react";

interface Formulario {
  id: string;
  titulo: string;
  descricao: string;
  respostas: number;
  prazo: string;
  status: "ativo" | "encerrado" | "rascunho";
  criadoEm: string;
}

const mockFormularios: Formulario[] = [
  {
    id: "1",
    titulo: "Pesquisa de Clima Organizacional 2025",
    descricao: "Avaliação anual do ambiente de trabalho",
    respostas: 87,
    prazo: "2025-02-15",
    status: "ativo",
    criadoEm: "2025-01-10"
  },
  {
    id: "2",
    titulo: "Avaliação de Desempenho - 1º Semestre",
    descricao: "Formulário de autoavaliação e feedback",
    respostas: 145,
    prazo: "2025-01-31",
    status: "ativo",
    criadoEm: "2025-01-05"
  },
  {
    id: "3",
    titulo: "Solicitação de Férias",
    descricao: "Formulário padrão para solicitação de férias",
    respostas: 234,
    prazo: "Permanente",
    status: "ativo",
    criadoEm: "2024-06-01"
  },
  {
    id: "4",
    titulo: "Pesquisa de Benefícios 2024",
    descricao: "Levantamento de preferências de benefícios",
    respostas: 156,
    prazo: "2024-12-20",
    status: "encerrado",
    criadoEm: "2024-11-15"
  }
];

const statusConfig = {
  ativo: { label: "Ativo", className: "bg-success/10 text-success border-success/20" },
  encerrado: { label: "Encerrado", className: "bg-muted text-muted-foreground border-muted" },
  rascunho: { label: "Rascunho", className: "bg-warning/10 text-warning border-warning/20" }
};

export const FormulariosSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [formularios] = useState<Formulario[]>(mockFormularios);

  const filteredFormularios = formularios.filter(form =>
    form.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRespostas = formularios.reduce((acc, form) => acc + form.respostas, 0);
  const formulariosAtivos = formularios.filter(f => f.status === "ativo").length;

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
        <Button className="flex items-center gap-2">
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
              <p className="text-muted-foreground">Nenhum formulário encontrado</p>
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
                        className={statusConfig[form.status].className}
                      >
                        {statusConfig[form.status].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{form.descricao}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {form.respostas} respostas
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Prazo: {form.prazo === "Permanente" ? form.prazo : new Date(form.prazo).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Criado em: {new Date(form.criadoEm).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Visualizar
                    </Button>
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
