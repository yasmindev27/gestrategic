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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Clock, TrendingUp, TrendingDown, Download, Upload, Filter, FileText, Pencil, Trash2 } from "lucide-react";
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
  matricula: string | null;
}

export const BancoHorasSection = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [registros, setRegistros] = useState<BancoHora[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<BancoHora | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [cardFilter, setCardFilter] = useState<"todos" | "credito" | "debito">("todos");
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

  const [editFormData, setEditFormData] = useState({
    funcionario_user_id: "",
    data: "",
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
          .order("funcionario_nome", { ascending: true }),
        supabase
          .from("profiles")
          .select("user_id, full_name, matricula")
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

  const openEditDialog = (registro: BancoHora) => {
    setSelectedRegistro(registro);
    setEditFormData({
      funcionario_user_id: registro.funcionario_user_id,
      data: registro.data,
      tipo: registro.tipo,
      horas: String(registro.horas),
      motivo: registro.motivo || "",
      observacao: registro.observacao || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegistro) return;
    const selectedProfile = profiles.find(p => p.user_id === editFormData.funcionario_user_id);
    if (!selectedProfile) return;
    const { error } = await supabase.from("banco_horas").update({
      funcionario_user_id: editFormData.funcionario_user_id,
      funcionario_nome: selectedProfile.full_name,
      data: editFormData.data,
      tipo: editFormData.tipo,
      horas: parseFloat(editFormData.horas),
      motivo: editFormData.motivo || null,
      observacao: editFormData.observacao || null,
    }).eq("id", selectedRegistro.id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
      return;
    }
    toast({ title: "Sucesso", description: "Registro atualizado." });
    setIsEditDialogOpen(false);
    setSelectedRegistro(null);
    loadData();
  };

  const handleDeleteBH = async () => {
    if (!selectedRegistro) return;
    const { error } = await supabase.from("banco_horas").delete().eq("id", selectedRegistro.id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Registro excluído." });
      loadData();
    }
    setDeleteDialogOpen(false);
    setSelectedRegistro(null);
  };
  const formatHM = (decimal: number): string => {
    const abs = Math.abs(decimal);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return `${h}h${String(m).padStart(2, '0')}min`;
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
    const matchesCard = cardFilter === "todos" || r.tipo === cardFilter;
    return matchesSearch && matchesTipo && matchesDataInicio && matchesDataFim && matchesCard;
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
      formatHM(calcularSaldo(r.funcionario_user_id)),
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
      "Saldo Atual": formatHM(calcularSaldo(r.funcionario_user_id)),
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

  // Helper: parse HH:MM or -HH:MM time string to decimal hours
  const parseTimeToDecimal = (timeStr: string): number => {
    if (!timeStr) return 0;
    const cleaned = String(timeStr).trim();
    const isNegative = cleaned.startsWith("-");
    const abs = cleaned.replace(/^-/, "");
    const parts = abs.split(":");
    if (parts.length === 2) {
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const decimal = h + m / 60;
      return isNegative ? -decimal : decimal;
    }
    return parseFloat(cleaned.replace(",", ".")) || 0;
  };

  // Helper: format date from various formats to yyyy-MM-dd
  const parseDateValue = (dataValue: unknown): string => {
    if (!dataValue) return format(new Date(), "yyyy-MM-dd");
    if (typeof dataValue === "number") {
      const date = XLSX.SSF.parse_date_code(dataValue);
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
    const dateStr = String(dataValue).trim();
    // MM/DD/YY or M/D/YY format (US)
    const slashParts = dateStr.split("/");
    if (slashParts.length === 3) {
      let month = slashParts[0].padStart(2, "0");
      let day = slashParts[1].padStart(2, "0");
      let year = slashParts[2];
      if (year.length === 2) year = "20" + year;
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  // Detect format: "Saldo Final" column = banco de horas format from external system
  const isBancoHorasExternalFormat = (row: Record<string, unknown>): boolean => {
    return "Saldo Final" in row || "Funcionario" in row || "Matricula" in row;
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

        if (jsonData.length === 0) {
          toast({ title: "Erro", description: "Planilha vazia.", variant: "destructive" });
          return;
        }

        let importados = 0;
        let erros = 0;
        const naoEncontrados: string[] = [];
        const isExternal = isBancoHorasExternalFormat(jsonData[0]);

        for (const row of jsonData) {
          if (isExternal) {
            // External banco de horas format: Matricula, Funcionario, Saldo Final, Data Final
            const nome = String(row["Funcionario"] || "").trim().toUpperCase();
            const matricula = String(row["Matricula"] || "").trim();
            const saldoFinalStr = String(row["Saldo Final"] || "0");
            const dataFinal = row["Data Final"];

            if (!nome) { erros++; continue; }

            // Try to find profile by matricula first, then by name
            const profile = profiles.find(p => 
              p.matricula === matricula
            ) || profiles.find(p =>
              p.full_name.toUpperCase() === nome
            );

            if (!profile) {
              erros++;
              if (!naoEncontrados.includes(nome)) naoEncontrados.push(nome);
              continue;
            }

            const horasDecimal = parseTimeToDecimal(saldoFinalStr);
            const tipo = horasDecimal >= 0 ? "credito" : "debito";
            const horasAbs = Math.abs(horasDecimal);
            const dataFormatted = parseDateValue(dataFinal);

            const motivo = row["Tipo de saldo"] ? String(row["Tipo de saldo"]) : null;

            const { error } = await supabase.from("banco_horas").insert({
              funcionario_user_id: profile.user_id,
              funcionario_nome: profile.full_name,
              data: dataFormatted,
              tipo,
              horas: Math.round(horasAbs * 100) / 100,
              motivo,
              observacao: matricula ? `Matrícula: ${matricula}` : null,
              registrado_por: user.id,
              status: "aprovado",
            });

            if (error) { erros++; } else { importados++; }
          } else {
            // Original format: Colaborador, Tipo, Data, Horas
            const colaboradorNome = String(row["Colaborador"] || row["colaborador"] || "");
            const profile = profiles.find(p =>
              p.full_name.toLowerCase() === colaboradorNome.toLowerCase()
            );

            if (!profile) {
              erros++;
              if (colaboradorNome && !naoEncontrados.includes(colaboradorNome)) naoEncontrados.push(colaboradorNome);
              continue;
            }

            const tipoRaw = String(row["Tipo"] || row["tipo"] || "").toLowerCase();
            const tipo = tipoRaw.includes("créd") || tipoRaw.includes("cred") ? "credito" : "debito";
            const dataFormatted = parseDateValue(row["Data"] || row["data"]);
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

            if (error) { erros++; } else { importados++; }
          }
        }

        const descParts = [`${importados} registros importados.`];
        if (erros > 0) descParts.push(`${erros} erros.`);
        if (naoEncontrados.length > 0) {
          descParts.push(`Colaboradores não encontrados: ${naoEncontrados.slice(0, 5).join(", ")}${naoEncontrados.length > 5 ? ` e mais ${naoEncontrados.length - 5}` : ""}`);
        }

        toast({
          title: "Importação concluída",
          description: descParts.join(" "),
          variant: erros > 0 && importados === 0 ? "destructive" : "default",
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
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'credito' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setCardFilter(cardFilter === 'credito' ? 'todos' : 'credito')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Créditos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{formatHM(totalCreditos)}</div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'debito' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setCardFilter(cardFilter === 'debito' ? 'todos' : 'debito')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Débitos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{formatHM(totalDebitos)}</div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${cardFilter === 'todos' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setCardFilter('todos')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Geral</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalCreditos - totalDebitos >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatHM(totalCreditos - totalDebitos)}
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
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : filteredRegistros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    {registro.tipo === "credito" ? "+" : "-"}{formatHM(Number(registro.horas))}
                  </TableCell>
                  <TableCell>{registro.motivo || "-"}</TableCell>
                  <TableCell className="font-medium">
                    {formatHM(calcularSaldo(registro.funcionario_user_id))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(registro)} className="hover:bg-primary/10 hover:text-primary">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedRegistro(registro); setDeleteDialogOpen(true); }} className="hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Registro de Horas</DialogTitle>
            <DialogDescription>Altere os dados do registro selecionado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={editFormData.funcionario_user_id} onValueChange={(v) => setEditFormData({ ...editFormData, funcionario_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={editFormData.data} onChange={(e) => setEditFormData({ ...editFormData, data: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={editFormData.tipo} onValueChange={(v) => setEditFormData({ ...editFormData, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credito">Crédito (+)</SelectItem>
                    <SelectItem value="debito">Débito (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Horas</Label>
              <Input type="number" step="0.5" min="0.5" value={editFormData.horas} onChange={(e) => setEditFormData({ ...editFormData, horas: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input value={editFormData.motivo} onChange={(e) => setEditFormData({ ...editFormData, motivo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea value={editFormData.observacao} onChange={(e) => setEditFormData({ ...editFormData, observacao: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o registro de <strong>{selectedRegistro?.funcionario_nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBH} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
