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
import { Plus, Search, FileText, Calendar, Download, Upload, Filter, Paperclip, Eye } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

interface Atestado {
  id: string;
  funcionario_user_id: string;
  funcionario_nome: string;
  data_inicio: string;
  data_fim: string;
  dias_afastamento: number;
  tipo: string;
  cid: string | null;
  medico_nome: string | null;
  crm: string | null;
  observacao: string | null;
  arquivo_url: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export const CentralAtestadosSection = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    funcionario_user_id: "",
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim: format(new Date(), "yyyy-MM-dd"),
    tipo: "medico",
    cid: "",
    medico_nome: "",
    crm: "",
    observacao: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [atestadosRes, profilesRes] = await Promise.all([
        supabase
          .from("atestados")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .order("full_name"),
      ]);

      if (atestadosRes.error) throw atestadosRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setAtestados(atestadosRes.data || []);
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

  const calculateDays = (inicio: string, fim: string) => {
    return differenceInDays(new Date(fim), new Date(inicio)) + 1;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadFile = async (atestadoId: string): Promise<string | null> => {
    if (!selectedFile) return null;

    const fileExt = selectedFile.name.split(".").pop();
    const fileName = `${atestadoId}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("atestados")
      .upload(filePath, selectedFile, { upsert: true });

    if (uploadError) {
      console.error("Erro no upload:", uploadError);
      return null;
    }

    // Store just the file path - signed URLs will be generated when viewing
    // This follows LGPD best practices for sensitive medical documents
    return filePath;
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

    const diasAfastamento = calculateDays(formData.data_inicio, formData.data_fim);

    setUploadingFile(true);

    const { data: insertedData, error } = await supabase.from("atestados").insert({
      funcionario_user_id: formData.funcionario_user_id,
      funcionario_nome: selectedProfile.full_name,
      data_inicio: formData.data_inicio,
      data_fim: formData.data_fim,
      dias_afastamento: diasAfastamento,
      tipo: formData.tipo,
      cid: formData.cid || null,
      medico_nome: formData.medico_nome || null,
      crm: formData.crm || null,
      observacao: formData.observacao || null,
      registrado_por: user.id,
      status: "validado",
    }).select().single();

    if (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o atestado.",
        variant: "destructive",
      });
      setUploadingFile(false);
      return;
    }

    // Upload do arquivo se houver
    if (selectedFile && insertedData) {
      const fileUrl = await uploadFile(insertedData.id);
      if (fileUrl) {
        await supabase
          .from("atestados")
          .update({ arquivo_url: fileUrl })
          .eq("id", insertedData.id);
      }
    }

    setUploadingFile(false);
    toast({
      title: "Sucesso",
      description: "Atestado registrado com sucesso.",
    });

    setIsDialogOpen(false);
    setSelectedFile(null);
    setFormData({
      funcionario_user_id: "",
      data_inicio: format(new Date(), "yyyy-MM-dd"),
      data_fim: format(new Date(), "yyyy-MM-dd"),
      tipo: "medico",
      cid: "",
      medico_nome: "",
      crm: "",
      observacao: "",
    });
    loadData();
  };

  const filteredAtestados = atestados.filter(a => {
    const matchesSearch = a.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === "todos" || a.tipo === filterTipo;
    const matchesDataInicio = !filterDataInicio || a.data_inicio >= filterDataInicio;
    const matchesDataFim = !filterDataFim || a.data_fim <= filterDataFim;
    return matchesSearch && matchesTipo && matchesDataInicio && matchesDataFim;
  });

  const totalDiasAfastamento = atestados.reduce((sum, a) => sum + a.dias_afastamento, 0);
  const totalAtestadosMes = atestados.filter(a => {
    const mesAtual = format(new Date(), "yyyy-MM");
    return a.data_inicio.startsWith(mesAtual);
  }).length;

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "medico":
        return <Badge variant="outline">Atestado Médico</Badge>;
      case "acompanhante":
        return <Badge variant="outline">Acompanhante</Badge>;
      case "declaracao":
        return <Badge variant="outline">Declaração</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  // Get export data
  const getExportData = () => {
    const headers = ["Colaborador", "Tipo", "Data Início", "Data Fim", "Dias", "CID", "Médico", "CRM", "Observação"];
    const rows = filteredAtestados.map(a => [
      a.funcionario_nome,
      a.tipo === "medico" ? "Atestado Médico" : a.tipo === "acompanhante" ? "Acompanhante" : "Declaração",
      format(new Date(a.data_inicio), "dd/MM/yyyy"),
      format(new Date(a.data_fim), "dd/MM/yyyy"),
      a.dias_afastamento,
      a.cid || "",
      a.medico_nome || "",
      a.crm || "",
      a.observacao || "",
    ]);
    return { headers, rows };
  };

  // Exportar para Excel
  const handleExportCSV = () => {
    const { headers, rows } = getExportData();
    exportToCSV({
      title: 'Central de Atestados',
      headers,
      rows,
      fileName: 'atestados',
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
      title: 'Central de Atestados',
      headers,
      rows,
      fileName: 'atestados',
      orientation: 'landscape',
    });

    toast({
      title: "Exportado",
      description: "Arquivo PDF exportado com sucesso.",
    });
  };

  // Exportar para Excel (XLSX original)
  const handleExportExcel = () => {
    const dataToExport = filteredAtestados.map(a => ({
      "Colaborador": a.funcionario_nome,
      "Tipo": a.tipo === "medico" ? "Atestado Médico" : a.tipo === "acompanhante" ? "Acompanhante" : "Declaração",
      "Data Início": format(new Date(a.data_inicio), "dd/MM/yyyy"),
      "Data Fim": format(new Date(a.data_fim), "dd/MM/yyyy"),
      "Dias": a.dias_afastamento,
      "CID": a.cid || "",
      "Médico": a.medico_nome || "",
      "CRM": a.crm || "",
      "Observação": a.observacao || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atestados");
    XLSX.writeFile(wb, `atestados_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

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
          let tipo = "medico";
          if (tipoRaw.includes("acomp")) tipo = "acompanhante";
          else if (tipoRaw.includes("declar")) tipo = "declaracao";

          const parseDate = (value: unknown): string => {
            if (typeof value === "number") {
              const date = XLSX.SSF.parse_date_code(value);
              return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
            }
            const dateStr = String(value);
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            }
            return dateStr;
          };

          const dataInicio = parseDate(row["Data Início"] || row["Data Inicio"] || row["data_inicio"]);
          const dataFim = parseDate(row["Data Fim"] || row["data_fim"]);
          const dias = parseInt(String(row["Dias"] || row["dias"] || "1"));

          const { error } = await supabase.from("atestados").insert({
            funcionario_user_id: profile.user_id,
            funcionario_nome: profile.full_name,
            data_inicio: dataInicio,
            data_fim: dataFim,
            dias_afastamento: dias,
            tipo,
            cid: String(row["CID"] || row["cid"] || "") || null,
            medico_nome: String(row["Médico"] || row["Medico"] || row["medico"] || "") || null,
            crm: String(row["CRM"] || row["crm"] || "") || null,
            observacao: String(row["Observação"] || row["Observacao"] || row["observacao"] || "") || null,
            registrado_por: user.id,
            status: "validado",
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

  const viewFile = async (filePathOrUrl: string) => {
    // Check if it's already a full URL (legacy data) or just a file path
    if (filePathOrUrl.startsWith("http")) {
      // Legacy: extract file path from URL for signed URL generation
      const urlParts = filePathOrUrl.split("/atestados/");
      const filePath = urlParts.length > 1 ? urlParts[1].split("?")[0] : null;
      
      if (filePath) {
        const { data, error } = await supabase.storage
          .from("atestados")
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (error) {
          console.error("Erro ao gerar URL assinada:", error);
          toast({
            title: "Erro",
            description: "Não foi possível acessar o arquivo.",
            variant: "destructive",
          });
          return;
        }
        window.open(data.signedUrl, "_blank");
      } else {
        // Fallback for old URLs that can't be parsed
        window.open(filePathOrUrl, "_blank");
      }
    } else {
      // New format: file path stored directly
      const { data, error } = await supabase.storage
        .from("atestados")
        .createSignedUrl(filePathOrUrl, 3600); // 1 hour expiry for LGPD compliance
      
      if (error) {
        console.error("Erro ao gerar URL assinada:", error);
        toast({
          title: "Erro",
          description: "Não foi possível acessar o arquivo.",
          variant: "destructive",
        });
        return;
      }
      window.open(data.signedUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Atestados</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{atestados.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dias Afastamento Total</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDiasAfastamento}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atestados Este Mês</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalAtestadosMes}</div>
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
                  Novo Atestado
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Atestado</DialogTitle>
                  <DialogDescription>
                    Registre um novo atestado ou declaração de afastamento.
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
                        <SelectItem value="medico">Atestado Médico</SelectItem>
                        <SelectItem value="acompanhante">Acompanhante</SelectItem>
                        <SelectItem value="declaracao">Declaração</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="data_inicio">Data Início</Label>
                      <Input
                        id="data_inicio"
                        type="date"
                        value={formData.data_inicio}
                        onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="data_fim">Data Fim</Label>
                      <Input
                        id="data_fim"
                        type="date"
                        value={formData.data_fim}
                        onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cid">CID (opcional)</Label>
                      <Input
                        id="cid"
                        value={formData.cid}
                        onChange={(e) => setFormData({ ...formData, cid: e.target.value })}
                        placeholder="Ex: J11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="crm">CRM (opcional)</Label>
                      <Input
                        id="crm"
                        value={formData.crm}
                        onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                        placeholder="CRM do médico"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medico_nome">Nome do Médico (opcional)</Label>
                    <Input
                      id="medico_nome"
                      value={formData.medico_nome}
                      onChange={(e) => setFormData({ ...formData, medico_nome: e.target.value })}
                      placeholder="Dr(a). Nome"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arquivo">Arquivo Digitalizado (opcional)</Label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={uploadInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => uploadInputRef.current?.click()}
                        className="w-full"
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        {selectedFile ? selectedFile.name : "Anexar arquivo"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">PDF, JPG ou PNG</p>
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
                    <Button type="submit" disabled={uploadingFile}>
                      {uploadingFile ? "Salvando..." : "Registrar"}
                    </Button>
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
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Tipos</SelectItem>
                  <SelectItem value="medico">Atestado Médico</SelectItem>
                  <SelectItem value="acompanhante">Acompanhante</SelectItem>
                  <SelectItem value="declaracao">Declaração</SelectItem>
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
              <TableHead>Tipo</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>CID</TableHead>
              <TableHead>Médico</TableHead>
              <TableHead>Arquivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : filteredAtestados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum atestado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredAtestados.map((atestado) => (
                <TableRow key={atestado.id}>
                  <TableCell className="font-medium">{atestado.funcionario_nome}</TableCell>
                  <TableCell>{getTipoBadge(atestado.tipo)}</TableCell>
                  <TableCell>
                    {format(new Date(atestado.data_inicio), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(new Date(atestado.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{atestado.dias_afastamento} dia(s)</TableCell>
                  <TableCell>{atestado.cid || "-"}</TableCell>
                  <TableCell>
                    {atestado.medico_nome ? (
                      <span className="text-sm">
                        {atestado.medico_nome}
                        {atestado.crm && <span className="text-muted-foreground"> ({atestado.crm})</span>}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {atestado.arquivo_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewFile(atestado.arquivo_url!)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
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
