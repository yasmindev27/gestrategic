import { useState, useCallback, useMemo } from "react";
import { getRegistros, getColaboradores } from "./storage";
import { RegistroProducao, Colaborador } from "./types";
import { StatCard } from "./StatCard";
import { RegistroForm } from "./RegistroForm";
import { RegistrosTable } from "./RegistrosTable";
import { ProducaoChart } from "./ProducaoChart";
import { AtividadeChart } from "./AtividadeChart";
import { Filtros } from "./Filtros";
import { ColaboradorManager } from "./ColaboradorManager";
import { Relatorios } from "./Relatorios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileCheck,
  UserPlus,
  ArrowRightLeft,
  Phone,
  Activity,
  LayoutDashboard,
  FileText,
} from "lucide-react";

export function NucleoTrackerModule() {
  const [registros, setRegistros] = useState<RegistroProducao[]>(getRegistros);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(getColaboradores);
  const [filtroColab, setFiltroColab] = useState("todos");
  const [filtroAtiv, setFiltroAtiv] = useState("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const refresh = useCallback(() => {
    setRegistros(getRegistros());
    setColaboradores(getColaboradores());
  }, []);

  const filtered = useMemo(() => {
    return registros.filter((r) => {
      if (filtroColab !== "todos" && r.colaborador !== filtroColab) return false;
      if (filtroAtiv !== "todas" && r.atividade !== filtroAtiv) return false;
      if (dataInicio && r.data < dataInicio) return false;
      if (dataFim && r.data > dataFim) return false;
      return true;
    });
  }, [registros, filtroColab, filtroAtiv, dataInicio, dataFim]);

  const countByAtividade = (keyword: string) =>
    filtered.filter((r) => r.atividade.includes(keyword)).reduce((s, r) => s + r.quantidade, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Relatório de Produtividade — NIR
            </h2>
            <p className="text-muted-foreground text-sm">
              Sistema de Acompanhamento de Produtividade
            </p>
          </div>
        </div>
        <ColaboradorManager onUpdate={refresh} />
      </div>

      <Tabs defaultValue="painel" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="painel" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Painel
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2">
            <FileText className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Conferência de Documentos" value={countByAtividade("Conferência")} icon={FileCheck} color="primary" />
            <StatCard title="Cadastro SUSFácil" value={countByAtividade("SUSFácil")} icon={UserPlus} color="secondary" />
            <StatCard title="Gestão de Vagas / Transferências" value={countByAtividade("Gestão") + countByAtividade("Transferência")} icon={ArrowRightLeft} color="warning" />
            <StatCard title="Contato c/ Estabelecimentos" value={countByAtividade("Contato")} icon={Phone} color="info" />
          </div>

          <RegistroForm colaboradores={colaboradores} onRegistroAdded={refresh} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProducaoChart registros={filtered} />
            <AtividadeChart registros={filtered} />
          </div>

          <Filtros
            colaboradores={colaboradores}
            colaborador={filtroColab}
            atividade={filtroAtiv}
            dataInicio={dataInicio}
            dataFim={dataFim}
            onColaboradorChange={setFiltroColab}
            onAtividadeChange={setFiltroAtiv}
            onDataInicioChange={setDataInicio}
            onDataFimChange={setDataFim}
          />

          <RegistrosTable registros={filtered} onUpdate={refresh} />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-6">
          <Relatorios registros={registros} colaboradores={colaboradores} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
