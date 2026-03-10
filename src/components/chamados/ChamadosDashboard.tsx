import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { useToast } from "@/hooks/use-toast";
import { subDays, differenceInMinutes, parseISO, format } from "date-fns";

import { DashboardFiltersComponent } from "./DashboardFilters";
import { KPICards } from "./KPICards";
import { CategoriaCharts } from "./CategoriaCharts";
import { EvolucaoChart } from "./EvolucaoChart";
import { TempoAtendimentoCards } from "./TempoAtendimentoCards";
import { ProdutividadeEquipe } from "./ProdutividadeEquipe";
import { RelatorioIADialog } from "./RelatorioIADialog";
import { 
  Chamado, 
  DashboardFilters, 
  KPIMetrics, 
  AtendenteProdutividade,
  SLA_HORAS,
} from "./types";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

export const ChamadosDashboard = () => {
  const { role } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();

  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [relatorioIA, setRelatorioIA] = useState("");
  const [showRelatorioDialog, setShowRelatorioDialog] = useState(false);

  const today = new Date();
  const [filters, setFilters] = useState<DashboardFilters>({
    periodo: "30dias",
    dataInicio: subDays(today, 30),
    dataFim: today,
    atendente: "todos",
    categoria: "todos",
    status: "todos",
  });

  // Fetch chamados
  useEffect(() => {
    const fetchChamados = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("chamados")
          .select("*")
          .order("created_at", { ascending: false });

        if (filters.dataInicio) {
          query = query.gte("data_abertura", filters.dataInicio.toISOString());
        }
        if (filters.dataFim) {
          query = query.lte("data_abertura", filters.dataFim.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        
        setChamados((data || []) as Chamado[]);
      } catch (error) {
        console.error("Error fetching chamados:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar chamados.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChamados();
    logAction("acesso", "dashboard_chamados");
  }, [filters.dataInicio, filters.dataFim]);

  // Filter chamados based on filters
  const filteredChamados = useMemo(() => {
    return chamados.filter((c) => {
      if (filters.atendente !== "todos" && c.atribuido_para !== filters.atendente) {
        return false;
      }
      if (filters.categoria !== "todos" && c.categoria !== filters.categoria) {
        return false;
      }
      if (filters.status !== "todos" && c.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [chamados, filters]);

  // Calculate KPIs
  const metrics: KPIMetrics = useMemo(() => {
    const resolvidos = filteredChamados.filter(
      (c) => c.status === "resolvido" && c.data_resolucao
    );

    // Tempo médio de resolução
    let tempoMedioResolucao = 0;
    let maiorTempoResolucao = 0;
    if (resolvidos.length > 0) {
      const tempos = resolvidos.map((c) =>
        differenceInMinutes(parseISO(c.data_resolucao!), parseISO(c.data_abertura)) / 60
      );
      tempoMedioResolucao = tempos.reduce((a, b) => a + b, 0) / tempos.length;
      maiorTempoResolucao = Math.max(...tempos, 0);
    }

    // Percentual SLA
    let dentroDeSLA = 0;
    resolvidos.forEach((c) => {
      const horasResolucao = differenceInMinutes(
        parseISO(c.data_resolucao!),
        parseISO(c.data_abertura)
      ) / 60;
      const slaHoras = SLA_HORAS[c.prioridade] || 24;
      if (horasResolucao <= slaHoras) {
        dentroDeSLA++;
      }
    });
    const percentualSLA = resolvidos.length > 0 
      ? (dentroDeSLA / resolvidos.length) * 100 
      : 0;

    // Taxa de reabertura: chamados abertos que já tiveram uma resolução anterior
    const reabertos = filteredChamados.filter(
      (c) => c.status === "aberto" && c.data_resolucao !== null
    ).length;
    const taxaReabertura = filteredChamados.length > 0
      ? (reabertos / filteredChamados.length) * 100
      : 0;

    // Média por atendente
    const atendentes = new Set(filteredChamados.map((c) => c.atribuido_para).filter(Boolean));
    const mediaChamadosPorAtendente = atendentes.size > 0 
      ? filteredChamados.length / atendentes.size 
      : 0;

    // Tempo médio de primeiro atendimento
    const emAndamentoOuResolvidos = filteredChamados.filter(
      (c) => c.status !== "aberto" && c.status !== "cancelado"
    );
    let tempoMedioPrimeiroAtendimento = 0;
    if (emAndamentoOuResolvidos.length > 0) {
      const tempos = emAndamentoOuResolvidos.map((c) =>
        Math.max(0, differenceInMinutes(parseISO(c.updated_at), parseISO(c.data_abertura)) / 60)
      );
      tempoMedioPrimeiroAtendimento = tempos.reduce((a, b) => a + b, 0) / tempos.length;
    }

    return {
      totalChamados: filteredChamados.length,
      tempoMedioAtendimento: tempoMedioPrimeiroAtendimento,
      tempoMedioResolucao,
      percentualSLA,
      taxaReabertura,
      mediaChamadosPorAtendente,
      maiorTempoResolucao,
      tempoMedioPrimeiroAtendimento,
    };
  }, [filteredChamados]);

  // Calculate team productivity
  const produtividade: AtendenteProdutividade[] = useMemo(() => {
    const atendenteMap = new Map<string, {
      id: string;
      nome: string;
      chamados: Chamado[];
    }>();

    filteredChamados.forEach((c) => {
      const id = c.atribuido_para || c.solicitante_id;
      const nome = c.atribuido_para ? "Atendente" : c.solicitante_nome;
      
      if (!atendenteMap.has(id)) {
        atendenteMap.set(id, { id, nome, chamados: [] });
      }
      atendenteMap.get(id)!.chamados.push(c);
    });

    // Também buscar nomes dos atendentes únicos
    const result: AtendenteProdutividade[] = [];
    atendenteMap.forEach((data) => {
      const resolvidos = data.chamados.filter(
        (c) => c.status === "resolvido" && c.data_resolucao
      );
      
      let tempoMedio = 0;
      let slaCumprido = 0;
      
      if (resolvidos.length > 0) {
        const tempos = resolvidos.map((c) =>
          differenceInMinutes(parseISO(c.data_resolucao!), parseISO(c.data_abertura)) / 60
        );
        tempoMedio = tempos.reduce((a, b) => a + b, 0) / tempos.length;
        
        resolvidos.forEach((c) => {
          const horas = differenceInMinutes(
            parseISO(c.data_resolucao!),
            parseISO(c.data_abertura)
          ) / 60;
          if (horas <= (SLA_HORAS[c.prioridade] || 24)) {
            slaCumprido++;
          }
        });
      }

      result.push({
        id: data.id,
        nome: data.nome,
        chamadosAtendidos: data.chamados.length,
        tempoMedioAtendimento: tempoMedio,
        percentualSLA: resolvidos.length > 0 ? (slaCumprido / resolvidos.length) * 100 : 0,
        chamadosReabertos: 0,
      });
    });

    return result.sort((a, b) => b.chamadosAtendidos - a.chamadosAtendidos);
  }, [filteredChamados]);

  // Get unique categories and attendants
  const categorias = useMemo(() => {
    return [...new Set(chamados.map((c) => c.categoria))];
  }, [chamados]);

  const atendentes = useMemo(() => {
    const uniqueAtendentes = new Map<string, string>();
    chamados.forEach((c) => {
      if (c.atribuido_para) {
        uniqueAtendentes.set(c.atribuido_para, c.solicitante_nome);
      }
    });
    return Array.from(uniqueAtendentes.entries()).map(([id, nome]) => ({ id, nome }));
  }, [chamados]);

  // Export data preparation
  const getExportData = useCallback(() => {
    const headers = [
      "Número",
      "Título",
      "Categoria",
      "Prioridade",
      "Status",
      "Solicitante",
      "Setor",
      "Data Abertura",
      "Data Resolução",
    ];
    
    const rows = filteredChamados.map((c) => [
      c.numero_chamado,
      c.titulo,
      c.categoria,
      c.prioridade,
      c.status,
      c.solicitante_nome,
      c.solicitante_setor || "",
      format(parseISO(c.data_abertura), "dd/MM/yyyy HH:mm"),
      c.data_resolucao ? format(parseISO(c.data_resolucao), "dd/MM/yyyy HH:mm") : "",
    ]);
    
    return { headers, rows };
  }, [filteredChamados]);

  // Export PDF
  const handleExportPDF = useCallback(() => {
    const { headers, rows } = getExportData();
    exportToPDF({
      title: 'Relatório de Chamados',
      headers,
      rows,
      fileName: 'chamados',
      orientation: 'landscape',
    });
    
    toast({
      title: "Exportado!",
      description: "Arquivo PDF gerado com sucesso.",
    });
  }, [getExportData, toast]);

  // Export CSV/Excel
  const handleExportExcel = useCallback(() => {
    setIsExporting(true);
    
    try {
      const { headers, rows } = getExportData();
      exportToCSV({
        title: 'Relatório de Chamados',
        headers,
        rows,
        fileName: 'chamados',
      });

      toast({
        title: "Exportado!",
        description: "Arquivo CSV gerado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao exportar dados.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [getExportData, toast]);

  // Generate AI Report
  const handleGerarRelatorioIA = useCallback(async () => {
    setIsGeneratingReport(true);
    setShowRelatorioDialog(true);
    setRelatorioIA("");

    try {
      // Preparar dados para a IA
      const porCategoria: Record<string, number> = {};
      const porPrioridade: Record<string, number> = {};
      
      filteredChamados.forEach((c) => {
        porCategoria[c.categoria] = (porCategoria[c.categoria] || 0) + 1;
        porPrioridade[c.prioridade] = (porPrioridade[c.prioridade] || 0) + 1;
      });

      const dados = {
        total: filteredChamados.length,
        abertos: filteredChamados.filter((c) => c.status === "aberto").length,
        emAndamento: filteredChamados.filter((c) => c.status === "em_andamento").length,
        resolvidos: filteredChamados.filter((c) => c.status === "resolvido").length,
        cancelados: filteredChamados.filter((c) => c.status === "cancelado").length,
        porCategoria,
        porPrioridade,
        tempoMedioResolucao: metrics.tempoMedioResolucao,
        percentualSLA: metrics.percentualSLA,
        taxaReabertura: metrics.taxaReabertura,
        produtividadeEquipe: produtividade.slice(0, 10).map((p) => ({
          nome: p.nome,
          chamadosAtendidos: p.chamadosAtendidos,
          percentualSLA: p.percentualSLA,
        })),
        periodo: {
          inicio: filters.dataInicio ? format(filters.dataInicio, "dd/MM/yyyy") : "N/A",
          fim: filters.dataFim ? format(filters.dataFim, "dd/MM/yyyy") : "N/A",
        } as { inicio: string; fim: string },
      };
      const response = await supabase.functions.invoke("gerar-relatorio-chamados", {
        body: { dados },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setRelatorioIA(response.data.relatorio);
      
      await logAction("gerar_relatorio_ia", "dashboard_chamados", {
        periodo: dados.periodo,
        totalChamados: dados.total,
      });

    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório com IA. Tente novamente.",
        variant: "destructive",
      });
      setShowRelatorioDialog(false);
    } finally {
      setIsGeneratingReport(false);
    }
  }, [filteredChamados, metrics, produtividade, filters, logAction, toast]);

  const handleExportRelatorioPDF = useCallback(() => {
    toast({
      title: "Exportando Relatório",
      description: "O download do PDF será iniciado...",
    });
    window.print();
  }, [toast]);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Filters */}
      <DashboardFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        atendentes={atendentes}
        categorias={categorias}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onGerarRelatorioIA={handleGerarRelatorioIA}
        isExporting={isExporting}
        isGeneratingReport={isGeneratingReport}
      />

      {/* KPIs */}
      <KPICards metrics={metrics} isLoading={isLoading} />

      {/* Categoria Charts */}
      <CategoriaCharts chamados={filteredChamados} />

      {/* Evolução no Tempo */}
      <EvolucaoChart
        chamados={filteredChamados}
        dataInicio={filters.dataInicio}
        dataFim={filters.dataFim}
      />

      {/* Tempo de Atendimento */}
      <TempoAtendimentoCards chamados={filteredChamados} />

      {/* Produtividade da Equipe */}
      <ProdutividadeEquipe produtividade={produtividade} isLoading={isLoading} />

      {/* Relatório IA Dialog */}
      <RelatorioIADialog
        open={showRelatorioDialog}
        onOpenChange={setShowRelatorioDialog}
        relatorio={relatorioIA}
        isLoading={isGeneratingReport}
        onExportPDF={handleExportRelatorioPDF}
      />
    </div>
  );
};
