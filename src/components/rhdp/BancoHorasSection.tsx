import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Clock, TrendingUp, TrendingDown, Download, Upload, Filter, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

interface BancoHora {
  id: string;
  funcionario_user_id: string;
  funcionario_nome: string;
  data: string;
  tipo: string;
  horas: number;
  motivo: string | null;
  observacao: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export const BancoHorasSection = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [registros, setRegistros] = useState<BancoHora[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    funcionario_user_id: "",
    data: format(new Date(), "yyyy-MM-dd"),
    tipo: "credito",
    horas: "",
    motivo: "",
    observacao: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [registrosRes, profilesRes] = await Promise.all([
        supabase
          .from("banco_horas")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .order("full_name"),
      ]);

      if (registrosRes.error) throw registrosRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setRegistros(registrosRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProfile = profiles.find(p => p.user_id === formData.funcionario_user_id);
    if (!selectedProfile) {
      toast({
        title: "Erro",
        description: "Selecione um colaborador.",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("banco_horas").insert({
      funcionario_user_id: formData.funcionario_user_id,
      funcionario_nome: selectedProfile.full_name,
      data: formData.data,
      tipo: formData.tipo,
      horas: parseFloat(formData.horas),
      motivo: formData.motivo || null,
      observacao: formData.observacao || null,
      registrado_por: user.id,
      status: "aprovado",
    });

    if (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o registro.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Registro de horas salvo com sucesso.",
    });

    setIsDialogOpen(false);
    setFormData({
      funcionario_user_id: "",
      data: format(new Date(), "yyyy-MM-dd"),
      tipo: "credito",
      horas: "",
      motivo: "",
      observacao: "",
    });
    loadData();
  };

  const calcularSaldo = (funcionarioId: string) => {
    const registrosFuncionario = registros.filter(
      r => r.funcionario_user_id === funcionarioId
    );
    
    let saldo = 0;
    registrosFuncionario.forEach(r => {
      if (r.tipo === "credito") {
        saldo += Number(r.horas);
      } else {
        saldo -= Number(r.horas);
      }
    });
    
    return saldo;
  };

  const filteredRegistros = registros.filter(r => {
    const matchesSearch = r.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === "todos" || r.tipo === filterTipo;
    const matchesDataInicio = !filterDataInicio || r.data >= filterDataInicio;
    const matchesDataFim = !filterDataFim || r.data <= filterDataFim;
    return matchesSearch && matchesTipo && matchesDataInicio && matchesDataFim;
  });

  const totalCreditos = registros
    .filter(r => r.tipo === "credito")
    .reduce((sum, r) => sum + Number(r.horas), 0);

  const totalDebitos = registros
    .filter(r => r.tipo === "debito")
    .reduce((sum, r) => sum + Number(r.horas), 0);

  // Get export data
  const getExportData = () => {
    const headers = ["Colaborador", "Data", "Tipo", "Horas", "Motivo", "Observação", "Saldo Atual"];
    const rows = filteredRegistros.map(r => [
      r.funcionario_nome,
      format(new Date(r.data), "dd/MM/yyyy"),
      r.tipo === "credito" ? "Crédito" : "Débito",
      Number(r.horas).toFixed(1),
      r.motivo || "",
      r.observacao || "",
      calcularSaldo(r.funcionario_user_id).toFixed(1) + "h",
    ]);
    return { headers, rows };
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    const { headers, rows } = getExportData();
    exportToCSV({
      title: 'Banco de Horas',
      headers,
      rows,
      fileName: 'banco_horas',
    });

    toast({
      title: "Exportado",
      description: "Arquivo CSV exportado com sucesso.",
    });
  };

  // Exportar para PDF
  const handleExportPDF = () => {
    const { headers, rows } = getExportData();
    exportToPDF({
      title: 'Banco de Horas',
      headers,
      rows,
      fileName: 'banco_horas',
      orientation: 'landscape',
    });

    toast({
      title: "Exportado",
      description: "Arquivo PDF exportado com sucesso.",
    });
  };

  // Exportar para Excel (XLSX original)
  const handleExportExcel = () => {
    const dataToExport = filteredRegistros.map(r => ({
      "Colaborador": r.funcionario_nome,
      "Data": format(new Date(r.data), "dd/MM/yyyy"),
      "Tipo": r.tipo === "credito" ? "Crédito" : "Débito",
      "Horas": Number(r.horas).toFixed(1),
      "Motivo": r.motivo || "",
      "Observação": r.observacao || "",
      "Saldo Atual": calcularSaldo(r.funcionario_user_id).toFixed(1) + "h",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Banco de Horas");
    XLSX.writeFile(wb, `banco_horas_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

    toast({
      title: "Exportado",
      description: "Planilha exportada com sucesso.",
    });
  };

  // Importar do Excel
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        let importados = 0;
        let erros = 0;

        for (const row of jsonData) {
          const colaboradorNome = String(row["Colaborador"] || row["colaborador"] || "");
          const profile = profiles.find(p => 
            p.full_name.toLowerCase() === colaboradorNome.toLowerCase()
          );

          if (!profile) {
            erros++;
            continue;
          }

          const tipoRaw = String(row["Tipo"] || row["tipo"] || "").toLowerCase();
          const tipo = tipoRaw.includes("créd") || tipoRaw.includes("cred") ? "credito" : "debito";

          let dataValue = row["Data"] || row["data"];
          let dataFormatted: string;
          
          if (typeof dataValue === "number") {
            // Excel date serial number
            const date = XLSX.SSF.parse_date_code(dataValue);
            dataFormatted = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
          } else {
            const dateStr = String(dataValue);
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              dataFormatted = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            } else {
              dataFormatted = dateStr;
            }
          }

          const horas = parseFloat(String(row["Horas"] || row["horas"] || "0").replace(",", "."));

          const { error } = await supabase.from("banco_horas").insert({
            funcionario_user_id: profile.user_id,
            funcionario_nome: profile.full_name,
            data: dataFormatted,
            tipo,
            horas,
            motivo: String(row["Motivo"] || row["motivo"] || "") || null,
            observacao: String(row["Observação"] || row["observacao"] || row["Observacao"] || "") || null,
            registrado_por: user.id,
            status: "aprovado",
          });

          if (error) {
            erros++;
          } else {
            importados++;
          }
        }

        toast({
          title: "Importação concluída",
          description: `${importados} registros importados. ${erros > 0 ? `${erros} erros.` : ""}`,
        });

        loadData();
      } catch (error) {
        console.error("Erro na importação:", error);
        toast({
          title: "Erro",
          description: "Erro ao processar a planilha.",
          variant: "destructive",
        });
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Créditos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{totalCreditos.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Débitos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{totalDebitos.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Geral</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalCreditos - totalDebitos >= 0 ? "text-green-600" : "text-red-600"}`}>
              {(totalCreditos - totalDebitos).toFixed(1)}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Registro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Registro de Horas</DialogTitle>
                  <DialogDescription>
                    Registre crédito ou débito de horas para um colaborador.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="funcionario">Colaborador</Label>
                    <Select
                      value={formData.funcionario_user_id}
                      onValueChange={(value) => setFormData({ ...formData, funcionario_user_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="data">Data</Label>
                      <Input
                        id="data"
                        type="date"
                        value={formData.data}
                        onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credito">Crédito (+)</SelectItem>
                          <SelectItem value="debito">Débito (-)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="horas">Horas</Label>
                    <Input
                      id="horas"
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={formData.horas}
                      onChange={(e) => setFormData({ ...formData, horas: e.target.value })}
                      placeholder="Ex: 2.5"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivo">Motivo</Label>
                    <Input
                      id="motivo"
                      value={formData.motivo}
                      onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                      placeholder="Hora extra, compensação, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacao">Observação</Label>
                    <Textarea
                      id="observacao"
                      value={formData.observacao}
                      onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                      placeholder="Observações adicionais..."
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Salvar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros expandidos */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-secondary/30 rounded-lg">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Tipos</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                value={filterDataInicio}
                onChange={(e) => setFilterDataInicio(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterTipo("todos");
                  setFilterDataInicio("");
                  setFilterDataFim("");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Saldo Atual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : filteredRegistros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredRegistros.map((registro) => (
                <TableRow key={registro.id}>
                  <TableCell className="font-medium">{registro.funcionario_nome}</TableCell>
                  <TableCell>
                    {format(new Date(registro.data), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={registro.tipo === "credito" ? "default" : "secondary"}>
                      {registro.tipo === "credito" ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {registro.tipo === "credito" ? "Crédito" : "Débito"}
                    </Badge>
                  </TableCell>
                  <TableCell className={registro.tipo === "credito" ? "text-green-600" : "text-red-600"}>
                    {registro.tipo === "credito" ? "+" : "-"}{Number(registro.horas).toFixed(1)}h
                  </TableCell>
                  <TableCell>{registro.motivo || "-"}</TableCell>
                  <TableCell className="font-medium">
                    {calcularSaldo(registro.funcionario_user_id).toFixed(1)}h
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
