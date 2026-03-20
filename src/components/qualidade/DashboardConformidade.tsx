import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCcw, Download } from "lucide-react";
import { format } from "date-fns";

/**
 * Dashboard de Conformidade e Qualidade - LIMPO E ELEGANTE
 * Estrutura pronta para receber seus gráficos personalizados
 * 
 * Visão: Manter o design elegante do Modo TV com seus indicadores próprios
 */
export const DashboardConformidade = () => {
  const [activeTab, setActiveTab] = useState("visao_geral");

  return (
    <div className="w-full h-full space-y-6 p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            Dashboard de Qualidade
          </h1>
          <p className="text-slate-400 mt-1">Indicadores de conformidade e qualidade hospitalar</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* ========== ABAS ========== */}
      <div className="flex gap-2 border-b border-slate-700">
        {[
          { id: "visao_geral", label: "📊 Visão Geral" },
          { id: "operacional", label: "⚙️ Operacional" },
          { id: "qualidade", label: "✓ Qualidade" },
          { id: "financeiro", label: "💰 Financeiro" },
          { id: "rh", label: "👥 RH" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium transition-all ${
              activeTab === tab.id
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== CONTEÚDO POR ABA ========== */}
      <div className="min-h-[600px]">
        {/* Visão Geral */}
        {activeTab === "visao_geral" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* PLACEHOLDER PARA SEUS 4 GRÁFICOS/CARDS PRINCIPAIS */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Placeholder 1</CardTitle>
                </CardHeader>
                <CardContent className="h-32 flex items-center justify-center text-slate-500">
                  Seu gráfico aqui
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Placeholder 2</CardTitle>
                </CardHeader>
                <CardContent className="h-32 flex items-center justify-center text-slate-500">
                  Seu gráfico aqui
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Placeholder 3</CardTitle>
                </CardHeader>
                <CardContent className="h-32 flex items-center justify-center text-slate-500">
                  Seu gráfico aqui
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Placeholder 4</CardTitle>
                </CardHeader>
                <CardContent className="h-32 flex items-center justify-center text-slate-500">
                  Seu gráfico aqui
                </CardContent>
              </Card>
            </div>

            {/* Gráficos em tamanho maior */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-slate-800/50 border-slate-700 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-slate-300">Gráfico Grande - Seu Conteúdo Aqui</CardTitle>
                </CardHeader>
                <CardContent className="h-80 flex items-center justify-center text-slate-500">
                  Espaço para gráfico em tamanho maior
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Operacional */}
        {activeTab === "operacional" && (
          <div className="space-y-4 text-slate-400 text-center py-12">
            <p>Aba Operacional - Seus gráficos aqui</p>
          </div>
        )}

        {/* Qualidade */}
        {activeTab === "qualidade" && (
          <div className="space-y-4 text-slate-400 text-center py-12">
            <p>Aba Qualidade - Seus gráficos aqui</p>
          </div>
        )}

        {/* Financeiro */}
        {activeTab === "financeiro" && (
          <div className="space-y-4 text-slate-400 text-center py-12">
            <p>Aba Financeiro - Seus gráficos aqui</p>
          </div>
        )}

        {/* RH */}
        {activeTab === "rh" && (
          <div className="space-y-4 text-slate-400 text-center py-12">
            <p>Aba RH - Seus gráficos aqui</p>
          </div>
        )}
      </div>

      {/* ========== FOOTER INFO ========== */}
      <Card className="bg-slate-800/50 border-slate-700 mt-6">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-300 text-sm font-medium">Última atualização: {format(new Date(), "HH:mm - dd/MM/yyyy")}</p>
              <p className="text-slate-500 text-xs mt-1">Dados sincronizados em tempo real com o sistema</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
