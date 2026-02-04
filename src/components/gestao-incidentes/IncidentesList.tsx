import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Incidente {
  id: string;
  numero_notificacao: string;
  tipo_incidente: string;
  categoria_operacional: string | null;
  data_ocorrencia: string;
  setor: string;
  local_ocorrencia: string;
  descricao: string;
  classificacao_risco: string;
  status: string;
  notificador_nome: string | null;
  notificacao_anonima: boolean;
  paciente_envolvido: boolean;
  paciente_nome: string | null;
  observacoes: string | null;
  created_at: string;
}

const tiposIncidente = [
  { value: "evento_adverso", label: "Evento Adverso" },
  { value: "quase_erro", label: "Quase Erro" },
  { value: "incidente_sem_dano", label: "Incidente sem Dano" },
];

const classificacoesRisco = [
  { value: "leve", label: "Leve", color: "bg-green-500" },
  { value: "moderado", label: "Moderado", color: "bg-yellow-500" },
  { value: "grave", label: "Grave", color: "bg-orange-500" },
  { value: "catastrofico", label: "Catastrófico", color: "bg-red-600" },
];

interface IncidentesListProps {
  refreshTrigger?: number;
}

export function IncidentesList({ refreshTrigger }: IncidentesListProps) {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [selectedIncidente, setSelectedIncidente] = useState<Incidente | null>(null);

  useEffect(() => {
    loadIncidentes();
  }, [refreshTrigger]);

  const loadIncidentes = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("incidentes_nsp")
      .select("*")
      .order("data_ocorrencia", { ascending: false })
      .limit(100);
    
    if (data) setIncidentes(data);
    setIsLoading(false);
  };

  const filteredIncidentes = incidentes.filter(i => {
    const matchSearch = searchTerm === "" || 
      i.numero_notificacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.setor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "todos" || i.status === statusFilter;
    const matchTipo = tipoFilter === "todos" || i.tipo_incidente === tipoFilter;
    return matchSearch && matchStatus && matchTipo;
  });

  const getRiscoColor = (risco: string) => {
    const r = classificacoesRisco.find(c => c.value === risco);
    return r?.color || "bg-gray-500";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "notificado": return <Clock className="h-4 w-4 text-warning" />;
      case "em_analise": return <AlertTriangle className="h-4 w-4 text-primary" />;
      case "encerrado": return <CheckCircle2 className="h-4 w-4 text-success" />;
      default: return null;
    }
  };

  const exportToExcel = () => {
    const data = filteredIncidentes.map(i => ({
      Número: i.numero_notificacao,
      Data: format(new Date(i.data_ocorrencia), "dd/MM/yyyy HH:mm"),
      Tipo: tiposIncidente.find(t => t.value === i.tipo_incidente)?.label || i.tipo_incidente,
      Setor: i.setor,
      Categoria: i.categoria_operacional || "-",
      Risco: classificacoesRisco.find(c => c.value === i.classificacao_risco)?.label || i.classificacao_risco,
      Status: i.status,
      Descrição: i.descricao,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidentes");
    XLSX.writeFile(wb, `incidentes-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Incidentes", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [["Número", "Data", "Tipo", "Setor", "Risco", "Status"]],
      body: filteredIncidentes.map(i => [
        i.numero_notificacao,
        format(new Date(i.data_ocorrencia), "dd/MM/yyyy"),
        tiposIncidente.find(t => t.value === i.tipo_incidente)?.label || "",
        i.setor,
        classificacoesRisco.find(c => c.value === i.classificacao_risco)?.label || "",
        i.status,
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`incidentes-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (isLoading) {
    return <LoadingState message="Carregando incidentes..." />;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-lg">Incidentes Registrados</CardTitle>
          <ExportDropdown onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
        </div>
        
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por número, descrição ou setor..."
            className="md:w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="notificado">Notificado</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Tipos</SelectItem>
              {tiposIncidente.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredIncidentes.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Nenhum incidente encontrado"
            description="Não há incidentes registrados com os filtros selecionados"
          />
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidentes.map((inc) => (
                  <TableRow key={inc.id}>
                    <TableCell className="font-mono text-sm">{inc.numero_notificacao}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(inc.data_ocorrencia), "dd/MM/yy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {tiposIncidente.find(t => t.value === inc.tipo_incidente)?.label || inc.tipo_incidente}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{inc.setor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inc.categoria_operacional || "-"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${getRiscoColor(inc.classificacao_risco)}`}>
                        {classificacoesRisco.find(c => c.value === inc.classificacao_risco)?.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(inc.status)}
                        <span className="text-sm capitalize">{inc.status.replace("_", " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedIncidente(inc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Dialog de detalhes */}
        <Dialog open={!!selectedIncidente} onOpenChange={() => setSelectedIncidente(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Detalhes do Incidente - {selectedIncidente?.numero_notificacao}
              </DialogTitle>
            </DialogHeader>
            {selectedIncidente && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
                    <p>{format(new Date(selectedIncidente.data_ocorrencia), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                    <p>{tiposIncidente.find(t => t.value === selectedIncidente.tipo_incidente)?.label}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Setor</label>
                    <p>{selectedIncidente.setor}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Local</label>
                    <p>{selectedIncidente.local_ocorrencia || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                    <p>{selectedIncidente.categoria_operacional || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Risco</label>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${getRiscoColor(selectedIncidente.classificacao_risco)}`}>
                      {classificacoesRisco.find(c => c.value === selectedIncidente.classificacao_risco)?.label}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notificador</label>
                    <p>{selectedIncidente.notificacao_anonima ? "Anônimo" : selectedIncidente.notificador_nome || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Paciente Envolvido</label>
                    <p>{selectedIncidente.paciente_envolvido ? `Sim - ${selectedIncidente.paciente_nome || ""}` : "Não"}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedIncidente.descricao}</p>
                </div>
                {selectedIncidente.observacoes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações</label>
                    <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedIncidente.observacoes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
