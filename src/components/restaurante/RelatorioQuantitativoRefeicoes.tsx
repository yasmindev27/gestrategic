import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Coffee,
  Sun,
  Cookie,
  Moon,
  Clock,
  FileSpreadsheet,
  FileDown,
  Filter,
  BarChart3,
  TrendingUp,
  UtensilsCrossed,
  Droplets,
  Save,
  DollarSign,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
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
}

interface SolicitacaoDieta {
  id: string;
  paciente_nome: string | null;
  horarios_refeicoes: string[] | null;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  tem_acompanhante: boolean | null;
  observacoes: string | null;
}

interface CafeLitroDiario {
  id: string;
  data: string;
  quantidade_litros: number;
  observacao: string | null;
}

interface ValorRefeicao {
  id: string;
  tipo_refeicao: string;
  valor: number;
}

interface DailyQuantitativo {
  data: string;
  cafe: number;
  almoco: number;
  lanche: number;
  jantar: number;
  foraHorario: number;
  totalRefeicoes: number;
  dietasCafe: number;
  dietasAlmoco: number;
  dietasLanche: number;
  dietasJantar: number;
  totalDietas: number;
  extraCafe: number;
  extraAlmoco: number;
  extraLanche: number;
  extraJantar: number;
  totalExtra: number;
  totalGeral: number;
  cafeLitro: number;
}

const tipoRefeicaoLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cafe: { label: "Café da Manhã", icon: <Coffee className="h-4 w-4" />, color: "bg-amber-500" },
  almoco: { label: "Almoço", icon: <Sun className="h-4 w-4" />, color: "bg-orange-500" },
  lanche: { label: "Café da Tarde", icon: <Cookie className="h-4 w-4" />, color: "bg-pink-500" },
  jantar: { label: "Jantar", icon: <Moon className="h-4 w-4" />, color: "bg-indigo-500" },
  fora_horario: { label: "Fora Horário", icon: <Clock className="h-4 w-4" />, color: "bg-gray-500" },
};

interface RelatorioQuantitativoRefeicoesProps {
  isAdmin?: boolean;
}

