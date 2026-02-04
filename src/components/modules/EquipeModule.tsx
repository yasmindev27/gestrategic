import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Plus, Upload, Calendar, Clock, MapPin, 
  ChevronLeft, ChevronRight, Stethoscope, Syringe,
  Filter, UserCheck, Building2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays, subDays, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatCard } from "@/components/ui/stat-card";
import ImportEquipeDialog from "./equipe/ImportEquipeDialog";
import AdicionarEscalaDialog from "./equipe/AdicionarEscalaDialog";

interface EscalaUnificada {
  id: string;
  tipo_profissional: "medico" | "enfermagem";
  nome: string;
  registro_profissional: string | null;
  especialidade: string | null;
  data_plantao: string;
  hora_inicio: string;
  hora_fim: string;
  setor: string;
  tipo_plantao: string;
  status: string;
  observacoes: string | null;
}

const setoresUPA = [
  "Todos",
  "Emergência",
  "Sala Vermelha",
  "Sala Amarela",
  "Sala Verde",
  "Observação Adulto",
  "Observação Pediátrica",
  "Pediatria",
  "Ortopedia",
  "UTI",
];

const EquipeModule = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterSetor, setFilterSetor] = useState("Todos");
  const [activeTab, setActiveTab] = useState("todos");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importType, setImportType] = useState<"colaboradores" | "escala">("colaboradores");
  const [addEscalaDialogOpen, setAddEscalaDialogOpen] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Query escalas de médicos
  const { data: escalasMedicos, isLoading: loadingMedicos } = useQuery({
    queryKey: ["escalas_medicos_equipe", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalas_medicos")
        .select(`
          id,
          data_plantao,
          hora_inicio,
          hora_fim,
          setor,
          tipo_plantao,
          status,
          observacoes,
          profissionais_saude:profissional_id (
            nome, registro_profissional, especialidade
          )
        `)
        .eq("data_plantao", dateStr)
        .eq("status", "confirmado");

      if (error) throw error;

      return (data || []).map((e: any) => ({
        id: e.id,
        tipo_profissional: "medico" as const,
        nome: e.profissionais_saude?.nome || "Médico",
        registro_profissional: e.profissionais_saude?.registro_profissional,
        especialidade: e.profissionais_saude?.especialidade,
        data_plantao: e.data_plantao,
        hora_inicio: e.hora_inicio,
        hora_fim: e.hora_fim,
        setor: e.setor,
        tipo_plantao: e.tipo_plantao,
        status: e.status,
        observacoes: e.observacoes,
      }));
    },
  });

  // Query escalas de enfermagem
  const { data: escalasEnfermagem, isLoading: loadingEnfermagem } = useQuery({
    queryKey: ["escalas_enfermagem_equipe", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enfermagem_escalas")
        .select(`
          id,
          data_plantao,
          hora_inicio,
          hora_fim,
          setor,
          tipo_plantao,
          status,
          observacoes,
          profissional_nome,
          profissionais_saude:profissional_saude_id (
            nome, registro_profissional, especialidade
          )
        `)
        .eq("data_plantao", dateStr)
        .eq("status", "confirmado");

      if (error) throw error;

      return (data || []).map((e: any) => ({
        id: e.id,
        tipo_profissional: "enfermagem" as const,
        nome: e.profissionais_saude?.nome || e.profissional_nome || "Enfermeiro(a)",
        registro_profissional: e.profissionais_saude?.registro_profissional,
        especialidade: e.profissionais_saude?.especialidade,
        data_plantao: e.data_plantao,
        hora_inicio: e.hora_inicio,
        hora_fim: e.hora_fim,
        setor: e.setor,
        tipo_plantao: e.tipo_plantao,
        status: e.status,
        observacoes: e.observacoes,
      }));
    },
  });

  const isLoading = loadingMedicos || loadingEnfermagem;

  // Combinar e filtrar escalas
  const escalasUnificadas = [...(escalasMedicos || []), ...(escalasEnfermagem || [])];

  const escalasFiltradas = escalasUnificadas.filter((e) => {
    const matchSetor = filterSetor === "Todos" || e.setor === filterSetor;
    const matchTab = 
      activeTab === "todos" || 
      (activeTab === "medicos" && e.tipo_profissional === "medico") ||
      (activeTab === "enfermagem" && e.tipo_profissional === "enfermagem");
    return matchSetor && matchTab;
  }).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  // Checar se está de plantão agora
  const isOnShiftNow = (escala: EscalaUnificada) => {
    if (!isToday(parseISO(escala.data_plantao))) return false;
    const now = format(new Date(), "HH:mm");
    return now >= escala.hora_inicio && now <= escala.hora_fim;
  };

  // Stats
  const stats = {
    totalMedicos: escalasMedicos?.length || 0,
    totalEnfermagem: escalasEnfermagem?.length || 0,
    dePlantaoMedicos: escalasMedicos?.filter((e) => isOnShiftNow(e)).length || 0,
    dePlantaoEnfermagem: escalasEnfermagem?.filter((e) => isOnShiftNow(e)).length || 0,
  };

  const handleImport = (type: "colaboradores" | "escala") => {
    setImportType(type);
    setImportDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Equipe de Plantão</h2>
            <p className="text-sm text-muted-foreground">
              Visão unificada de médicos e enfermagem
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleImport("colaboradores")}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Colaboradores
          </Button>
          <Button variant="outline" onClick={() => handleImport("escala")}>
            <Calendar className="h-4 w-4 mr-2" />
            Importar Escala
          </Button>
          <Button onClick={() => setAddEscalaDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar à Escala
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Médicos Escalados"
          value={stats.totalMedicos}
          icon={Stethoscope}
          variant="info"
        />
        <StatCard
          title="Médicos de Plantão"
          value={stats.dePlantaoMedicos}
          icon={Stethoscope}
          variant="primary"
          description="Agora"
        />
        <StatCard
          title="Enfermagem Escalada"
          value={stats.totalEnfermagem}
          icon={Syringe}
          variant="success"
        />
        <StatCard
          title="Enfermagem de Plantão"
          value={stats.dePlantaoEnfermagem}
          icon={Syringe}
          variant="primary"
          description="Agora"
        />
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              {isToday(selectedDate) && (
                <Badge variant="default" className="mt-1">Hoje</Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="todos" className="gap-2">
              <Users className="h-4 w-4" />
              Equipe Completa
            </TabsTrigger>
            <TabsTrigger value="medicos" className="gap-2">
              <Stethoscope className="h-4 w-4" />
              Médicos
            </TabsTrigger>
            <TabsTrigger value="enfermagem" className="gap-2">
              <Syringe className="h-4 w-4" />
              Enfermagem
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterSetor} onValueChange={setFilterSetor}>
            <SelectTrigger className="w-[180px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por setor" />
            </SelectTrigger>
            <SelectContent>
              {setoresUPA.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Escalas List */}
      <div className="grid gap-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : escalasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Nenhum profissional escalado para este dia
                {filterSetor !== "Todos" && ` no setor ${filterSetor}`}
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setAddEscalaDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar à Escala
              </Button>
            </CardContent>
          </Card>
        ) : (
          escalasFiltradas.map((escala) => {
            const onShift = isOnShiftNow(escala);
            const isMedico = escala.tipo_profissional === "medico";
            const Icon = isMedico ? Stethoscope : Syringe;
            const typeColor = isMedico ? "text-blue-600" : "text-green-600";
            const typeBgColor = isMedico ? "bg-blue-100 dark:bg-blue-900/30" : "bg-green-100 dark:bg-green-900/30";

            return (
              <Card 
                key={`${escala.tipo_profissional}-${escala.id}`}
                className={onShift ? "border-primary shadow-md ring-2 ring-primary/20" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${onShift ? "bg-primary text-primary-foreground" : typeBgColor}`}>
                        <Icon className={`h-5 w-5 ${onShift ? "" : typeColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{escala.nome}</h3>
                          <Badge variant="outline" className={typeColor}>
                            {isMedico ? "Médico" : "Enfermagem"}
                          </Badge>
                          {onShift && (
                            <Badge className="bg-primary">
                              <UserCheck className="h-3 w-3 mr-1" />
                              De Plantão
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                          {escala.registro_profissional && (
                            <span>{escala.registro_profissional}</span>
                          )}
                          {escala.especialidade && (
                            <span>• {escala.especialidade}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          {escala.hora_inicio} - {escala.hora_fim}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{escala.setor}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialogs */}
      <ImportEquipeDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        type={importType}
      />
      
      <AdicionarEscalaDialog
        open={addEscalaDialogOpen}
        onOpenChange={setAddEscalaDialogOpen}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default EquipeModule;
