import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  TableRow,
} from "@/components/ui/table";
import {
  UtensilsCrossed,
  Loader2,
  Filter,
  FileSpreadsheet,
  FileDown,
  Coffee,
  Sun,
  Cookie,
  Moon,
  Clock,
  User,
  Users,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RegistroRefeicao {
  id: string;
  tipo_pessoa: string;
  colaborador_nome: string;
  tipo_refeicao: string;
  data_registro: string;
  hora_registro: string;
  created_at: string;
}

const tipoRefeicaoInfo: Record<string, { label: string; icon: React.ReactNode; cor: string }> = {
  cafe: { label: "Café da Manhã", icon: <Coffee className="h-4 w-4" />, cor: "bg-amber-100 text-amber-700" },
  almoco: { label: "Almoço", icon: <Sun className="h-4 w-4" />, cor: "bg-orange-100 text-orange-700" },
  lanche: { label: "Café da Tarde", icon: <Cookie className="h-4 w-4" />, cor: "bg-pink-100 text-pink-700" },
  jantar: { label: "Jantar", icon: <Moon className="h-4 w-4" />, cor: "bg-indigo-100 text-indigo-700" },
  fora_horario: { label: "Fora de Horário", icon: <Clock className="h-4 w-4" />, cor: "bg-gray-100 text-gray-700" },
};

interface RegistrosRefeicoesProps {
  isAdmin?: boolean;
}

export const RegistrosRefeicoes = ({ isAdmin = false }: RegistrosRefeicoesProps) => {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<RegistroRefeicao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filtroTipoRefeicao, setFiltroTipoRefeicao] = useState<string>("todos");
  const [filtroTipoPessoa, setFiltroTipoPessoa] = useState<string>("todos");
  const [buscaNome, setBuscaNome] = useState("");

  // Estatísticas
  const stats = {
    total: registros.length,
    colaboradores: registros.filter(r => r.tipo_pessoa === "colaborador").length,
    visitantes: registros.filter(r => r.tipo_pessoa === "visitante").length,
    cafe: registros.filter(r => r.tipo_refeicao === "cafe").length,
    almoco: registros.filter(r => r.tipo_refeicao === "almoco").length,
    lanche: registros.filter(r => r.tipo_refeicao === "lanche").length,
    jantar: registros.filter(r => r.tipo_refeicao === "jantar").length,
    foraHorario: registros.filter(r => r.tipo_refeicao === "fora_horario").length,
  };

  const fetchRegistros = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("refeicoes_registros")
        .select("*")
        .gte("data_registro", dataInicio)
        .lte("data_registro", dataFim)
        .order("data_registro", { ascending: false })
        .order("hora_registro", { ascending: false });
      
      if (filtroTipoRefeicao !== "todos") {
        query = query.eq("tipo_refeicao", filtroTipoRefeicao);
      }
      if (filtroTipoPessoa !== "todos") {
        query = query.eq("tipo_pessoa", filtroTipoPessoa);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filtrar por nome localmente
      let registrosFiltrados = data || [];
      if (buscaNome.trim()) {
        registrosFiltrados = registrosFiltrados.filter(r =>
          r.colaborador_nome.toLowerCase().includes(buscaNome.toLowerCase())
        );
      }
      
      setRegistros(registrosFiltrados);
    } catch (error) {
      console.error("Erro ao buscar registros:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os registros.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, [dataInicio, dataFim, filtroTipoRefeicao, filtroTipoPessoa, buscaNome]);

  const exportToExcel = () => {
    const dataToExport = registros.map(r => ({
      "Nome": r.colaborador_nome,
      "Tipo": r.tipo_pessoa === "colaborador" ? "Colaborador" : "Visitante",
      "Data": format(new Date(r.data_registro + "T12:00:00"), "dd/MM/yyyy"),
      "Hora": r.hora_registro.substring(0, 5),
      "Tipo de Refeição": tipoRefeicaoInfo[r.tipo_refeicao]?.label || r.tipo_refeicao,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros de Refeições");
    
    const fileName = `refeicoes_${format(new Date(dataInicio), "ddMMyyyy")}_${format(new Date(dataFim), "ddMMyyyy")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Sucesso",
      description: "Arquivo Excel exportado com sucesso.",
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text("Relatório de Refeições", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Período: ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}`, 14, 32);
    
    // Stats
    doc.setFontSize(10);
    doc.text(`Total: ${stats.total} | Colaboradores: ${stats.colaboradores} | Visitantes: ${stats.visitantes}`, 14, 42);
    
    // Table
    const tableData = registros.map(r => [
      r.colaborador_nome,
      r.tipo_pessoa === "colaborador" ? "Colaborador" : "Visitante",
      format(new Date(r.data_registro + "T12:00:00"), "dd/MM/yyyy"),
      r.hora_registro.substring(0, 5),
      tipoRefeicaoInfo[r.tipo_refeicao]?.label || r.tipo_refeicao,
    ]);

    autoTable(doc, {
      startY: 50,
      head: [["Nome", "Tipo", "Data", "Hora", "Refeição"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    const fileName = `refeicoes_${format(new Date(dataInicio), "ddMMyyyy")}_${format(new Date(dataFim), "ddMMyyyy")}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Sucesso",
      description: "Arquivo PDF exportado com sucesso.",
    });
  };

  const totemUrl = "https://gestrategic.com/totem";

  return (
    <div className="space-y-4">
      {/* Header com link do Totem */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Registros de Refeições
              </CardTitle>
              <CardDescription>
                Visualize e exporte os registros do totem de refeições
              </CardDescription>
            </div>
            {isAdmin && (
              <Button variant="outline" asChild>
                <a href={totemUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Totem
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Refeição</Label>
              <Select value={filtroTipoRefeicao} onValueChange={setFiltroTipoRefeicao}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="cafe">Café da Manhã</SelectItem>
                  <SelectItem value="almoco">Almoço</SelectItem>
                  <SelectItem value="lanche">Café da Tarde</SelectItem>
                  <SelectItem value="jantar">Jantar</SelectItem>
                  <SelectItem value="fora_horario">Fora de Horário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Usuário</Label>
              <Select value={filtroTipoPessoa} onValueChange={setFiltroTipoPessoa}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                  <SelectItem value="visitante">Visitante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Buscar Nome</Label>
              <Input
                type="text"
                placeholder="Digite o nome..."
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
                className="w-[180px]"
              />
            </div>
            
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Registros</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <User className="h-4 w-4 text-blue-500" />
              Colaboradores
            </CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.colaboradores}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.colaboradores / stats.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-4 w-4 text-purple-500" />
              Visitantes
            </CardDescription>
            <CardTitle className="text-3xl text-purple-600">{stats.visitantes}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.visitantes / stats.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Por Refeição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1"><Coffee className="h-3 w-3" /> Café da Manhã</span>
              <span>{stats.cafe}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1"><Sun className="h-3 w-3" /> Almoço</span>
              <span>{stats.almoco}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1"><Cookie className="h-3 w-3" /> Café da Tarde</span>
              <span>{stats.lanche}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1"><Moon className="h-3 w-3" /> Jantar</span>
              <span>{stats.jantar}</span>
            </div>
            {stats.foraHorario > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Fora Horário</span>
                <span>{stats.foraHorario}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Registros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum registro encontrado no período.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Refeição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell className="font-medium">{registro.colaborador_nome}</TableCell>
                    <TableCell>
                      <Badge variant={registro.tipo_pessoa === "colaborador" ? "default" : "secondary"}>
                        {registro.tipo_pessoa === "colaborador" ? (
                          <><User className="h-3 w-3 mr-1" /> Colaborador</>
                        ) : (
                          <><Users className="h-3 w-3 mr-1" /> Visitante</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(registro.data_registro + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{registro.hora_registro.substring(0, 5)}</TableCell>
                    <TableCell>
                      <Badge className={tipoRefeicaoInfo[registro.tipo_refeicao]?.cor}>
                        {tipoRefeicaoInfo[registro.tipo_refeicao]?.icon}
                        <span className="ml-1">{tipoRefeicaoInfo[registro.tipo_refeicao]?.label}</span>
                      </Badge>
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
