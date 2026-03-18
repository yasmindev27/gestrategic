import { useState } from "react";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  TrendingUp,
  RefreshCcw,
  Award,
  ClipboardCheck,
  FileText,
  Download,
  Target,
  Activity,
} from "lucide-react";
import { useConformidadeIndicadores, IndicadorONA, IndicadoresPorModulo } from "@/hooks/useConformidadeIndicadores";
import { LoadingState } from "@/components/ui/loading-state";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const statusConfig = {
  conforme: { label: "Conforme", color: "bg-green-500", icon: CheckCircle2 },
  alerta: { label: "Alerta", color: "bg-yellow-500", icon: AlertTriangle },
  nao_conforme: { label: "Não Conforme", color: "bg-red-500", icon: XCircle },
};

const ScoreGauge = ({ score, label, color }: { score: number; label: string; color: string }) => {
  const getScoreColor = (s: number) => {
    if (s >= 85) return "text-green-600";
    if (s >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            className="text-muted stroke-current"
            strokeWidth="10"
            fill="transparent"
            r="40"
            cx="50"
            cy="50"
          />
          <circle
            className={`${getScoreColor(score)} stroke-current`}
            strokeWidth="10"
            strokeLinecap="round"
            fill="transparent"
            r="40"
            cx="50"
            cy="50"
            strokeDasharray={`${score * 2.51} 251`}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
};

const IndicadorCard = ({ indicador }: { indicador: IndicadorONA }) => {
  const config = statusConfig[indicador.status];
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{indicador.nome}</CardTitle>
          <Badge className={`${config.color} text-white`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{indicador.valor_atual.toFixed(1)}{indicador.unidade}</span>
            <span className="text-sm text-muted-foreground">Meta: {indicador.meta}{indicador.unidade}</span>
          </div>
          <Progress 
            value={indicador.meta !== 0 ? Math.min((indicador.valor_atual / indicador.meta) * 100, 100) : (indicador.valor_atual === 0 ? 100 : 0)} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">{indicador.descricao}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const ModuloSection = ({ moduloData }: { moduloData: IndicadoresPorModulo }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{moduloData.modulo}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Score:</span>
          <Badge variant={moduloData.score_geral >= 80 ? "default" : moduloData.score_geral >= 60 ? "secondary" : "destructive"}>
            {moduloData.score_geral}%
          </Badge>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {moduloData.indicadores.map((indicador) => (
          <IndicadorCard key={indicador.id} indicador={indicador} />
        ))}
      </div>
    </div>
  );
};

export const DashboardConformidade = () => {
  const { isLoading, conformidadeGeral, indicadoresPorModulo, recarregar } = useConformidadeIndicadores();
  const [activeTab, setActiveTab] = useState("visao_geral");

  const exportToExcel = () => {
    const data = indicadoresPorModulo.flatMap(modulo => 
      modulo.indicadores.map(ind => ({
        "Módulo": modulo.modulo,
        "Indicador": ind.nome,
        "Valor Atual": `${ind.valor_atual.toFixed(1)}${ind.unidade}`,
        "Meta": `${ind.meta}${ind.unidade}`,
        "Status": statusConfig[ind.status].label,
        "Descrição": ind.descricao,
      }))
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Indicadores");
    XLSX.writeFile(wb, `conformidade-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Relatório de Conformidade ONA/ISO 9001/Qmentum');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Score ONA: ${conformidadeGeral.ona_score}% | ISO 9001: ${conformidadeGeral.iso_score}% | Qmentum: ${conformidadeGeral.qmentum_score}%`, 14, 32);

    const tableData = indicadoresPorModulo.flatMap(modulo => 
      modulo.indicadores.map(ind => [
        modulo.modulo.substring(0, 25),
        ind.nome.substring(0, 30),
        `${ind.valor_atual.toFixed(1)}${ind.unidade}`,
        `${ind.meta}${ind.unidade}`,
        statusConfig[ind.status].label,
      ])
    );

    autoTable(doc, {
      startY: 38,
      head: [["Módulo", "Indicador", "Valor", "Meta", "Status"]],
      body: tableData,
      styles: { fontSize: 7 },
      margin: { bottom: 28 },
    });
    savePdfWithFooter(doc, 'Relatório de Conformidade ONA/ISO 9001/Qmentum', `conformidade-${format(new Date(), "yyyy-MM-dd")}`, logoImg);
  };

  if (isLoading) {
    return <LoadingState message="Carregando indicadores de conformidade..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Dashboard de Conformidade - ONA Nível 1
          </h2>
          <p className="text-muted-foreground">
            Indicadores de acreditação ONA Nível 1, ISO 9001 e Qmentum
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary text-primary font-semibold px-3 py-1">
            ONA N1
          </Badge>
          <Button variant="outline" size="sm" onClick={recarregar}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <ExportDropdown onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              ONA
            </CardTitle>
            <CardDescription>Segurança do Paciente</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreGauge score={conformidadeGeral.ona_score} label="Score ONA" color="blue" />
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              ISO 9001
            </CardTitle>
            <CardDescription>Gestão da Qualidade</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreGauge score={conformidadeGeral.iso_score} label="Score ISO" color="green" />
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-600" />
              Qmentum
            </CardTitle>
            <CardDescription>Acreditação Internacional</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreGauge score={conformidadeGeral.qmentum_score} label="Score Qmentum" color="purple" />
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Resumo
            </CardTitle>
            <CardDescription>Status dos Indicadores</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Conformes</span>
                </div>
                <span className="font-bold">{conformidadeGeral.conformes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Alertas</span>
                </div>
                <span className="font-bold">{conformidadeGeral.alertas}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">Não Conformes</span>
                </div>
                <span className="font-bold">{conformidadeGeral.nao_conformes}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold">{conformidadeGeral.total_indicadores}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visao_geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="seguranca_paciente">Segurança do Paciente</TabsTrigger>
          <TabsTrigger value="gestao_qualidade">Gestão da Qualidade</TabsTrigger>
          <TabsTrigger value="infraestrutura">Infraestrutura</TabsTrigger>
          <TabsTrigger value="rh">RH / Segurança Trabalho</TabsTrigger>
        </TabsList>

        <TabsContent value="visao_geral" className="space-y-6 mt-4">
          {indicadoresPorModulo.map((modulo) => (
            <ModuloSection key={modulo.modulo} moduloData={modulo} />
          ))}
        </TabsContent>

        <TabsContent value="seguranca_paciente" className="mt-4">
          {indicadoresPorModulo.filter(m => m.modulo.includes("ONA")).map((modulo) => (
            <ModuloSection key={modulo.modulo} moduloData={modulo} />
          ))}
        </TabsContent>

        <TabsContent value="gestao_qualidade" className="mt-4">
          {indicadoresPorModulo.filter(m => m.modulo.includes("ISO")).map((modulo) => (
            <ModuloSection key={modulo.modulo} moduloData={modulo} />
          ))}
        </TabsContent>

        <TabsContent value="infraestrutura" className="mt-4">
          {indicadoresPorModulo.filter(m => m.modulo.includes("Infraestrutura")).map((modulo) => (
            <ModuloSection key={modulo.modulo} moduloData={modulo} />
          ))}
        </TabsContent>

        <TabsContent value="rh" className="mt-4">
          {indicadoresPorModulo.filter(m => m.modulo.includes("RH")).map((modulo) => (
            <ModuloSection key={modulo.modulo} moduloData={modulo} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Conformidade com Padrões de Acreditação</p>
              <p className="text-xs text-muted-foreground">
                Este dashboard consolida indicadores alinhados aos requisitos da ONA (Organização Nacional de Acreditação), 
                ISO 9001 (Sistema de Gestão da Qualidade) e Qmentum (Accreditation Canada). 
                Os dados são calculados em tempo real a partir dos registros do sistema.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