export const RelatorioQuantitativoRefeicoes = ({ isAdmin = false }: RelatorioQuantitativoRefeicoesProps) => {
  const { toast } = useToast();
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [isLoading, setIsLoading] = useState(false);
  const [quantitativos, setQuantitativos] = useState<DailyQuantitativo[]>([]);
  const [registrosRefeicoes, setRegistrosRefeicoes] = useState<RegistroRefeicao[]>([]);
  const [solicitacoesDieta, setSolicitacoesDieta] = useState<SolicitacaoDieta[]>([]);
  const [cafeLitroRegistros, setCafeLitroRegistros] = useState<CafeLitroDiario[]>([]);
  const [cafeLitroInputs, setCafeLitroInputs] = useState<Record<string, string>>({});
  const [savingCafeLitro, setSavingCafeLitro] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [valoresRefeicoes, setValoresRefeicoes] = useState<Record<string, number>>({
    cafe: 0, almoco: 0, lanche: 0, jantar: 0, cafe_litro: 0
  });
  const [valoresInputs, setValoresInputs] = useState<Record<string, string>>({
    cafe: "0", almoco: "0", lanche: "0", jantar: "0", cafe_litro: "0"
  });
  const [savingValor, setSavingValor] = useState<string | null>(null);
  const [showValoresConfig, setShowValoresConfig] = useState(false);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // Buscar TODOS os registros do totem com paginação (limite de 1000 por request)
      let allRefeicoes: RegistroRefeicao[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data: refeicoes, error: refeicoesError } = await supabase
          .from("refeicoes_registros")
          .select("id, tipo_pessoa, colaborador_nome, tipo_refeicao, data_registro, hora_registro")
          .gte("data_registro", dataInicio)
          .lte("data_registro", dataFim)
          .order("data_registro", { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (refeicoesError) throw refeicoesError;
        allRefeicoes = [...allRefeicoes, ...(refeicoes || [])];
        if (!refeicoes || refeicoes.length < pageSize) break;
        page++;
      }

      setRegistrosRefeicoes(allRefeicoes);

      // Buscar solicitações de dieta aprovadas que se sobrepõem ao período selecionado
      // Filtra no banco: data_inicio <= dataFim AND (data_fim >= dataInicio OR data_fim IS NULL)
      let allDietas: SolicitacaoDieta[] = [];
      let dietaPage = 0;
      while (true) {
        const { data: dietas, error: dietasError } = await supabase
          .from("solicitacoes_dieta")
          .select("id, paciente_nome, horarios_refeicoes, data_inicio, data_fim, status, tem_acompanhante, observacoes")
          .eq("status", "aprovada")
          .lte("data_inicio", dataFim)
          .or(`data_fim.gte.${dataInicio},data_fim.is.null`)
          .order("data_inicio", { ascending: true })
          .range(dietaPage * pageSize, (dietaPage + 1) * pageSize - 1);

        if (dietasError) throw dietasError;
        allDietas = [...allDietas, ...(dietas || [])];
        console.log(`[DEBUG] Dieta page ${dietaPage}: fetched ${dietas?.length || 0} records, total so far: ${allDietas.length}`);
        if (!dietas || dietas.length < pageSize) break;
        dietaPage++;
      }
      
      console.log(`[DEBUG] Total dietas fetched: ${allDietas.length}`);
      const feb26_28 = allDietas.filter(d => d.data_inicio >= '2026-02-26' && d.data_inicio <= '2026-02-28');
      console.log(`[DEBUG] Dietas for Feb 26-28: ${feb26_28.length}`, feb26_28.slice(0, 5));
      
      // Dietas já filtradas pelo banco, usar diretamente
      const dietasNoPeriodo = allDietas;
      
      setSolicitacoesDieta(dietasNoPeriodo);

      // Buscar registros de café litro no período
      const { data: cafeLitro, error: cafeLitroError } = await supabase
        .from("cafe_litro_diario")
        .select("id, data, quantidade_litros, observacao")
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data", { ascending: true });

      if (cafeLitroError) throw cafeLitroError;
      setCafeLitroRegistros(cafeLitro || []);

      // Inicializar inputs de café litro com valores existentes
      const inputsIniciais: Record<string, string> = {};
      (cafeLitro || []).forEach(cl => {
        inputsIniciais[cl.data] = String(cl.quantidade_litros);
      });
      setCafeLitroInputs(inputsIniciais);

      // Buscar valores das refeições
      const { data: valores, error: valoresError } = await supabase
        .from("valores_refeicoes")
        .select("id, tipo_refeicao, valor");

      if (valoresError) throw valoresError;
      
      const valoresMap: Record<string, number> = {};
      const inputsValores: Record<string, string> = {};
      (valores || []).forEach((v: any) => {
        valoresMap[v.tipo_refeicao] = Number(v.valor);
        inputsValores[v.tipo_refeicao] = String(v.valor);
      });
      setValoresRefeicoes(valoresMap);
      setValoresInputs(inputsValores);

      // Processar quantitativos por dia
      processarQuantitativos(allRefeicoes, dietasNoPeriodo, cafeLitro || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do relatório.",
        variant: "destructive",
      });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Admin: save edited extra cell quantity
  const saveExtraCellEdited = async (dataStr: string, tipoRefeicao: string, newValue: number, currentValue: number) => {
    const cellKey = `${dataStr}-extra-${tipoRefeicao}`;
    setSavingCell(cellKey);
    try {
      const diff = newValue - currentValue;
      if (diff === 0) { setEditingCell(null); setSavingCell(null); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (diff > 0) {
        const inserts = Array.from({ length: diff }, () => ({
          data_inicio: dataStr,
          data_fim: dataStr,
          status: "aprovada",
          horarios_refeicoes: [tipoRefeicao],
          tipo_dieta: "normal",
          solicitante_id: user.id,
          solicitante_nome: "Ajuste administrativo",
          observacoes: "[DIETA EXTRA][AJUSTE ADMIN]",
          tem_acompanhante: false,
          aprovado_por: user.id,
          aprovado_em: new Date().toISOString(),
        }));
        const { error } = await supabase.from("solicitacoes_dieta").insert(inserts);
        if (error) throw error;
      } else {
        const toRemove = Math.abs(diff);
        const { data: adminEntries } = await supabase
          .from("solicitacoes_dieta")
          .select("id")
          .eq("status", "aprovada")
          .eq("data_inicio", dataStr)
          .eq("data_fim", dataStr)
          .ilike("observacoes", "%[DIETA EXTRA]%[AJUSTE ADMIN]%")
          .contains("horarios_refeicoes", [tipoRefeicao])
          .order("created_at", { ascending: false })
          .limit(toRemove);

        const idsToDelete = (adminEntries || []).map(e => e.id);
        if (idsToDelete.length > 0) {
          const { error } = await supabase.from("solicitacoes_dieta").delete().in("id", idsToDelete);
          if (error) throw error;
        }

        const remaining = toRemove - idsToDelete.length;
        if (remaining > 0) {
          const { data: otherEntries } = await supabase
            .from("solicitacoes_dieta")
            .select("id")
            .eq("status", "aprovada")
            .eq("data_inicio", dataStr)
            .eq("data_fim", dataStr)
            .ilike("observacoes", "%[DIETA EXTRA]%")
            .contains("horarios_refeicoes", [tipoRefeicao])
            .order("created_at", { ascending: false })
            .limit(remaining);

          if (otherEntries && otherEntries.length > 0) {
            const { error } = await supabase.from("solicitacoes_dieta").delete().in("id", otherEntries.map(e => e.id));
            if (error) throw error;
          }
        }
      }

      toast({ title: "Sucesso", description: "Quantidade de extras atualizada!" });
      setEditingCell(null);
      fetchData(true);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar extras.", variant: "destructive" });
    } finally {
      setSavingCell(null);
    }
  };

  const processarQuantitativos = (refeicoes: RegistroRefeicao[], dietas: SolicitacaoDieta[], cafeLitro: CafeLitroDiario[]) => {
    // Garantir parsing correto das datas do filtro
    const startDate = parseISO(dataInicio);
    const endDate = parseISO(dataFim);
    
    // Criar lista de dias APENAS no período selecionado
    const diasNoPeriodo = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const resultado: DailyQuantitativo[] = diasNoPeriodo.map(dia => {
      const dataStr = format(dia, "yyyy-MM-dd");

      // Contar refeições do totem para cada tipo - filtrando explicitamente pela data
      const refeicoesNoDia = refeicoes.filter(r => r.data_registro === dataStr);
      const cafe = refeicoesNoDia.filter(r => r.tipo_refeicao === "cafe").length;
      const almoco = refeicoesNoDia.filter(r => r.tipo_refeicao === "almoco").length;
      const lanche = refeicoesNoDia.filter(r => r.tipo_refeicao === "lanche").length;
      const jantar = refeicoesNoDia.filter(r => r.tipo_refeicao === "jantar").length;
      const foraHorario = refeicoesNoDia.filter(r => r.tipo_refeicao === "fora_horario").length;

      // Contar dietas ativas SOMENTE para este dia específico
      const dietasAtivasNoDia = dietas.filter(d => {
        const inicio = d.data_inicio;
        const fim = d.data_fim || "9999-12-31";
        return dataStr >= inicio && dataStr <= fim;
      });

      // Separar dietas normais e extras
      const dietasNormaisRaw = dietasAtivasNoDia.filter(d => !d.observacoes?.includes("[DIETA EXTRA]"));
      const dietasExtrasRaw = dietasAtivasNoDia.filter(d => d.observacoes?.includes("[DIETA EXTRA]"));

      // Deduplicar dietas por paciente: unificar horários de múltiplos registros do mesmo paciente
      const deduplicarDietas = (lista: SolicitacaoDieta[]) => {
        const porPaciente = new Map<string, { horarios: Set<string>; temAcompanhante: boolean }>();
        lista.forEach(d => {
          // Usar nome do paciente como chave de deduplicação
          // Para extras sem nome, usar o ID como fallback (cada extra é único)
          const chave = d.paciente_nome?.trim().toUpperCase() || d.id;
          const horarios = (d.horarios_refeicoes && d.horarios_refeicoes.length > 0) 
            ? d.horarios_refeicoes 
            : ["cafe", "almoco", "lanche", "jantar"];
          const temAcomp = d.tem_acompanhante || false;
          
          if (!porPaciente.has(chave)) {
            porPaciente.set(chave, { horarios: new Set(horarios), temAcompanhante: temAcomp });
          } else {
            // Unificar horários: se o mesmo paciente tem [cafe, almoco] e [lanche, jantar], 
            // resulta em [cafe, almoco, lanche, jantar] contado apenas 1x
            const existing = porPaciente.get(chave)!;
            horarios.forEach(h => existing.horarios.add(h));
            if (temAcomp) existing.temAcompanhante = true;
          }
        });
        return porPaciente;
      };

      // Para dietas normais, contar cada refeição apenas 1x por paciente
      let dietasCafe = 0;
      let dietasAlmoco = 0;
      let dietasLanche = 0;
      let dietasJantar = 0;

      const normaisDedup = deduplicarDietas(dietasNormaisRaw);
      normaisDedup.forEach(({ horarios, temAcompanhante }) => {
        const multiplicador = temAcompanhante ? 2 : 1;
        if (horarios.has("cafe")) dietasCafe += multiplicador;
        if (horarios.has("almoco")) dietasAlmoco += multiplicador;
        if (horarios.has("lanche")) dietasLanche += multiplicador;
        if (horarios.has("jantar")) dietasJantar += multiplicador;
      });

      let extraCafe = 0;
      let extraAlmoco = 0;
      let extraLanche = 0;
      let extraJantar = 0;

      // Extras NÃO são deduplicados - cada registro representa uma refeição extra independente
      dietasExtrasRaw.forEach(d => {
        const horarios = (d.horarios_refeicoes && d.horarios_refeicoes.length > 0) 
          ? d.horarios_refeicoes 
          : ["cafe", "almoco", "lanche", "jantar"];
        const multiplicador = d.tem_acompanhante ? 2 : 1;

        if (horarios.includes("cafe")) extraCafe += multiplicador;
        if (horarios.includes("almoco")) extraAlmoco += multiplicador;
        if (horarios.includes("lanche")) extraLanche += multiplicador;
        if (horarios.includes("jantar")) extraJantar += multiplicador;
      });

      const totalRefeicoes = cafe + almoco + lanche + jantar + foraHorario;
      const totalDietas = dietasCafe + dietasAlmoco + dietasLanche + dietasJantar;
      const totalExtra = extraCafe + extraAlmoco + extraLanche + extraJantar;
      const totalGeral = totalRefeicoes + totalDietas + totalExtra;

      // Buscar café litro do dia específico
      const cafeLitroDoDia = cafeLitro.find(cl => cl.data === dataStr);
      const cafeLitroQtd = cafeLitroDoDia ? Number(cafeLitroDoDia.quantidade_litros) : 0;

      return {
        data: dataStr,
        cafe,
        almoco,
        lanche,
        jantar,
        foraHorario,
        totalRefeicoes,
        dietasCafe,
        dietasAlmoco,
        dietasLanche,
        dietasJantar,
        totalDietas,
        extraCafe,
        extraAlmoco,
        extraLanche,
        extraJantar,
        totalExtra,
        totalGeral,
        cafeLitro: cafeLitroQtd,
      };
    });

    // Debug: log Feb 26-28 values before filtering
    const debug26_28 = resultado.filter(r => r.data >= '2026-02-26' && r.data <= '2026-02-28');
    console.log('[DEBUG] Feb 26-28 before filter:', debug26_28.map(r => ({ data: r.data, dietasCafe: r.dietasCafe, dietasAlmoco: r.dietasAlmoco, totalDietas: r.totalDietas, totalGeral: r.totalGeral })));

    // Remover dias sem nenhum registro (manter apenas dias com dados)
    const resultadoFiltrado = resultado.filter(r => r.totalGeral > 0 || r.cafeLitro > 0);
    
    const debug26_28_after = resultadoFiltrado.filter(r => r.data >= '2026-02-26' && r.data <= '2026-02-28');
    console.log('[DEBUG] Feb 26-28 after filter:', debug26_28_after.length, 'records');
    
    setQuantitativos(resultadoFiltrado);
  };

  const saveCafeLitro = async (data: string, quantidade: string) => {
    if (!quantidade || isNaN(Number(quantidade))) return;
    
    setSavingCafeLitro(data);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const quantidadeNum = parseFloat(quantidade);
      
      // Verificar se já existe registro para a data
      const registroExistente = cafeLitroRegistros.find(cl => cl.data === data);
      
      if (registroExistente) {
        // Atualizar registro existente
        const { error } = await supabase
          .from("cafe_litro_diario")
          .update({ quantidade_litros: quantidadeNum })
          .eq("id", registroExistente.id);
        
        if (error) throw error;
      } else {
        // Inserir novo registro
        const { error } = await supabase
          .from("cafe_litro_diario")
          .insert({
            data,
            quantidade_litros: quantidadeNum,
            registrado_por: user.id,
          });
        
        if (error) throw error;
      }

      toast({ title: "Sucesso", description: `Café Litro salvo para ${format(parseISO(data), "dd/MM/yyyy")}` });
      fetchData(true);
    } catch (error: any) {
      console.error("Erro ao salvar café litro:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar café litro.",
        variant: "destructive",
      });
    } finally {
      setSavingCafeLitro(null);
    }
  };

  const saveValorRefeicao = async (tipo: string, valor: string) => {
    if (!valor || isNaN(Number(valor))) return;
    
    setSavingValor(tipo);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const valorNum = parseFloat(valor);
      
      // Verificar se já existe registro para o tipo
      const { data: existingData } = await supabase
        .from("valores_refeicoes")
        .select("id")
        .eq("tipo_refeicao", tipo)
        .maybeSingle();
      
      if (existingData) {
        // Atualizar registro existente
        const { error } = await supabase
          .from("valores_refeicoes")
          .update({ valor: valorNum, atualizado_por: user.id, updated_at: new Date().toISOString() })
          .eq("tipo_refeicao", tipo);
        
        if (error) throw error;
      } else {
        // Inserir novo registro
        const { error } = await supabase
          .from("valores_refeicoes")
          .insert({ tipo_refeicao: tipo, valor: valorNum, atualizado_por: user.id });
        
        if (error) throw error;
      }

      // Atualizar estado local imediatamente
      setValoresRefeicoes(prev => ({ ...prev, [tipo]: valorNum }));
      
      // Recarregar dados para atualizar os cálculos financeiros
      fetchData(true);
      
      toast({ title: "Sucesso", description: `Valor de ${tipo === 'cafe_litro' ? 'Café Litro' : tipo.charAt(0).toUpperCase() + tipo.slice(1)} atualizado!` });
    } catch (error: any) {
      console.error("Erro ao salvar valor:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar valor.",
        variant: "destructive",
      });
    } finally {
      setSavingValor(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dataInicio, dataFim]);

  // Admin: save edited cell quantity
  const saveEditedCell = async (dataStr: string, tipoRefeicao: string, newValue: number) => {
    const cellKey = `${dataStr}-${tipoRefeicao}`;
    setSavingCell(cellKey);
    try {
      // Get all records for that day+type and adjust
      const { data: records } = await supabase
        .from("refeicoes_registros")
        .select("id")
        .eq("data_registro", dataStr)
        .eq("tipo_refeicao", tipoRefeicao);

      const currentCount = records?.length || 0;
      const diff = newValue - currentCount;

      if (diff > 0) {
        // Need to add records
        const inserts = Array.from({ length: diff }, () => ({
          tipo_pessoa: "colaborador",
          colaborador_nome: "Ajuste administrativo",
          tipo_refeicao: tipoRefeicao,
          data_registro: dataStr,
          hora_registro: "00:00",
        }));
        const { error } = await supabase.from("refeicoes_registros").insert(inserts);
        if (error) throw error;
      } else if (diff < 0) {
        // Need to remove records (remove the most recent ones)
        const toRemove = Math.abs(diff);
        const { data: toDelete } = await supabase
          .from("refeicoes_registros")
          .select("id")
          .eq("data_registro", dataStr)
          .eq("tipo_refeicao", tipoRefeicao)
          .order("created_at", { ascending: false })
          .limit(toRemove);

        if (toDelete && toDelete.length > 0) {
          const { error } = await supabase
            .from("refeicoes_registros")
            .delete()
            .in("id", toDelete.map(r => r.id));
          if (error) throw error;
        }
      }

      toast({ title: "Sucesso", description: "Quantidade atualizada!" });
      setEditingCell(null);
      fetchData(true);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar.", variant: "destructive" });
    } finally {
      setSavingCell(null);
    }
  };

  // Admin: save edited diet cell quantity
  const saveDietaCellEdited = async (dataStr: string, tipoRefeicao: string, newValue: number, currentValue: number) => {
    const cellKey = `${dataStr}-dieta-${tipoRefeicao}`;
    console.log(`[DEBUG SAVE] saveDietaCellEdited called: date=${dataStr}, tipo=${tipoRefeicao}, newValue=${newValue}, currentValue=${currentValue}`);
    setSavingCell(cellKey);
    try {
      const diff = newValue - currentValue;
      console.log(`[DEBUG SAVE] diff=${diff}`);
      if (diff === 0) { setEditingCell(null); setSavingCell(null); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (diff > 0) {
        // Insert single-day approved diet entries
        const inserts = Array.from({ length: diff }, () => ({
          data_inicio: dataStr,
          data_fim: dataStr,
          status: "aprovada",
          horarios_refeicoes: [tipoRefeicao],
          tipo_dieta: "normal",
          solicitante_id: user.id,
          solicitante_nome: "Ajuste administrativo",
          observacoes: "[AJUSTE ADMIN]",
          tem_acompanhante: false,
          aprovado_por: user.id,
          aprovado_em: new Date().toISOString(),
        }));
        console.log(`[DEBUG SAVE] Inserting ${inserts.length} records`);
        const { error, data: insertedData } = await supabase.from("solicitacoes_dieta").insert(inserts).select();
        console.log(`[DEBUG SAVE] Insert result: error=${error?.message}, inserted=${insertedData?.length}`);
        if (error) throw error;
      } else {
        // Remove admin-created entries for that day/type first, then regular ones
        const toRemove = Math.abs(diff);
        const { data: adminEntries } = await supabase
          .from("solicitacoes_dieta")
          .select("id")
          .eq("status", "aprovada")
          .eq("data_inicio", dataStr)
          .eq("data_fim", dataStr)
          .ilike("observacoes", "%[AJUSTE ADMIN]%")
          .contains("horarios_refeicoes", [tipoRefeicao])
          .order("created_at", { ascending: false })
          .limit(toRemove);

        const idsToDelete = (adminEntries || []).map(e => e.id);
        
        if (idsToDelete.length > 0) {
          const { error } = await supabase
            .from("solicitacoes_dieta")
            .delete()
            .in("id", idsToDelete);
          if (error) throw error;
        }

        // If still need to remove more, remove other single-day entries
        const remaining = toRemove - idsToDelete.length;
        if (remaining > 0) {
          const { data: otherEntries } = await supabase
            .from("solicitacoes_dieta")
            .select("id")
            .eq("status", "aprovada")
            .eq("data_inicio", dataStr)
            .eq("data_fim", dataStr)
            .contains("horarios_refeicoes", [tipoRefeicao])
            .order("created_at", { ascending: false })
            .limit(remaining);

          if (otherEntries && otherEntries.length > 0) {
            const { error } = await supabase
              .from("solicitacoes_dieta")
              .delete()
              .in("id", otherEntries.map(e => e.id));
            if (error) throw error;
          }
        }
      }

      toast({ title: "Sucesso", description: "Quantidade de dietas atualizada!" });
      setEditingCell(null);
      fetchData(true);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar dietas.", variant: "destructive" });
    } finally {
      setSavingCell(null);
    }
  };

  // Função para determinar o tipo de refeição por horário
  const determinarTipoRefeicaoPorHorario = (hora: string): string => {
    const [hh] = hora.split(":").map(Number);
    if (hh >= 6 && hh < 10) return "cafe";
    if (hh >= 10 && hh < 15) return "almoco";
    if (hh >= 15 && hh < 18) return "lanche";
    if (hh >= 18 && hh <= 23) return "jantar";
    // Para madrugada (00-05), considerar como jantar do dia anterior
    return "jantar";
  };

  // Calcular distribuição de "fora de horário" por tipo de refeição real (para custos)
  const calcularForaHorarioPorTipo = () => {
    const foraHorarioRegistros = registrosRefeicoes.filter(r => r.tipo_refeicao === "fora_horario");
    let foraHorarioCafe = 0;
    let foraHorarioAlmoco = 0;
    let foraHorarioLanche = 0;
    let foraHorarioJantar = 0;

    foraHorarioRegistros.forEach(r => {
      const tipo = determinarTipoRefeicaoPorHorario(r.hora_registro);
      switch (tipo) {
        case "cafe": foraHorarioCafe++; break;
        case "almoco": foraHorarioAlmoco++; break;
        case "lanche": foraHorarioLanche++; break;
        case "jantar": foraHorarioJantar++; break;
      }
    });

    return { foraHorarioCafe, foraHorarioAlmoco, foraHorarioLanche, foraHorarioJantar };
  };

  const foraHorarioDistribuido = calcularForaHorarioPorTipo();

  // Calcular totais gerais (registros do totem)
  const totaisGerais = {
    cafe: quantitativos.reduce((acc, q) => acc + q.cafe, 0),
    almoco: quantitativos.reduce((acc, q) => acc + q.almoco, 0),
    lanche: quantitativos.reduce((acc, q) => acc + q.lanche, 0),
    jantar: quantitativos.reduce((acc, q) => acc + q.jantar, 0),
    foraHorario: quantitativos.reduce((acc, q) => acc + q.foraHorario, 0),
    totalRefeicoes: quantitativos.reduce((acc, q) => acc + q.totalRefeicoes, 0),
    cafeLitro: quantitativos.reduce((acc, q) => acc + q.cafeLitro, 0),
  };

  // Calcular dietas somando os quantitativos diários (reflete o período filtrado)
  const totaisDietas = {
    dietasCafe: quantitativos.reduce((acc, q) => acc + q.dietasCafe, 0),
    dietasAlmoco: quantitativos.reduce((acc, q) => acc + q.dietasAlmoco, 0),
    dietasLanche: quantitativos.reduce((acc, q) => acc + q.dietasLanche, 0),
    dietasJantar: quantitativos.reduce((acc, q) => acc + q.dietasJantar, 0),
    totalDietas: quantitativos.reduce((acc, q) => acc + q.totalDietas, 0),
  };

  // Calcular extras somando os quantitativos diários
  const totaisExtra = {
    extraCafe: quantitativos.reduce((acc, q) => acc + q.extraCafe, 0),
    extraAlmoco: quantitativos.reduce((acc, q) => acc + q.extraAlmoco, 0),
    extraLanche: quantitativos.reduce((acc, q) => acc + q.extraLanche, 0),
    extraJantar: quantitativos.reduce((acc, q) => acc + q.extraJantar, 0),
    totalExtra: quantitativos.reduce((acc, q) => acc + q.totalExtra, 0),
  };

  // Totais combinados para uso na interface
  const totaisGeraisCombinados = {
    ...totaisGerais,
    ...totaisDietas,
    ...totaisExtra,
    totalGeral: totaisGerais.totalRefeicoes + totaisDietas.totalDietas + totaisExtra.totalExtra,
  };

  // Calcular valores financeiros totais (incluindo fora de horário distribuído por tipo e extras)
  const valoresFinanceiros = {
    cafeLitro: totaisGerais.cafeLitro * (valoresRefeicoes.cafe_litro || 0),
    cafe: (totaisGerais.cafe + totaisDietas.dietasCafe + totaisExtra.extraCafe + foraHorarioDistribuido.foraHorarioCafe) * (valoresRefeicoes.cafe || 0),
    almoco: (totaisGerais.almoco + totaisDietas.dietasAlmoco + totaisExtra.extraAlmoco + foraHorarioDistribuido.foraHorarioAlmoco) * (valoresRefeicoes.almoco || 0),
    lanche: (totaisGerais.lanche + totaisDietas.dietasLanche + totaisExtra.extraLanche + foraHorarioDistribuido.foraHorarioLanche) * (valoresRefeicoes.lanche || 0),
    jantar: (totaisGerais.jantar + totaisDietas.dietasJantar + totaisExtra.extraJantar + foraHorarioDistribuido.foraHorarioJantar) * (valoresRefeicoes.jantar || 0),
    get total() {
      return this.cafeLitro + this.cafe + this.almoco + this.lanche + this.jantar;
    }
  };

  const exportToExcel = () => {
    const data = quantitativos.map(q => ({
      "Data": format(parseISO(q.data), "dd/MM/yyyy"),
      "Dia": format(parseISO(q.data), "EEEE", { locale: ptBR }),
      "Café Litro": q.cafeLitro,
      "Café (Totem)": q.cafe,
      "Almoço (Totem)": q.almoco,
      "Café da Tarde (Totem)": q.lanche,
      "Jantar (Totem)": q.jantar,
      "Fora Horário (Totem)": q.foraHorario,
      "Total Totem": q.totalRefeicoes,
      "Café (Dietas)": q.dietasCafe,
      "Almoço (Dietas)": q.dietasAlmoco,
      "Café da Tarde (Dietas)": q.dietasLanche,
      "Jantar (Dietas)": q.dietasJantar,
      "Total Dietas": q.totalDietas,
      "Café (Extra)": q.extraCafe,
      "Almoço (Extra)": q.extraAlmoco,
      "Café da Tarde (Extra)": q.extraLanche,
      "Jantar (Extra)": q.extraJantar,
      "Total Extra": q.totalExtra,
      "TOTAL GERAL": q.totalGeral,
    }));

    // Adicionar linha de totais
    data.push({
      "Data": "TOTAIS",
      "Dia": "",
      "Café Litro": totaisGerais.cafeLitro,
      "Café (Totem)": totaisGerais.cafe,
      "Almoço (Totem)": totaisGerais.almoco,
      "Café da Tarde (Totem)": totaisGerais.lanche,
      "Jantar (Totem)": totaisGerais.jantar,
      "Fora Horário (Totem)": totaisGerais.foraHorario,
      "Total Totem": totaisGerais.totalRefeicoes,
      "Café (Dietas)": totaisDietas.dietasCafe,
      "Almoço (Dietas)": totaisDietas.dietasAlmoco,
      "Café da Tarde (Dietas)": totaisDietas.dietasLanche,
      "Jantar (Dietas)": totaisDietas.dietasJantar,
      "Total Dietas": totaisDietas.totalDietas,
      "Café (Extra)": totaisExtra.extraCafe,
      "Almoço (Extra)": totaisExtra.extraAlmoco,
      "Café da Tarde (Extra)": totaisExtra.extraLanche,
      "Jantar (Extra)": totaisExtra.extraJantar,
      "Total Extra": totaisExtra.totalExtra,
      "TOTAL GERAL": totaisGeraisCombinados.totalGeral,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quantitativos");
    XLSX.writeFile(wb, `quantitativo_refeicoes_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast({ title: "Sucesso", description: "Arquivo Excel exportado!" });
  };

  const exportToPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Relatório Quantitativo de Refeições Diárias', 'landscape');
    
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${format(parseISO(dataInicio), "dd/MM/yyyy")} a ${format(parseISO(dataFim), "dd/MM/yyyy")}`, 14, 32);

    // Cores em RGB
    const azulTotem = [59, 130, 246];
    const azulClaro = [219, 234, 254];
    const laranjaDeita = [249, 115, 22];
    const laranjaClaro = [255, 237, 213];
    const verdeTotal = [5, 150, 105];
    const verdeClaro = [209, 250, 229];

    // Dashboard - KPIs
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Dashboard - Resumo por Tipo de Refeição", 14, 40);

    // Cards do Dashboard
    const cardWidth = 43;
    const cardHeight = 22;
    const cardStartY = 45;
    const cardGap = 3;

    // Card Café Litro (Cyan)
    doc.setFillColor(207, 250, 254);
    doc.roundedRect(14, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(6, 182, 212);
    doc.setLineWidth(0.8);
    doc.line(14, cardStartY, 14, cardStartY + cardHeight);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(14, 116, 144);
    doc.text("Cafe Litro", 18, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(totaisGerais.cafeLitro.toFixed(1) + "L", 18, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`${quantitativos.filter(q => q.cafeLitro > 0).length} dias`, 18, cardStartY + 19);

    // Card Café (Amber)
    doc.setFillColor(255, 243, 224);
    doc.roundedRect(14 + cardWidth + cardGap, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(245, 158, 11);
    doc.line(14 + cardWidth + cardGap, cardStartY, 14 + cardWidth + cardGap, cardStartY + cardHeight);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15);
    doc.text("Total Cafe", 18 + cardWidth + cardGap, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(totaisGerais.cafe + totaisDietas.dietasCafe + totaisExtra.extraCafe), 18 + cardWidth + cardGap, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`T:${totaisGerais.cafe} D:${totaisDietas.dietasCafe} E:${totaisExtra.extraCafe}`, 18 + cardWidth + cardGap, cardStartY + 19);

    // Card Almoço (Orange)
    doc.setFillColor(255, 237, 213);
    doc.roundedRect(14 + (cardWidth + cardGap) * 2, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(249, 115, 22);
    doc.line(14 + (cardWidth + cardGap) * 2, cardStartY, 14 + (cardWidth + cardGap) * 2, cardStartY + cardHeight);
    doc.setFontSize(8);
    doc.setTextColor(154, 52, 18);
    doc.text("Total Almoco", 18 + (cardWidth + cardGap) * 2, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(totaisGerais.almoco + totaisDietas.dietasAlmoco + totaisExtra.extraAlmoco), 18 + (cardWidth + cardGap) * 2, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`T:${totaisGerais.almoco} D:${totaisDietas.dietasAlmoco} E:${totaisExtra.extraAlmoco}`, 18 + (cardWidth + cardGap) * 2, cardStartY + 19);

    // Card Lanche (Pink)
    doc.setFillColor(252, 231, 243);
    doc.roundedRect(14 + (cardWidth + cardGap) * 3, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(236, 72, 153);
    doc.line(14 + (cardWidth + cardGap) * 3, cardStartY, 14 + (cardWidth + cardGap) * 3, cardStartY + cardHeight);
    doc.setFontSize(8);
    doc.setTextColor(157, 23, 77);
    doc.text("Total Café Tarde", 18 + (cardWidth + cardGap) * 3, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(totaisGerais.lanche + totaisDietas.dietasLanche + totaisExtra.extraLanche), 18 + (cardWidth + cardGap) * 3, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`T:${totaisGerais.lanche} D:${totaisDietas.dietasLanche} E:${totaisExtra.extraLanche}`, 18 + (cardWidth + cardGap) * 3, cardStartY + 19);

    // Card Jantar (Indigo)
    doc.setFillColor(224, 231, 255);
    doc.roundedRect(14 + (cardWidth + cardGap) * 4, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(99, 102, 241);
    doc.line(14 + (cardWidth + cardGap) * 4, cardStartY, 14 + (cardWidth + cardGap) * 4, cardStartY + cardHeight);
    doc.setFontSize(8);
    doc.setTextColor(55, 48, 163);
    doc.text("Total Jantar", 18 + (cardWidth + cardGap) * 4, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(totaisGerais.jantar + totaisDietas.dietasJantar + totaisExtra.extraJantar), 18 + (cardWidth + cardGap) * 4, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`T:${totaisGerais.jantar} D:${totaisDietas.dietasJantar} E:${totaisExtra.extraJantar}`, 18 + (cardWidth + cardGap) * 4, cardStartY + 19);

    // Card Total Geral (Emerald)
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(14 + (cardWidth + cardGap) * 5, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(5, 150, 105);
    doc.line(14 + (cardWidth + cardGap) * 5, cardStartY, 14 + (cardWidth + cardGap) * 5, cardStartY + cardHeight);
    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70);
    doc.text("Total Geral", 18 + (cardWidth + cardGap) * 5, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(totaisGeraisCombinados.totalGeral), 18 + (cardWidth + cardGap) * 5, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`T:${totaisGerais.totalRefeicoes} D:${totaisDietas.totalDietas} E:${totaisExtra.totalExtra}`, 18 + (cardWidth + cardGap) * 5, cardStartY + 19);

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Seção de Valores Financeiros (apenas para admin)
    let finalY = cardStartY + cardHeight + 8;

    if (isAdmin) {
      const financeiroY = cardStartY + cardHeight + 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo Financeiro do Periodo", 14, financeiroY);

      // Tabela de valores financeiros
      const formatCurrency = (value: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

      autoTable(doc, {
        startY: financeiroY + 3,
        head: [[
          { content: "Tipo de Refeicao", styles: { halign: "center", fillColor: [59, 130, 246] as [number, number, number], textColor: 255 } },
          { content: "Qtd Total", styles: { halign: "center", fillColor: [59, 130, 246] as [number, number, number], textColor: 255 } },
          { content: "Valor Unitario", styles: { halign: "center", fillColor: [59, 130, 246] as [number, number, number], textColor: 255 } },
          { content: "Valor Total", styles: { halign: "center", fillColor: [5, 150, 105] as [number, number, number], textColor: 255 } },
        ]],
        body: [
          ["Cafe Litro", `${totaisGerais.cafeLitro.toFixed(1)} L`, formatCurrency(valoresRefeicoes.cafe_litro || 0), formatCurrency(valoresFinanceiros.cafeLitro)],
          ["Café da Manhã", String(totaisGerais.cafe + totaisDietas.dietasCafe + totaisExtra.extraCafe), formatCurrency(valoresRefeicoes.cafe || 0), formatCurrency(valoresFinanceiros.cafe)],
          ["Almoco", String(totaisGerais.almoco + totaisDietas.dietasAlmoco + totaisExtra.extraAlmoco), formatCurrency(valoresRefeicoes.almoco || 0), formatCurrency(valoresFinanceiros.almoco)],
          ["Café da Tarde", String(totaisGerais.lanche + totaisDietas.dietasLanche + totaisExtra.extraLanche), formatCurrency(valoresRefeicoes.lanche || 0), formatCurrency(valoresFinanceiros.lanche)],
          ["Jantar", String(totaisGerais.jantar + totaisDietas.dietasJantar + totaisExtra.extraJantar), formatCurrency(valoresRefeicoes.jantar || 0), formatCurrency(valoresFinanceiros.jantar)],
        ],
        foot: [[
          { content: "TOTAL GERAL", colSpan: 3, styles: { halign: "right", fillColor: [209, 213, 219] as [number, number, number], fontStyle: "bold" } },
          { content: formatCurrency(valoresFinanceiros.total), styles: { halign: "center", fillColor: [5, 150, 105] as [number, number, number], fontStyle: "bold", textColor: 255 } },
        ]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fontSize: 8 },
        footStyles: { fontSize: 9 },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "center" },
          2: { halign: "center" },
          3: { halign: "center" },
        },
        tableWidth: 140,
        margin: { left: 14 },
      });

      // Obter posição Y após a tabela financeira
      finalY = (doc as any).lastAutoTable.finalY + 8;
    }

    // Tabela principal com cores
    const roxoExtra = [168, 85, 247];
    const roxoClaro = [243, 232, 255];

    const tableBody = quantitativos.map(q => [
      format(parseISO(q.data), "dd/MM") + " (" + format(parseISO(q.data), "EEE", { locale: ptBR }) + ")",
      q.cafeLitro > 0 ? q.cafeLitro.toFixed(1) + "L" : "-",
      q.cafe || "-",
      q.almoco || "-",
      q.lanche || "-",
      q.jantar || "-",
      q.totalRefeicoes,
      q.dietasCafe || "-",
      q.dietasAlmoco || "-",
      q.dietasLanche || "-",
      q.dietasJantar || "-",
      q.totalDietas,
      q.extraCafe || "-",
      q.extraAlmoco || "-",
      q.extraLanche || "-",
      q.extraJantar || "-",
      q.totalExtra,
      q.totalGeral,
    ]);

    // Adicionar linha de totais
    tableBody.push([
      "TOTAIS",
      totaisGerais.cafeLitro.toFixed(1) + "L",
      totaisGerais.cafe,
      totaisGerais.almoco,
      totaisGerais.lanche,
      totaisGerais.jantar,
      totaisGerais.totalRefeicoes,
      totaisDietas.dietasCafe,
      totaisDietas.dietasAlmoco,
      totaisDietas.dietasLanche,
      totaisDietas.dietasJantar,
      totaisDietas.totalDietas,
      totaisExtra.extraCafe,
      totaisExtra.extraAlmoco,
      totaisExtra.extraLanche,
      totaisExtra.extraJantar,
      totaisExtra.totalExtra,
      totaisGeraisCombinados.totalGeral,
    ]);

    autoTable(doc, {
      startY: finalY,
      head: [
        [
          { content: "Data", rowSpan: 2, styles: { halign: "center", valign: "middle", fillColor: [229, 231, 235] } },
          { content: "Totem (Colaboradores/Visitantes)", colSpan: 6, styles: { halign: "center", fillColor: azulTotem as [number, number, number], textColor: 255 } },
          { content: "Dietas (Pacientes/Acompanhantes)", colSpan: 5, styles: { halign: "center", fillColor: laranjaDeita as [number, number, number], textColor: 255 } },
          { content: "Extra", colSpan: 5, styles: { halign: "center", fillColor: roxoExtra as [number, number, number], textColor: 255 } },
          { content: "Total", rowSpan: 2, styles: { halign: "center", valign: "middle", fillColor: verdeTotal as [number, number, number], textColor: 255 } },
        ],
        [
          { content: "Cafe Litro", styles: { halign: "center", fillColor: [147, 197, 253] as [number, number, number], textColor: [30, 58, 138], fontStyle: "bold" } },
          { content: "Café Manhã\n05:30-09:59", styles: { halign: "center", fillColor: azulClaro as [number, number, number], textColor: [30, 64, 175] } },
          { content: "Almoço\n10:00-14:59", styles: { halign: "center", fillColor: azulClaro as [number, number, number], textColor: [30, 64, 175] } },
          { content: "Café Tarde\n15:00-17:59", styles: { halign: "center", fillColor: azulClaro as [number, number, number], textColor: [30, 64, 175] } },
          { content: "Jantar\n18:00-23:59", styles: { halign: "center", fillColor: azulClaro as [number, number, number], textColor: [30, 64, 175] } },
          { content: "Subtotal", styles: { halign: "center", fillColor: [147, 197, 253] as [number, number, number], textColor: [30, 58, 138], fontStyle: "bold" } },
          { content: "Café Manhã", styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], textColor: [154, 52, 18] } },
          { content: "Almoco", styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], textColor: [154, 52, 18] } },
          { content: "Café Tarde", styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], textColor: [154, 52, 18] } },
          { content: "Jantar", styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], textColor: [154, 52, 18] } },
          { content: "Subtotal", styles: { halign: "center", fillColor: [253, 186, 116] as [number, number, number], textColor: [124, 45, 18], fontStyle: "bold" } },
          { content: "Café Manhã", styles: { halign: "center", fillColor: roxoClaro as [number, number, number], textColor: [88, 28, 135] } },
          { content: "Almoco", styles: { halign: "center", fillColor: roxoClaro as [number, number, number], textColor: [88, 28, 135] } },
          { content: "Café Tarde", styles: { halign: "center", fillColor: roxoClaro as [number, number, number], textColor: [88, 28, 135] } },
          { content: "Jantar", styles: { halign: "center", fillColor: roxoClaro as [number, number, number], textColor: [88, 28, 135] } },
          { content: "Subtotal", styles: { halign: "center", fillColor: [192, 132, 252] as [number, number, number], textColor: [59, 7, 100], fontStyle: "bold" } },
        ],
      ],
      body: tableBody.slice(0, -1).map((row) => [
        { content: row[0], styles: { fillColor: [249, 250, 251] as [number, number, number] } },
        { content: row[1], styles: { halign: "center", fillColor: [147, 197, 253] as [number, number, number], fontStyle: "bold", textColor: [30, 58, 138] } },
        { content: row[2], styles: { halign: "center", fillColor: [239, 246, 255] as [number, number, number] } },
        { content: row[3], styles: { halign: "center", fillColor: [239, 246, 255] as [number, number, number] } },
        { content: row[4], styles: { halign: "center", fillColor: [239, 246, 255] as [number, number, number] } },
        { content: row[5], styles: { halign: "center", fillColor: [239, 246, 255] as [number, number, number] } },
        { content: row[6], styles: { halign: "center", fillColor: azulClaro as [number, number, number], fontStyle: "bold", textColor: [30, 64, 175] } },
        { content: row[7], styles: { halign: "center", fillColor: [255, 247, 237] as [number, number, number] } },
        { content: row[8], styles: { halign: "center", fillColor: [255, 247, 237] as [number, number, number] } },
        { content: row[9], styles: { halign: "center", fillColor: [255, 247, 237] as [number, number, number] } },
        { content: row[10], styles: { halign: "center", fillColor: [255, 247, 237] as [number, number, number] } },
        { content: row[11], styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], fontStyle: "bold", textColor: [154, 52, 18] } },
        { content: row[12], styles: { halign: "center", fillColor: [250, 245, 255] as [number, number, number] } },
        { content: row[13], styles: { halign: "center", fillColor: [250, 245, 255] as [number, number, number] } },
        { content: row[14], styles: { halign: "center", fillColor: [250, 245, 255] as [number, number, number] } },
        { content: row[15], styles: { halign: "center", fillColor: [250, 245, 255] as [number, number, number] } },
        { content: row[16], styles: { halign: "center", fillColor: roxoClaro as [number, number, number], fontStyle: "bold", textColor: [88, 28, 135] } },
        { content: row[17], styles: { halign: "center", fillColor: verdeClaro as [number, number, number], fontStyle: "bold", textColor: [6, 95, 70] } },
      ]),
      foot: [[
        { content: "TOTAIS", styles: { fillColor: [209, 213, 219] as [number, number, number], fontStyle: "bold" } },
        { content: String(totaisGerais.cafeLitro.toFixed(1) + "L"), styles: { halign: "center", fillColor: [147, 197, 253] as [number, number, number], fontStyle: "bold", textColor: [30, 58, 138] } },
        { content: String(totaisGerais.cafe), styles: { halign: "center", fillColor: azulClaro as [number, number, number], fontStyle: "bold", textColor: [30, 64, 175] } },
        { content: String(totaisGerais.almoco), styles: { halign: "center", fillColor: azulClaro as [number, number, number], fontStyle: "bold", textColor: [30, 64, 175] } },
        { content: String(totaisGerais.lanche), styles: { halign: "center", fillColor: azulClaro as [number, number, number], fontStyle: "bold", textColor: [30, 64, 175] } },
        { content: String(totaisGerais.jantar), styles: { halign: "center", fillColor: azulClaro as [number, number, number], fontStyle: "bold", textColor: [30, 64, 175] } },
        { content: String(totaisGerais.totalRefeicoes), styles: { halign: "center", fillColor: azulTotem as [number, number, number], fontStyle: "bold", textColor: 255 } },
        { content: String(totaisDietas.dietasCafe), styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], fontStyle: "bold", textColor: [154, 52, 18] } },
        { content: String(totaisDietas.dietasAlmoco), styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], fontStyle: "bold", textColor: [154, 52, 18] } },
        { content: String(totaisDietas.dietasLanche), styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], fontStyle: "bold", textColor: [154, 52, 18] } },
        { content: String(totaisDietas.dietasJantar), styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], fontStyle: "bold", textColor: [154, 52, 18] } },
        { content: String(totaisDietas.totalDietas), styles: { halign: "center", fillColor: laranjaDeita as [number, number, number], fontStyle: "bold", textColor: 255 } },
        { content: String(totaisExtra.extraCafe), styles: { halign: "center", fillColor: roxoClaro as [number, number, number], fontStyle: "bold", textColor: [88, 28, 135] } },
        { content: String(totaisExtra.extraAlmoco), styles: { halign: "center", fillColor: roxoClaro as [number, number, number], fontStyle: "bold", textColor: [88, 28, 135] } },
        { content: String(totaisExtra.extraLanche), styles: { halign: "center", fillColor: roxoClaro as [number, number, number], fontStyle: "bold", textColor: [88, 28, 135] } },
        { content: String(totaisExtra.extraJantar), styles: { halign: "center", fillColor: roxoClaro as [number, number, number], fontStyle: "bold", textColor: [88, 28, 135] } },
        { content: String(totaisExtra.totalExtra), styles: { halign: "center", fillColor: roxoExtra as [number, number, number], fontStyle: "bold", textColor: 255 } },
        { content: String(totaisGeraisCombinados.totalGeral), styles: { halign: "center", fillColor: verdeTotal as [number, number, number], fontStyle: "bold", textColor: 255 } },
      ]],
      styles: { fontSize: 6, cellPadding: 1.5 },
      headStyles: { fontSize: 6 },
      footStyles: { fontSize: 7 },
      margin: { top: 32, bottom: 30 },
      columnStyles: {
        0: { cellWidth: 22 },
      },
    });

    savePdfWithFooter(doc, 'Relatório Quantitativo de Refeições Diárias', `quantitativo_refeicoes_${format(new Date(), "yyyyMMdd_HHmm")}`, logoImg);
    toast({ title: "Sucesso", description: "Arquivo PDF exportado com dashboard!" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Relatório Quantitativo Diário
              </CardTitle>
              <CardDescription>
                Quantitativos de refeições por tipo, incluindo dietas aprovadas
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-[140px]"
              />
              <div className="flex gap-1">
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowValoresConfig(!showValoresConfig)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Valores
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportToExcel}
                  disabled={quantitativos.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportToPDF}
                  disabled={quantitativos.length === 0}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Configuração de Valores - apenas Admin */}
              {isAdmin && showValoresConfig && (
                <Card className="mb-6 border-2 border-dashed border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Configurar Valores por Refeição
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { key: "cafe_litro", label: "Café Litro (L)", icon: <Droplets className="h-4 w-4" /> },
                        { key: "cafe", label: "Café da Manhã (un)", icon: <Coffee className="h-4 w-4" /> },
                        { key: "almoco", label: "Almoço (un)", icon: <Sun className="h-4 w-4" /> },
                        { key: "lanche", label: "Café da Tarde (un)", icon: <Cookie className="h-4 w-4" /> },
                        { key: "jantar", label: "Jantar (un)", icon: <Moon className="h-4 w-4" /> },
                      ].map((item) => (
                        <div key={item.key} className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            {item.icon}
                            {item.label}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">R$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={valoresInputs[item.key] || "0"}
                              onChange={(e) => setValoresInputs(prev => ({ ...prev, [item.key]: e.target.value }))}
                              className="h-8 text-sm"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => saveValorRefeicao(item.key, valoresInputs[item.key] || "0")}
                              disabled={savingValor === item.key}
                            >
                              {savingValor === item.key ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resumo Financeiro - apenas Admin */}
              {isAdmin && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-emerald-800">Resumo Financeiro do Período</h3>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="text-center p-2 bg-white/60 rounded">
                    <p className="text-xs text-muted-foreground">Café Litro</p>
                    <p className="font-bold text-emerald-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valoresFinanceiros.cafeLitro)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white/60 rounded">
                    <p className="text-xs text-muted-foreground">Café</p>
                    <p className="font-bold text-emerald-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valoresFinanceiros.cafe)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white/60 rounded">
                    <p className="text-xs text-muted-foreground">Almoço</p>
                    <p className="font-bold text-emerald-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valoresFinanceiros.almoco)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white/60 rounded">
                    <p className="text-xs text-muted-foreground">Café da Tarde</p>
                    <p className="font-bold text-emerald-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valoresFinanceiros.lanche)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white/60 rounded">
                    <p className="text-xs text-muted-foreground">Jantar</p>
                    <p className="font-bold text-emerald-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valoresFinanceiros.jantar)}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-emerald-600 text-white rounded">
                    <p className="text-xs opacity-90">Total Geral</p>
                    <p className="font-bold text-lg">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valoresFinanceiros.total)}
                    </p>
                  </div>
                </div>
              </div>
              )}

              {/* KPIs Resumo Geral */}
              <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
                {/* Café Litro */}
                <div className="p-4 bg-cyan-50 rounded-lg border-l-4 border-cyan-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Droplets className="h-4 w-4 text-cyan-600" />
                    <p className="text-sm text-muted-foreground">Total Café Litro</p>
                  </div>
                  <p className="text-2xl font-bold text-cyan-700">
                    {totaisGerais.cafeLitro.toFixed(1)}L
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {quantitativos.filter(q => q.cafeLitro > 0).length} dias registrados
                  </p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Coffee className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-muted-foreground">Total Café</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">
                    {totaisGerais.cafe + totaisDietas.dietasCafe + totaisExtra.extraCafe}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    T: {totaisGerais.cafe} | D: {totaisDietas.dietasCafe} | E: {totaisExtra.extraCafe}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Sun className="h-4 w-4 text-orange-600" />
                    <p className="text-sm text-muted-foreground">Total Almoço</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">
                    {totaisGerais.almoco + totaisDietas.dietasAlmoco + totaisExtra.extraAlmoco}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    T: {totaisGerais.almoco} | D: {totaisDietas.dietasAlmoco} | E: {totaisExtra.extraAlmoco}
                  </p>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg border-l-4 border-pink-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Cookie className="h-4 w-4 text-pink-600" />
                    <p className="text-sm text-muted-foreground">Total Café da Tarde</p>
                  </div>
                  <p className="text-2xl font-bold text-pink-700">
                    {totaisGerais.lanche + totaisDietas.dietasLanche + totaisExtra.extraLanche}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    T: {totaisGerais.lanche} | D: {totaisDietas.dietasLanche} | E: {totaisExtra.extraLanche}
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Moon className="h-4 w-4 text-indigo-600" />
                    <p className="text-sm text-muted-foreground">Total Jantar</p>
                  </div>
                  <p className="text-2xl font-bold text-indigo-700">
                    {totaisGerais.jantar + totaisDietas.dietasJantar + totaisExtra.extraJantar}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    T: {totaisGerais.jantar} | D: {totaisDietas.dietasJantar} | E: {totaisExtra.extraJantar}
                  </p>
                </div>
                {totaisGerais.foraHorario > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <p className="text-sm text-muted-foreground">Fora Horário</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-700">
                      {totaisGerais.foraHorario}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Totem: {totaisGerais.foraHorario}
                    </p>
                  </div>
                )}
                <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Total Geral</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {totaisGeraisCombinados.totalGeral}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    T: {totaisGerais.totalRefeicoes} | D: {totaisDietas.totalDietas} | E: {totaisExtra.totalExtra}
                  </p>
                </div>
              </div>

              {/* Tabela de Quantitativos */}
              {quantitativos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum registro encontrado no período selecionado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead rowSpan={2} className="border-r bg-muted">Data</TableHead>
                        <TableHead colSpan={7} className="text-center border-r bg-blue-500 text-white">
                          Totem (Colaboradores/Visitantes)
                        </TableHead>
                        <TableHead colSpan={5} className="text-center border-r bg-orange-500 text-white">
                          Dietas (Pacientes/Acompanhantes)
                        </TableHead>
                        <TableHead colSpan={5} className="text-center border-r bg-purple-500 text-white">
                          Extra
                        </TableHead>
                        <TableHead rowSpan={2} className="text-center bg-emerald-600 text-white font-bold">
                          Total
                        </TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead className="text-center bg-blue-200 text-blue-900 font-semibold">
                          <div className="flex items-center justify-center gap-1">
                            <Droplets className="h-3 w-3" />
                            Café Litro
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-blue-100 text-blue-800">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center gap-1">
                              <Coffee className="h-3 w-3" />
                              Café
                            </div>
                            <span className="text-[10px] font-normal opacity-70">05:30–09:59</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-blue-100 text-blue-800">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center gap-1">
                              <Sun className="h-3 w-3" />
                              Almoço
                            </div>
                            <span className="text-[10px] font-normal opacity-70">10:00–14:59</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-blue-100 text-blue-800">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center gap-1">
                              <Cookie className="h-3 w-3" />
                              Café Tarde
                            </div>
                            <span className="text-[10px] font-normal opacity-70">15:00–17:59</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-blue-100 text-blue-800">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center gap-1">
                              <Moon className="h-3 w-3" />
                              Jantar
                            </div>
                            <span className="text-[10px] font-normal opacity-70">18:00–23:59</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-gray-200 text-gray-800">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                            Fora Hr.
                          </div>
                        </TableHead>
                        <TableHead className="text-center border-r bg-blue-200 text-blue-900 font-semibold">Subtotal</TableHead>
                        <TableHead className="text-center bg-orange-100 text-orange-800">Café</TableHead>
                        <TableHead className="text-center bg-orange-100 text-orange-800">Almoço</TableHead>
                        <TableHead className="text-center bg-orange-100 text-orange-800">Café Tarde</TableHead>
                        <TableHead className="text-center bg-orange-100 text-orange-800">Jantar</TableHead>
                        <TableHead className="text-center border-r bg-orange-200 text-orange-900 font-semibold">Subtotal</TableHead>
                        <TableHead className="text-center bg-purple-100 text-purple-800">Café</TableHead>
                        <TableHead className="text-center bg-purple-100 text-purple-800">Almoço</TableHead>
                        <TableHead className="text-center bg-purple-100 text-purple-800">Café Tarde</TableHead>
                        <TableHead className="text-center bg-purple-100 text-purple-800">Jantar</TableHead>
                        <TableHead className="text-center border-r bg-purple-200 text-purple-900 font-semibold">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quantitativos.map((q) => (
                        <TableRow key={q.data}>
                          <TableCell className="border-r font-medium bg-muted/30">
                            <div>
                              <span>{format(parseISO(q.data), "dd/MM")}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({format(parseISO(q.data), "EEE", { locale: ptBR })})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center bg-blue-200">
                            <div className="flex items-center justify-center gap-1">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="0"
                                value={cafeLitroInputs[q.data] || ""}
                                onChange={(e) => setCafeLitroInputs(prev => ({ ...prev, [q.data]: e.target.value }))}
                                className="w-16 h-7 text-center text-sm p-1"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => saveCafeLitro(q.data, cafeLitroInputs[q.data] || "0")}
                                disabled={savingCafeLitro === q.data}
                              >
                                {savingCafeLitro === q.data ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center bg-blue-50">
                            {isAdmin ? (
                              editingCell === `${q.data}-cafe` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEditedCell(q.data, 'cafe', parseInt(editValue) || 0); if (e.key === 'Escape') setEditingCell(null); }} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEditedCell(q.data, 'cafe', parseInt(editValue) || 0)} disabled={savingCell === `${q.data}-cafe`}>{savingCell === `${q.data}-cafe` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span className="cursor-pointer hover:underline" onClick={() => { setEditingCell(`${q.data}-cafe`); setEditValue(String(q.cafe)); }}>{q.cafe || "-"}</span>
                              )
                            ) : (q.cafe || "-")}
                          </TableCell>
                          <TableCell className="text-center bg-blue-50">
                            {isAdmin ? (
                              editingCell === `${q.data}-almoco` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEditedCell(q.data, 'almoco', parseInt(editValue) || 0); if (e.key === 'Escape') setEditingCell(null); }} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEditedCell(q.data, 'almoco', parseInt(editValue) || 0)} disabled={savingCell === `${q.data}-almoco`}>{savingCell === `${q.data}-almoco` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span className="cursor-pointer hover:underline" onClick={() => { setEditingCell(`${q.data}-almoco`); setEditValue(String(q.almoco)); }}>{q.almoco || "-"}</span>
                              )
                            ) : (q.almoco || "-")}
                          </TableCell>
                          <TableCell className="text-center bg-blue-50">
                            {isAdmin ? (
                              editingCell === `${q.data}-lanche` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEditedCell(q.data, 'lanche', parseInt(editValue) || 0); if (e.key === 'Escape') setEditingCell(null); }} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEditedCell(q.data, 'lanche', parseInt(editValue) || 0)} disabled={savingCell === `${q.data}-lanche`}>{savingCell === `${q.data}-lanche` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span className="cursor-pointer hover:underline" onClick={() => { setEditingCell(`${q.data}-lanche`); setEditValue(String(q.lanche)); }}>{q.lanche || "-"}</span>
                              )
                            ) : (q.lanche || "-")}
                          </TableCell>
                          <TableCell className="text-center bg-blue-50">
                            {isAdmin ? (
                              editingCell === `${q.data}-jantar` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEditedCell(q.data, 'jantar', parseInt(editValue) || 0); if (e.key === 'Escape') setEditingCell(null); }} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEditedCell(q.data, 'jantar', parseInt(editValue) || 0)} disabled={savingCell === `${q.data}-jantar`}>{savingCell === `${q.data}-jantar` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span className="cursor-pointer hover:underline" onClick={() => { setEditingCell(`${q.data}-jantar`); setEditValue(String(q.jantar)); }}>{q.jantar || "-"}</span>
                              )
                            ) : (q.jantar || "-")}
                          </TableCell>
                          <TableCell className="text-center bg-gray-100">{q.foraHorario || "-"}</TableCell>
                          <TableCell className="text-center border-r bg-blue-100 font-semibold text-blue-800">
                            {q.totalRefeicoes}
                          </TableCell>
                          {/* Dietas - Café */}
                          <TableCell className={`text-center bg-orange-50 ${isAdmin && editingCell !== `${q.data}-dieta-cafe` ? 'cursor-pointer hover:bg-orange-100' : ''}`} onClick={() => { if (isAdmin && editingCell !== `${q.data}-dieta-cafe`) { console.log('Editing diet cafe for', q.data); setEditingCell(`${q.data}-dieta-cafe`); setEditValue(String(q.dietasCafe)); } }}>
                            {isAdmin ? (
                              editingCell === `${q.data}-dieta-cafe` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveDietaCellEdited(q.data, 'cafe', parseInt(editValue) || 0, q.dietasCafe); if (e.key === 'Escape') setEditingCell(null); }} onClick={(e) => e.stopPropagation()} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); saveDietaCellEdited(q.data, 'cafe', parseInt(editValue) || 0, q.dietasCafe); }} disabled={savingCell === `${q.data}-dieta-cafe`}>{savingCell === `${q.data}-dieta-cafe` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span>{q.dietasCafe || "-"}</span>
                              )
                            ) : (q.dietasCafe || "-")}
                          </TableCell>
                          {/* Dietas - Almoço */}
                          <TableCell className={`text-center bg-orange-50 ${isAdmin && editingCell !== `${q.data}-dieta-almoco` ? 'cursor-pointer hover:bg-orange-100' : ''}`} onClick={() => { if (isAdmin && editingCell !== `${q.data}-dieta-almoco`) { console.log('Editing diet almoco for', q.data); setEditingCell(`${q.data}-dieta-almoco`); setEditValue(String(q.dietasAlmoco)); } }}>
                            {isAdmin ? (
                              editingCell === `${q.data}-dieta-almoco` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveDietaCellEdited(q.data, 'almoco', parseInt(editValue) || 0, q.dietasAlmoco); if (e.key === 'Escape') setEditingCell(null); }} onClick={(e) => e.stopPropagation()} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); saveDietaCellEdited(q.data, 'almoco', parseInt(editValue) || 0, q.dietasAlmoco); }} disabled={savingCell === `${q.data}-dieta-almoco`}>{savingCell === `${q.data}-dieta-almoco` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span>{q.dietasAlmoco || "-"}</span>
                              )
                            ) : (q.dietasAlmoco || "-")}
                          </TableCell>
                          {/* Dietas - Lanche */}
                          <TableCell className={`text-center bg-orange-50 ${isAdmin && editingCell !== `${q.data}-dieta-lanche` ? 'cursor-pointer hover:bg-orange-100' : ''}`} onClick={() => { if (isAdmin && editingCell !== `${q.data}-dieta-lanche`) { console.log('Editing diet lanche for', q.data); setEditingCell(`${q.data}-dieta-lanche`); setEditValue(String(q.dietasLanche)); } }}>
                            {isAdmin ? (
                              editingCell === `${q.data}-dieta-lanche` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveDietaCellEdited(q.data, 'lanche', parseInt(editValue) || 0, q.dietasLanche); if (e.key === 'Escape') setEditingCell(null); }} onClick={(e) => e.stopPropagation()} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); saveDietaCellEdited(q.data, 'lanche', parseInt(editValue) || 0, q.dietasLanche); }} disabled={savingCell === `${q.data}-dieta-lanche`}>{savingCell === `${q.data}-dieta-lanche` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span>{q.dietasLanche || "-"}</span>
                              )
                            ) : (q.dietasLanche || "-")}
                          </TableCell>
                          {/* Dietas - Jantar */}
                          <TableCell className={`text-center bg-orange-50 ${isAdmin && editingCell !== `${q.data}-dieta-jantar` ? 'cursor-pointer hover:bg-orange-100' : ''}`} onClick={() => { if (isAdmin && editingCell !== `${q.data}-dieta-jantar`) { console.log('Editing diet jantar for', q.data); setEditingCell(`${q.data}-dieta-jantar`); setEditValue(String(q.dietasJantar)); } }}>
                            {isAdmin ? (
                              editingCell === `${q.data}-dieta-jantar` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveDietaCellEdited(q.data, 'jantar', parseInt(editValue) || 0, q.dietasJantar); if (e.key === 'Escape') setEditingCell(null); }} onClick={(e) => e.stopPropagation()} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); saveDietaCellEdited(q.data, 'jantar', parseInt(editValue) || 0, q.dietasJantar); }} disabled={savingCell === `${q.data}-dieta-jantar`}>{savingCell === `${q.data}-dieta-jantar` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span>{q.dietasJantar || "-"}</span>
                              )
                            ) : (q.dietasJantar || "-")}
                          </TableCell>
                          <TableCell className="text-center border-r bg-orange-100 font-semibold text-orange-800">
                            {q.totalDietas}
                          </TableCell>
                          {/* Extra - Café */}
                          <TableCell className="text-center bg-purple-50">
                            {isAdmin ? (
                              editingCell === `${q.data}-extra-cafe` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveExtraCellEdited(q.data, 'cafe', parseInt(editValue) || 0, q.extraCafe); if (e.key === 'Escape') setEditingCell(null); }} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveExtraCellEdited(q.data, 'cafe', parseInt(editValue) || 0, q.extraCafe)} disabled={savingCell === `${q.data}-extra-cafe`}>{savingCell === `${q.data}-extra-cafe` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span className="cursor-pointer hover:underline" onClick={() => { setEditingCell(`${q.data}-extra-cafe`); setEditValue(String(q.extraCafe)); }}>{q.extraCafe || "-"}</span>
                              )
                            ) : (q.extraCafe || "-")}
                          </TableCell>
                          {/* Extra - Almoço */}
                          <TableCell className="text-center bg-purple-50">
                            {isAdmin ? (
                              editingCell === `${q.data}-extra-almoco` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveExtraCellEdited(q.data, 'almoco', parseInt(editValue) || 0, q.extraAlmoco); if (e.key === 'Escape') setEditingCell(null); }} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveExtraCellEdited(q.data, 'almoco', parseInt(editValue) || 0, q.extraAlmoco)} disabled={savingCell === `${q.data}-extra-almoco`}>{savingCell === `${q.data}-extra-almoco` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span className="cursor-pointer hover:underline" onClick={() => { setEditingCell(`${q.data}-extra-almoco`); setEditValue(String(q.extraAlmoco)); }}>{q.extraAlmoco || "-"}</span>
                              )
                            ) : (q.extraAlmoco || "-")}
                          </TableCell>
                          {/* Extra - Lanche */}
                          <TableCell className="text-center bg-purple-50">
                            {isAdmin ? (
                              editingCell === `${q.data}-extra-lanche` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveExtraCellEdited(q.data, 'lanche', parseInt(editValue) || 0, q.extraLanche); if (e.key === 'Escape') setEditingCell(null); }} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveExtraCellEdited(q.data, 'lanche', parseInt(editValue) || 0, q.extraLanche)} disabled={savingCell === `${q.data}-extra-lanche`}>{savingCell === `${q.data}-extra-lanche` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span className="cursor-pointer hover:underline" onClick={() => { setEditingCell(`${q.data}-extra-lanche`); setEditValue(String(q.extraLanche)); }}>{q.extraLanche || "-"}</span>
                              )
                            ) : (q.extraLanche || "-")}
                          </TableCell>
                          {/* Extra - Jantar */}
                          <TableCell className="text-center bg-purple-50">
                            {isAdmin ? (
                              editingCell === `${q.data}-extra-jantar` ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Input type="number" min="0" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-14 h-7 text-center text-sm p-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveExtraCellEdited(q.data, 'jantar', parseInt(editValue) || 0, q.extraJantar); if (e.key === 'Escape') setEditingCell(null); }} />
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveExtraCellEdited(q.data, 'jantar', parseInt(editValue) || 0, q.extraJantar)} disabled={savingCell === `${q.data}-extra-jantar`}>{savingCell === `${q.data}-extra-jantar` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}</Button>
                                </div>
                              ) : (
                                <span className="cursor-pointer hover:underline" onClick={() => { setEditingCell(`${q.data}-extra-jantar`); setEditValue(String(q.extraJantar)); }}>{q.extraJantar || "-"}</span>
                              )
                            ) : (q.extraJantar || "-")}
                          </TableCell>
                          <TableCell className="text-center border-r bg-purple-100 font-semibold text-purple-800">
                            {q.totalExtra}
                          </TableCell>
                          <TableCell className="text-center bg-emerald-100 font-bold text-emerald-800">
                            {q.totalGeral}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Linha de Totais */}
                      <TableRow className="font-bold border-t-2 border-gray-400">
                        <TableCell className="border-r bg-gray-200 text-gray-800">TOTAIS</TableCell>
                        <TableCell className="text-center bg-blue-200 text-blue-900 font-bold">
                          {totaisGerais.cafeLitro.toFixed(1)}L
                        </TableCell>
                        <TableCell className="text-center bg-blue-100 text-blue-800">{totaisGerais.cafe}</TableCell>
                        <TableCell className="text-center bg-blue-100 text-blue-800">{totaisGerais.almoco}</TableCell>
                        <TableCell className="text-center bg-blue-100 text-blue-800">{totaisGerais.lanche}</TableCell>
                        <TableCell className="text-center bg-blue-100 text-blue-800">{totaisGerais.jantar}</TableCell>
                        <TableCell className="text-center bg-gray-200 text-gray-800">{totaisGerais.foraHorario}</TableCell>
                        <TableCell className="text-center border-r bg-blue-500 text-white">
                          {totaisGerais.totalRefeicoes}
                        </TableCell>
                        <TableCell className="text-center bg-orange-100 text-orange-800">{totaisDietas.dietasCafe}</TableCell>
                        <TableCell className="text-center bg-orange-100 text-orange-800">{totaisDietas.dietasAlmoco}</TableCell>
                        <TableCell className="text-center bg-orange-100 text-orange-800">{totaisDietas.dietasLanche}</TableCell>
                        <TableCell className="text-center bg-orange-100 text-orange-800">{totaisDietas.dietasJantar}</TableCell>
                        <TableCell className="text-center border-r bg-orange-500 text-white">
                          {totaisDietas.totalDietas}
                        </TableCell>
                        <TableCell className="text-center bg-purple-100 text-purple-800">{totaisExtra.extraCafe}</TableCell>
                        <TableCell className="text-center bg-purple-100 text-purple-800">{totaisExtra.extraAlmoco}</TableCell>
                        <TableCell className="text-center bg-purple-100 text-purple-800">{totaisExtra.extraLanche}</TableCell>
                        <TableCell className="text-center bg-purple-100 text-purple-800">{totaisExtra.extraJantar}</TableCell>
                        <TableCell className="text-center border-r bg-purple-500 text-white">
                          {totaisExtra.totalExtra}
                        </TableCell>
                        <TableCell className="text-center bg-emerald-600 text-white">
                          {totaisGeraisCombinados.totalGeral}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
