import { useState, useCallback, useMemo, useEffect } from "react";
import { getRegistrosDB, getColaboradoresDB, getCurrentUserInfo } from "./storage";
import { RegistroProducao, Colaborador } from "./types";
import { StatCard } from "./StatCard";
import { useAltasInternacoesNIR } from "@/hooks/useAltasInternacoesNIR";
import { ArrowDown, ArrowUp } from "lucide-react";
import { RegistroForm } from "./RegistroForm";
import { RegistrosTable } from "./RegistrosTable";
import { ProducaoChart } from "./ProducaoChart";
import { AtividadeChart } from "./AtividadeChart";
import { Filtros } from "./Filtros";
import { Relatorios } from "./Relatorios";
import { PassagemPlantaoReport } from "./PassagemPlantaoReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileCheck,
  UserPlus,
  ArrowRightLeft,
  Phone,
  Activity,
  LayoutDashboard,
  FileText,
  ClipboardList,
} from "lucide-react";

export function NucleoTrackerModule() {
  const [registros, setRegistros] = useState<RegistroProducao[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [filtroColab, setFiltroColab] = useState("todos");
  const [filtroAtiv, setFiltroAtiv] = useState("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [isPrivileged, setIsPrivileged] = useState(false);

  const refresh = useCallback(async () => {
    const userInfo = await getCurrentUserInfo();
    setIsPrivileged(userInfo.isPrivileged);

    // Privileged users see all records; regular users see only their own
    const regs = await getRegistrosDB(!userInfo.isPrivileged);
    const colabs = await getColaboradoresDB();
    setRegistros(regs);
    setColaboradores(colabs);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
// KPIs Clínicos NIR: Internações e Altas
function KPIsClinicosNIR() {
  const { data, isLoading, isError } = useAltasInternacoesNIR();
  if (isLoading) return <div>Carregando KPIs clínicos...</div>;
  if (isError || !data) return <div>Erro ao carregar KPIs clínicos</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 my-4">
      <StatCard
        title="Internações Clínicas"
        value={data.totalInternacoes}
        icon={ArrowDown}
        variant="info"
      />
      <StatCard
        title="Altas Clínicas"
        value={data.totalAltas}
        icon={ArrowUp}
        color="secondary"
      />
    </div>
  );
}

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
              Relatório — NIR
            </h2>
            <p className="text-muted-foreground text-sm">
              Registro de tarefas diárias
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="painel" className="w-full">

        <TabsList className={`grid w-full max-w-lg ${isPrivileged ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <TabsTrigger value="painel" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Painel
          </TabsTrigger>
          {isPrivileged && (
            <TabsTrigger value="relatorios" className="gap-2">
              <FileText className="h-4 w-4" />
              Relatório Produtividade
            </TabsTrigger>
          )}
          {isPrivileged && (
            <TabsTrigger value="passagem" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Passagem de Plantão
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="painel" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Conferência de Documentos" value={countByAtividade("Conferência")} icon={FileCheck} color="primary" />
            <StatCard title="Cadastro SUSFácil" value={countByAtividade("SUSFácil")} icon={UserPlus} color="secondary" />
            <StatCard title="Gestão de Vagas" value={countByAtividade("Gestão")} icon={ArrowRightLeft} color="warning" />
            <StatCard title="Solicitação de Transferência" value={countByAtividade("Solicitação")} icon={ArrowRightLeft} color="info" />
            <StatCard title="Contato c/ Estabelecimentos" value={countByAtividade("Contato")} icon={Phone} color="primary" />
          </div>

          {/* KPIs Clínicos NIR */}
          <KPIsClinicosNIR />

          <RegistroForm onRegistroAdded={refresh} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProducaoChart registros={filtered} />
            <AtividadeChart registros={filtered} />
          </div>

          {isPrivileged && (
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
          )}

          <RegistrosTable registros={filtered} onUpdate={refresh} />
        </TabsContent>


        {isPrivileged && (
          <TabsContent value="relatorios" className="mt-6">
            <Relatorios registros={registros} colaboradores={colaboradores} />
          </TabsContent>
        )}

        {isPrivileged && (
          <TabsContent value="passagem" className="mt-6">
            <PassagemPlantaoReport />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
