import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { Plus, Search, FileText, Calendar, Upload, Filter, Paperclip, Eye, Users, AlertTriangle, TrendingUp, Trophy, Medal, Award, Pencil, Trash2, BarChart3 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];

const MESES = [
  { value: 'all', label: 'Todos os meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

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
  status: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  cargo: string | null;
  setor: string | null;
}

// ========================
// StatCard Component
// ========================
function StatCard({ title, value, icon, subtitle, gradient = false }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  gradient?: boolean;
}) {
  return (
    <Card className={gradient ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg" : "shadow-sm"}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-sm font-medium mb-1 ${gradient ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              {title}
            </p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && (
              <p className={`text-sm mt-2 ${gradient ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${gradient ? "bg-primary-foreground/20" : "bg-primary/10"}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================
// RankingCard Component
// ========================
function RankingCard({ data, title }: {
  data: { nome: string; quantidade: number; totalDias: number }[];
  title: string;
}) {
  const getRankingIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1: return <Medal className="h-5 w-5 text-muted-foreground" />;
      case 2: return <Award className="h-5 w-5 text-amber-700" />;
      default: return null;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhum dado disponível</p>
        ) : (
          data.map((item, index) => (
            <div
              key={item.nome}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                index === 0 ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800" : "bg-muted/50"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                index === 0 ? "bg-yellow-400 text-yellow-900" :
                index === 1 ? "bg-muted-foreground/20 text-muted-foreground" :
                index === 2 ? "bg-amber-700/20 text-amber-700" :
                "bg-muted text-muted-foreground"
              }`}>
                {index + 1}
              </div>
              {getRankingIcon(index)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.nome}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{item.quantidade}</p>
                <p className="text-xs text-muted-foreground">{item.totalDias} dias</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ========================
// Main Component
// ========================
export const CentralAtestadosSection = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAtestado, setSelectedAtestado] = useState<Atestado | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState<string>("all");
  const [anoSelecionado, setAnoSelecionado] = useState<string>(new Date().getFullYear().toString());

  const [editFormData, setEditFormData] = useState({
    funcionario_user_id: "",
    data_inicio: "",
    data_fim: "",
    tipo: "medico",
    cid: "",
    medico_nome: "",
    crm: "",
    observacao: "",
  });

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
      // Paginated fetch for atestados to avoid 1000-row limit
      const pageSize = 1000;
      let allAtestados: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("atestados")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allAtestados = allAtestados.concat(data);
          hasMore = data.length === pageSize;
          from += pageSize;
        } else {
          hasMore = false;
        }
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, cargo, setor")
        .order("full_name");
      if (profilesError) throw profilesError;

      setAtestados(allAtestados);
      setProfiles(profilesData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ========================
  // Dashboard computed data
  // ========================
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>();
    atestados.forEach(a => {
      if (a.data_inicio) anos.add(a.data_inicio.split("-")[0]);
    });
    const arr = Array.from(anos).sort((a, b) => b.localeCompare(a));
    if (arr.length === 0) arr.push(new Date().getFullYear().toString());
    return arr;
  }, [atestados]);

  const atestadosFiltrados = useMemo(() => {
    return atestados.filter(a => {
      if (!a.data_inicio) return false;
      const [ano, mes] = a.data_inicio.split("-");
      return ano === anoSelecionado && (mesSelecionado === "all" || mes === mesSelecionado);
    });
  }, [atestados, mesSelecionado, anoSelecionado]);

  const stats = useMemo(() => {
    const totalAtestados = atestadosFiltrados.length;
    const totalDias = atestadosFiltrados.reduce((acc, a) => acc + a.dias_afastamento, 0);
    const colaboradoresUnicos = new Set(atestadosFiltrados.map(a => a.funcionario_nome.trim().toLowerCase())).size;
    const mesAtual = format(new Date(), "yyyy-MM");
    const atestadosMes = atestados.filter(a => a.data_inicio.startsWith(mesAtual)).length;
    return { totalAtestados, totalDias, colaboradoresUnicos, atestadosMes };
  }, [atestadosFiltrados, atestados]);

  const rankingTop5 = useMemo(() => {
    const grouped = atestadosFiltrados.reduce((acc, a) => {
      const key = a.funcionario_nome.trim().toLowerCase();
      if (!acc[key]) acc[key] = { nome: a.funcionario_nome, quantidade: 0, totalDias: 0 };
      acc[key].quantidade += 1;
      acc[key].totalDias += a.dias_afastamento || 0;
      return acc;
    }, {} as Record<string, { nome: string; quantidade: number; totalDias: number }>);
    return Object.values(grouped).sort((a, b) => b.totalDias !== a.totalDias ? b.totalDias - a.totalDias : b.quantidade - a.quantidade).slice(0, 5);
  }, [atestadosFiltrados]);

  const chartDataByTipo = useMemo(() => {
    const grouped = atestadosFiltrados.reduce((acc, a) => {
      const tipo = a.tipo === "medico" ? "Atestado Médico" : a.tipo === "acompanhante" ? "Acompanhante" : "Declaração";
      if (!acc[tipo]) acc[tipo] = { name: tipo, value: 0 };
      acc[tipo].value += 1;
      return acc;
    }, {} as Record<string, { name: string; value: number }>);
    return Object.values(grouped);
  }, [atestadosFiltrados]);

  const chartDataByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    atestadosFiltrados.forEach(a => {
      const mes = a.data_inicio.split("-")[1];
      const label = MESES.find(m => m.value === mes)?.label || mes;
      months[label] = (months[label] || 0) + 1;
    });
    return Object.entries(months).map(([name, quantidade]) => ({ name, quantidade }));
  }, [atestadosFiltrados]);

  // Evolution trend data
  const [evolAtestColab, setEvolAtestColab] = useState("todos");

  const evolucaoAtestados = useMemo(() => {
    const MESES_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const map: Record<string, { quantidade: number; dias: number }> = {};

    const source = evolAtestColab === "todos"
      ? atestados.filter(a => a.data_inicio?.startsWith(anoSelecionado))
      : atestados.filter(a => a.data_inicio?.startsWith(anoSelecionado) && a.funcionario_user_id === evolAtestColab);

    source.forEach(a => {
      const mes = a.data_inicio.split("-")[1];
      if (!map[mes]) map[mes] = { quantidade: 0, dias: 0 };
      map[mes].quantidade += 1;
      map[mes].dias += a.dias_afastamento || 0;
    });

    return Array.from({ length: 12 }, (_, i) => {
      const mesKey = String(i + 1).padStart(2, "0");
      const d = map[mesKey] || { quantidade: 0, dias: 0 };
      return { name: MESES_LABEL[i], atestados: d.quantidade, dias: d.dias };
    });
  }, [atestados, anoSelecionado, evolAtestColab]);

  // ========================
  // Table filtering
  // ========================
  const filteredAtestados = atestados.filter(a => {
    const matchesSearch = a.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === "todos" || a.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  });

  // ========================
  // Form & File handlers
  // ========================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const uploadFile = async (atestadoId: string): Promise<string | null> => {
    if (!selectedFile) return null;
    const fileExt = selectedFile.name.split(".").pop();
    const filePath = `${atestadoId}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("atestados").upload(filePath, selectedFile, { upsert: true });
    if (uploadError) { console.error("Erro no upload:", uploadError); return null; }
    return filePath;
  };

  // Parse date-only strings as local time (avoids UTC midnight shift in BRT)
  const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');

  const calculateDays = (inicio: string, fim: string) => differenceInDays(parseLocalDate(fim), parseLocalDate(inicio)) + 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedProfile = profiles.find(p => p.user_id === formData.funcionario_user_id);
    if (!selectedProfile) { toast({ title: "Erro", description: "Selecione um colaborador.", variant: "destructive" }); return; }
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
    if (error) { toast({ title: "Erro", description: "Não foi possível salvar o atestado.", variant: "destructive" }); setUploadingFile(false); return; }
    if (selectedFile && insertedData) {
      const fileUrl = await uploadFile(insertedData.id);
      if (fileUrl) await supabase.from("atestados").update({ arquivo_url: fileUrl }).eq("id", insertedData.id);
    }
    setUploadingFile(false);
    toast({ title: "Sucesso", description: "Atestado registrado com sucesso." });
    setIsDialogOpen(false);
    setSelectedFile(null);
    setFormData({ funcionario_user_id: "", data_inicio: format(new Date(), "yyyy-MM-dd"), data_fim: format(new Date(), "yyyy-MM-dd"), tipo: "medico", cid: "", medico_nome: "", crm: "", observacao: "" });
    loadData();
  };

  const handleDelete = async () => {
    if (!selectedAtestado) return;
    const { error } = await supabase.from("atestados").delete().eq("id", selectedAtestado.id);
    if (error) { toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" }); } 
    else { toast({ title: "Sucesso", description: "Atestado excluído." }); loadData(); }
    setDeleteDialogOpen(false);
    setSelectedAtestado(null);
  };

  const openEditAtestado = (atestado: Atestado) => {
    setSelectedAtestado(atestado);
    setEditFormData({
      funcionario_user_id: atestado.funcionario_user_id,
      data_inicio: atestado.data_inicio,
      data_fim: atestado.data_fim,
      tipo: atestado.tipo,
      cid: atestado.cid || "",
      medico_nome: atestado.medico_nome || "",
      crm: atestado.crm || "",
      observacao: atestado.observacao || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditAtestado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAtestado) return;
    const selectedProfile = profiles.find(p => p.user_id === editFormData.funcionario_user_id);
    if (!selectedProfile) return;
    const diasAfastamento = calculateDays(editFormData.data_inicio, editFormData.data_fim);
    const { error } = await supabase.from("atestados").update({
      funcionario_user_id: editFormData.funcionario_user_id,
      funcionario_nome: selectedProfile.full_name,
      data_inicio: editFormData.data_inicio,
      data_fim: editFormData.data_fim,
      dias_afastamento: diasAfastamento,
      tipo: editFormData.tipo,
      cid: editFormData.cid || null,
      medico_nome: editFormData.medico_nome || null,
      crm: editFormData.crm || null,
      observacao: editFormData.observacao || null,
    }).eq("id", selectedAtestado.id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
      return;
    }
    toast({ title: "Sucesso", description: "Atestado atualizado." });
    setIsEditDialogOpen(false);
    setSelectedAtestado(null);
    loadData();
  };

  const viewFile = async (filePathOrUrl: string) => {
    const getPath = (url: string) => {
      if (!url.startsWith("http")) return url;
      const parts = url.split("/atestados/");
      return parts.length > 1 ? parts[1].split("?")[0] : null;
    };
    const path = getPath(filePathOrUrl);
    if (!path) { window.open(filePathOrUrl, "_blank"); return; }
    const { data, error } = await supabase.storage.from("atestados").createSignedUrl(path, 3600);
    if (error) { toast({ title: "Erro", description: "Não foi possível acessar o arquivo.", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  // ========================
  // Export handlers
  // ========================
  const getExportData = () => {
    const headers = ["Colaborador", "Tipo", "Data Início", "Data Fim", "Dias", "CID", "Médico", "CRM", "Observação"];
    const rows = filteredAtestados.map(a => [
      a.funcionario_nome,
      a.tipo === "medico" ? "Atestado Médico" : a.tipo === "acompanhante" ? "Acompanhante" : "Declaração",
      format(parseLocalDate(a.data_inicio), "dd/MM/yyyy"), format(parseLocalDate(a.data_fim), "dd/MM/yyyy"),
      a.dias_afastamento, a.cid || "", a.medico_nome || "", a.crm || "", a.observacao || "",
    ]);
    return { headers, rows };
  };

  const handleExportCSV = () => { const { headers, rows } = getExportData(); exportToCSV({ title: 'Central de Atestados', headers, rows, fileName: 'atestados' }); toast({ title: "Exportado", description: "CSV exportado." }); };
  const handleExportPDF = () => { const { headers, rows } = getExportData(); exportToPDF({ title: 'Central de Atestados', headers, rows, fileName: 'atestados', orientation: 'landscape' }); toast({ title: "Exportado", description: "PDF exportado." }); };
  const handleExportExcel = () => {
    const data = filteredAtestados.map(a => ({ "Colaborador": a.funcionario_nome, "Tipo": a.tipo === "medico" ? "Atestado Médico" : a.tipo === "acompanhante" ? "Acompanhante" : "Declaração", "Data Início": format(parseLocalDate(a.data_inicio), "dd/MM/yyyy"), "Data Fim": format(parseLocalDate(a.data_fim), "dd/MM/yyyy"), "Dias": a.dias_afastamento, "CID": a.cid || "", "Médico": a.medico_nome || "", "CRM": a.crm || "", "Observação": a.observacao || "" }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Atestados"); XLSX.writeFile(wb, `atestados_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Exportado", description: "Excel exportado." });
  };

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
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
        let importados = 0, erros = 0;
        for (const row of jsonData) {
          const nome = String(row["Colaborador"] || row["colaborador"] || "");
          const profile = profiles.find(p => p.full_name.toLowerCase() === nome.toLowerCase());
          if (!profile) { erros++; continue; }
          const tipoRaw = String(row["Tipo"] || row["tipo"] || "").toLowerCase();
          let tipo = "medico";
          if (tipoRaw.includes("acomp")) tipo = "acompanhante";
          else if (tipoRaw.includes("declar")) tipo = "declaracao";
          const parseDate = (value: unknown): string => {
            if (typeof value === "number") { const d = XLSX.SSF.parse_date_code(value); return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`; }
            const s = String(value); const p = s.split("/");
            return p.length === 3 ? `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}` : s;
          };
          const dataInicio = parseDate(row["Data Início"] || row["Data Inicio"] || row["data_inicio"]);
          const dataFim = parseDate(row["Data Fim"] || row["data_fim"]);
          const dias = parseInt(String(row["Dias"] || row["dias"] || "1"));
          const { error } = await supabase.from("atestados").insert({ funcionario_user_id: profile.user_id, funcionario_nome: profile.full_name, data_inicio: dataInicio, data_fim: dataFim, dias_afastamento: dias, tipo, cid: String(row["CID"] || "") || null, medico_nome: String(row["Médico"] || row["Medico"] || "") || null, crm: String(row["CRM"] || "") || null, observacao: String(row["Observação"] || row["Observacao"] || "") || null, registrado_por: user.id, status: "validado" });
          if (error) erros++; else importados++;
        }
        toast({ title: "Importação concluída", description: `${importados} registros importados.${erros > 0 ? ` ${erros} erros.` : ""}` });
        loadData();
      } catch { toast({ title: "Erro", description: "Erro ao processar planilha.", variant: "destructive" }); }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getTipoBadge = (tipo: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      medico: { label: "Atestado Médico", variant: "default" },
      acompanhante: { label: "Acompanhante", variant: "secondary" },
      declaracao: { label: "Declaração", variant: "outline" },
    };
    const c = config[tipo] || { label: tipo, variant: "outline" as const };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="atestados" className="gap-2">
              <FileText className="h-4 w-4" />
              Atestados
            </TabsTrigger>
          </TabsList>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Atestado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Atestado</DialogTitle>
                <DialogDescription>Registre um novo atestado ou declaração de afastamento.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Dados do Colaborador */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados do Colaborador</h3>
                  <div className="space-y-2">
                    <Label>Colaborador *</Label>
                    <SearchableSelect
                      value={formData.funcionario_user_id}
                      onValueChange={(v) => setFormData({ ...formData, funcionario_user_id: v })}
                      items={profiles.map(p => ({ value: p.user_id, label: p.full_name }))}
                      placeholder="Selecione o colaborador"
                    />
                  </div>
                </div>

                {/* Dados do Atestado */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados do Atestado</h3>
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medico">Atestado Médico</SelectItem>
                        <SelectItem value="acompanhante">Acompanhante</SelectItem>
                        <SelectItem value="declaracao">Declaração</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data Início *</Label>
                      <Input type="date" value={formData.data_inicio} onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Fim *</Label>
                      <Input type="date" value={formData.data_fim} onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CID</Label>
                      <Input value={formData.cid} onChange={(e) => setFormData({ ...formData, cid: e.target.value.toUpperCase() })} placeholder="Ex: J11" maxLength={10} />
                    </div>
                    <div className="space-y-2">
                      <Label>CRM</Label>
                      <Input value={formData.crm} onChange={(e) => setFormData({ ...formData, crm: e.target.value })} placeholder="CRM do médico" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Médico</Label>
                    <Input value={formData.medico_nome} onChange={(e) => setFormData({ ...formData, medico_nome: e.target.value })} placeholder="Dr(a). Nome" />
                  </div>
                </div>

                {/* Arquivo & Observação */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Anexos</h3>
                  <div className="space-y-2">
                    <Label>Arquivo Digitalizado</Label>
                    <input type="file" ref={uploadInputRef} onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                    <Button type="button" variant="outline" onClick={() => uploadInputRef.current?.click()} className="w-full">
                      <Paperclip className="h-4 w-4 mr-2" />
                      {selectedFile ? selectedFile.name : "Anexar arquivo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">PDF, JPG ou PNG</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Textarea value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} placeholder="Observações adicionais..." />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={uploadingFile}>{uploadingFile ? "Salvando..." : "Registrar"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ======================== DASHBOARD TAB ======================== */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {/* Filters */}
          <div className="flex gap-2 justify-end">
            <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>{MESES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
              <SelectTrigger className="w-[100px]"><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>{anosDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total de Atestados" value={stats.totalAtestados} icon={<FileText className="h-6 w-6 text-primary-foreground" />} subtitle="Registros no período" gradient />
            <StatCard title="Total de Dias" value={stats.totalDias} icon={<Calendar className="h-6 w-6 text-primary" />} subtitle="Dias de afastamento" />
            <StatCard title="Colaboradores" value={stats.colaboradoresUnicos} icon={<Users className="h-6 w-6 text-primary" />} subtitle="Com atestados" />
            <StatCard title="Atestados Este Mês" value={stats.atestadosMes} icon={<AlertTriangle className="h-6 w-6 text-warning" />} subtitle="Mês atual" />
          </div>

          {/* Charts & Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingCard title="Top 5 - Colaboradores com mais Atestados" data={rankingTop5} />

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Atestados por Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {chartDataByMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataByMonth} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis className="text-xs" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados no período</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pie Chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Distribuição por Tipo de Atestado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {chartDataByTipo.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartDataByTipo} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={100} fill="#8884d8" dataKey="value">
                        {chartDataByTipo.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados no período</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evolução Mensal - Trend Chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Evolução Mensal de Atestados — {anoSelecionado}
                </CardTitle>
                <Select value={evolAtestColab} onValueChange={setEvolAtestColab}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os colaboradores</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolucaoAtestados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradAtestados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradDias" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="atestados" name="Atestados" stroke="hsl(var(--primary))" fill="url(#gradAtestados)" strokeWidth={2} />
                    <Area type="monotone" dataKey="dias" name="Dias Afastamento" stroke="hsl(var(--warning))" fill="url(#gradDias)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Alerta: Colaboradores com múltiplos atestados no mês */}
          {(() => {
            const alertaColabs = (() => {
              const map = new Map<string, { nome: string; quantidade: number; totalDias: number; tipos: string[] }>();
              atestadosFiltrados.forEach((a) => {
                const key = a.funcionario_nome.trim().toLowerCase();
                if (!map.has(key)) map.set(key, { nome: a.funcionario_nome, quantidade: 0, totalDias: 0, tipos: [] });
                const entry = map.get(key)!;
                entry.quantidade += 1;
                entry.totalDias += a.dias_afastamento;
                if (a.tipo && !entry.tipos.includes(a.tipo)) entry.tipos.push(a.tipo);
              });
              return Array.from(map.values()).filter(c => c.quantidade > 1).sort((a, b) => b.quantidade - a.quantidade || b.totalDias - a.totalDias);
            })();

            const alertaChartData = alertaColabs.slice(0, 10).map(c => ({
              name: c.nome.length > 18 ? c.nome.substring(0, 18) + "…" : c.nome,
              fullName: c.nome,
              atestados: c.quantidade,
              dias: c.totalDias,
            }));

            const getBarColor = (qty: number) => {
              if (qty >= 4) return "hsl(var(--destructive))";
              if (qty >= 3) return "hsl(var(--warning))";
              return "hsl(var(--primary))";
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm border-l-4 border-l-warning">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      Colaboradores com múltiplos atestados
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Colaboradores com mais de 1 atestado no período selecionado
                    </p>
                  </CardHeader>
                  <CardContent>
                    {alertaChartData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <Users className="h-10 w-10 mb-2 opacity-40" />
                        <p className="font-medium">Nenhum colaborador em alerta</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={alertaChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
                                  <p className="font-semibold">{d.fullName}</p>
                                  <p className="text-muted-foreground">Atestados: <strong>{d.atestados}</strong></p>
                                  <p className="text-muted-foreground">Dias afastado: <strong>{d.dias}</strong></p>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="atestados" radius={[0, 6, 6, 0]} barSize={22}>
                            {alertaChartData.map((entry, i) => (
                              <Cell key={i} fill={getBarColor(entry.atestados)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-primary" />
                      Detalhamento — Múltiplos Atestados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {alertaColabs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <FileText className="h-10 w-10 mb-2 opacity-40" />
                        <p className="font-medium">Sem registros</p>
                      </div>
                    ) : (
                      <div className="max-h-[280px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Colaborador</TableHead>
                              <TableHead className="text-center">Qty</TableHead>
                              <TableHead className="text-center">Dias</TableHead>
                              <TableHead>Tipos</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {alertaColabs.map((c, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{c.nome}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={c.quantidade >= 3 ? "destructive" : "secondary"} className="font-bold">{c.quantidade}</Badge>
                                </TableCell>
                                <TableCell className="text-center font-medium">{c.totalDias}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {c.tipos.map((t, j) => (
                                      <Badge key={j} variant="outline" className="text-xs">
                                        {t === "medico" ? "Médico" : t === "acompanhante" ? "Acompanhante" : "Declaração"}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

        {/* ======================== ATESTADOS TAB ======================== */}
        <TabsContent value="atestados" className="mt-6 space-y-4">
          {/* Filters bar */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterTipo} onValueChange={setFilterTipo}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Tipos</SelectItem>
                      <SelectItem value="medico">Atestado Médico</SelectItem>
                      <SelectItem value="acompanhante">Acompanhante</SelectItem>
                      <SelectItem value="declaracao">Declaração</SelectItem>
                    </SelectContent>
                  </Select>
                  <ExportDropdown onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} disabled={filteredAtestados.length === 0} />
                  <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="text-primary-foreground font-semibold">Colaborador</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Tipo</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Início</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Fim</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Dias</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">CID</TableHead>
                    <TableHead className="text-primary-foreground font-semibold">Médico</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Arquivo</TableHead>
                    <TableHead className="text-primary-foreground font-semibold text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" /></TableCell></TableRow>
                  ) : filteredAtestados.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum atestado encontrado.</TableCell></TableRow>
                  ) : (
                    filteredAtestados.map((a) => (
                      <TableRow key={a.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{a.funcionario_nome}</TableCell>
                        <TableCell>{getTipoBadge(a.tipo)}</TableCell>
                        <TableCell>{format(parseLocalDate(a.data_inicio), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{format(parseLocalDate(a.data_fim), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={a.dias_afastamento > 10 ? "destructive" : "secondary"}>{a.dias_afastamento}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{a.cid || "-"}</TableCell>
                        <TableCell>
                          {a.medico_nome ? (
                            <span className="text-sm">{a.medico_nome}{a.crm && <span className="text-muted-foreground"> ({a.crm})</span>}</span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {a.arquivo_url ? (
                            <Button variant="ghost" size="icon" onClick={() => viewFile(a.arquivo_url!)} className="hover:bg-primary/10 hover:text-primary">
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : <span className="text-muted-foreground text-sm">-</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditAtestado(a)} className="hover:bg-primary/10 hover:text-primary">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedAtestado(a); setDeleteDialogOpen(true); }} className="hover:bg-destructive/10 hover:text-destructive">
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
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Atestado Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Atestado</DialogTitle>
            <DialogDescription>Altere os dados do atestado selecionado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAtestado} className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={editFormData.funcionario_user_id} onValueChange={(v) => setEditFormData({ ...editFormData, funcionario_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={editFormData.tipo} onValueChange={(v) => setEditFormData({ ...editFormData, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medico">Atestado Médico</SelectItem>
                  <SelectItem value="acompanhante">Acompanhante</SelectItem>
                  <SelectItem value="declaracao">Declaração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input type="date" value={editFormData.data_inicio} onChange={(e) => setEditFormData({ ...editFormData, data_inicio: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Input type="date" value={editFormData.data_fim} onChange={(e) => setEditFormData({ ...editFormData, data_fim: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CID</Label>
                <Input value={editFormData.cid} onChange={(e) => setEditFormData({ ...editFormData, cid: e.target.value.toUpperCase() })} maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label>CRM</Label>
                <Input value={editFormData.crm} onChange={(e) => setEditFormData({ ...editFormData, crm: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome do Médico</Label>
              <Input value={editFormData.medico_nome} onChange={(e) => setEditFormData({ ...editFormData, medico_nome: e.target.value })} />
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
              Tem certeza que deseja excluir o atestado de <strong>{selectedAtestado?.funcionario_nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
