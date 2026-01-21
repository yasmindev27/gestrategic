import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  UtensilsCrossed,
  User,
  Users,
  Search,
  CheckCircle2,
  Loader2,
  Coffee,
  Sun,
  Cookie,
  Moon,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Colaborador {
  user_id: string;
  full_name: string;
  setor: string | null;
  cargo: string | null;
}

interface Cardapio {
  id: string;
  data: string;
  tipo_refeicao: string;
  descricao: string;
  observacoes: string | null;
}

type TipoRefeicao = "cafe" | "almoco" | "lanche" | "jantar" | "fora_horario";

const tipoRefeicaoInfo: Record<TipoRefeicao, { label: string; icon: React.ReactNode; cor: string }> = {
  cafe: { label: "Café da Manhã", icon: <Coffee className="h-6 w-6" />, cor: "bg-amber-100 text-amber-700" },
  almoco: { label: "Almoço", icon: <Sun className="h-6 w-6" />, cor: "bg-orange-100 text-orange-700" },
  lanche: { label: "Café da Tarde", icon: <Cookie className="h-6 w-6" />, cor: "bg-pink-100 text-pink-700" },
  jantar: { label: "Jantar", icon: <Moon className="h-6 w-6" />, cor: "bg-indigo-100 text-indigo-700" },
  fora_horario: { label: "Fora de Horário", icon: <Clock className="h-6 w-6" />, cor: "bg-gray-100 text-gray-700" },
};

// Valida CPF
const validarCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  
  return true;
};

// Máscara de CPF
const mascaraCPF = (valor: string): string => {
  return valor
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

// Hash simples para CPF (não expor CPF real)
const hashCPF = async (cpf: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(cpf.replace(/\D/g, ""));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

// Determinar tipo de refeição com base no horário (fuso de Brasília)
const determinarTipoRefeicao = (): TipoRefeicao => {
  // Usar horário de Brasília (America/Sao_Paulo)
  const now = new Date();
  const brasiliaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const horas = brasiliaTime.getHours();
  const minutos = brasiliaTime.getMinutes();
  const tempoTotal = horas * 60 + minutos;
  
  // 06:30 às 08:30 → Café da manhã
  if (tempoTotal >= 390 && tempoTotal <= 510) return "cafe";
  // 11:30 às 13:00 → Almoço
  if (tempoTotal >= 690 && tempoTotal <= 780) return "almoco";
  // 15:30 às 16:30 → Café da tarde
  if (tempoTotal >= 930 && tempoTotal <= 990) return "lanche";
  // 19:30 às 22:00 → Jantar
  if (tempoTotal >= 1170 && tempoTotal <= 1320) return "jantar";
  // Fora de horário
  return "fora_horario";
};

const TotemRefeicoes = () => {
  const { toast } = useToast();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [busca, setBusca] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistrando, setIsRegistrando] = useState(false);
  const [showSucesso, setShowSucesso] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState<{ nome: string; tipo: TipoRefeicao } | null>(null);
  
  // Modal visitante
  const [showVisitanteModal, setShowVisitanteModal] = useState(false);
  const [visitanteNome, setVisitanteNome] = useState("");
  const [visitanteCPF, setVisitanteCPF] = useState("");
  const [cpfValido, setCpfValido] = useState(true);
  const [aceitouLGPD, setAceitouLGPD] = useState(false);
  
  // Modal seleção de refeição (fora de horário)
  const [showSelecionarRefeicaoModal, setShowSelecionarRefeicaoModal] = useState(false);
  const [colaboradorPendente, setColaboradorPendente] = useState<Colaborador | null>(null);
  const [tipoRefeicaoSelecionado, setTipoRefeicaoSelecionado] = useState<TipoRefeicao | null>(null);
  
  const tipoRefeicaoAtual = determinarTipoRefeicao();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const visitanteNomeRef = useRef<HTMLInputElement>(null);
  const visitanteCPFRef = useRef<HTMLInputElement>(null);
  
  // Tipos de refeição disponíveis para seleção (exclui fora_horario)
  const tiposRefeicaoDisponiveis: TipoRefeicao[] = ["cafe", "almoco", "lanche", "jantar"];

  // Cardápio do dia (único ou múltiplos para fora de horário)
  const [cardapioDoDia, setCardapioDoDia] = useState<Cardapio | null>(null);
  const [cardapiosDoDia, setCardapiosDoDia] = useState<Cardapio[]>([]);

  // Mapeamento do tipo de refeição para o campo do cardápio
  const tipoRefeicaoToCardapio: Record<TipoRefeicao, string> = {
    cafe: "cafe",
    almoco: "almoco",
    lanche: "lanche",
    jantar: "jantar",
    fora_horario: "",
  };

  // Buscar colaboradores e cardápio do dia
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar colaboradores
        const { data: colaboradoresData, error: colaboradoresError } = await supabase
          .from("profiles")
          .select("user_id, full_name, setor, cargo")
          .order("full_name");
        
        if (colaboradoresError) throw colaboradoresError;
        setColaboradores(colaboradoresData || []);

        // Buscar cardápio do dia
        const hoje = format(new Date(), "yyyy-MM-dd");
        
        if (tipoRefeicaoAtual === "fora_horario") {
          // Fora de horário: buscar todos os cardápios do dia
          const { data: cardapiosData, error: cardapiosError } = await supabase
            .from("cardapios")
            .select("*")
            .eq("data", hoje)
            .order("tipo_refeicao");
          
          if (!cardapiosError && cardapiosData) {
            setCardapiosDoDia(cardapiosData);
          }
          setCardapioDoDia(null);
        } else {
          // Horário normal: buscar apenas o cardápio da refeição atual
          const tipoCardapio = tipoRefeicaoToCardapio[tipoRefeicaoAtual];
          
          if (tipoCardapio) {
            const { data: cardapioData, error: cardapioError } = await supabase
              .from("cardapios")
              .select("*")
              .eq("data", hoje)
              .eq("tipo_refeicao", tipoCardapio)
              .maybeSingle();
            
            if (!cardapioError && cardapioData) {
              setCardapioDoDia(cardapioData);
            }
          }
          setCardapiosDoDia([]);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [toast, tipoRefeicaoAtual]);

  // Filtrar colaboradores pela busca
  const colaboradoresFiltrados = colaboradores.filter(c =>
    c.full_name.toLowerCase().includes(busca.toLowerCase())
  );

  // Handler quando clica em um colaborador
  const handleClickColaborador = (colaborador: Colaborador) => {
    if (isRegistrando) return;
    
    // Se está fora de horário, abre modal para selecionar o tipo
    if (tipoRefeicaoAtual === "fora_horario") {
      setColaboradorPendente(colaborador);
      setTipoRefeicaoSelecionado(null);
      setShowSelecionarRefeicaoModal(true);
    } else {
      registrarRefeicaoColaborador(colaborador, tipoRefeicaoAtual);
    }
  };

  // Registrar refeição de colaborador
  const registrarRefeicaoColaborador = async (colaborador: Colaborador, tipoRefeicao: TipoRefeicao) => {
    if (isRegistrando) return;
    
    setIsRegistrando(true);
    try {
      // Obter data e hora no fuso de Brasília
      const now = new Date();
      const brasiliaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const dataRegistro = `${brasiliaTime.getFullYear()}-${String(brasiliaTime.getMonth() + 1).padStart(2, "0")}-${String(brasiliaTime.getDate()).padStart(2, "0")}`;
      const horaRegistro = `${String(brasiliaTime.getHours()).padStart(2, "0")}:${String(brasiliaTime.getMinutes()).padStart(2, "0")}:${String(brasiliaTime.getSeconds()).padStart(2, "0")}`;
      
      const { error } = await supabase.from("refeicoes_registros").insert({
        tipo_pessoa: "colaborador",
        colaborador_user_id: colaborador.user_id,
        colaborador_nome: colaborador.full_name,
        tipo_refeicao: tipoRefeicao,
        data_registro: dataRegistro,
        hora_registro: horaRegistro,
      });
      
      if (error) throw error;
      
      setUltimoRegistro({ nome: colaborador.full_name, tipo: tipoRefeicao });
      setShowSucesso(true);
      setBusca("");
      setShowSelecionarRefeicaoModal(false);
      setColaboradorPendente(null);
      
      // Ocultar mensagem após 3 segundos
      setTimeout(() => {
        setShowSucesso(false);
        setUltimoRegistro(null);
      }, 3000);
    } catch (error) {
      console.error("Erro ao registrar refeição:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a refeição.",
        variant: "destructive",
      });
    } finally {
      setIsRegistrando(false);
    }
  };

  // Confirmar seleção de refeição (fora de horário)
  const confirmarSelecaoRefeicao = () => {
    if (!colaboradorPendente || !tipoRefeicaoSelecionado) {
      toast({
        title: "Atenção",
        description: "Selecione o tipo de refeição.",
        variant: "destructive",
      });
      return;
    }
    registrarRefeicaoColaborador(colaboradorPendente, tipoRefeicaoSelecionado);
  };

  // Modal seleção de refeição para visitante (fora de horário)
  const [showSelecionarRefeicaoVisitanteModal, setShowSelecionarRefeicaoVisitanteModal] = useState(false);
  const [visitantePendente, setVisitantePendente] = useState<{ nome: string; cpfHash: string } | null>(null);
  const [tipoRefeicaoVisitanteSelecionado, setTipoRefeicaoVisitanteSelecionado] = useState<TipoRefeicao | null>(null);

  // Registrar refeição de visitante
  const registrarRefeicaoVisitante = async () => {
    if (isRegistrando) return;
    
    // Validações
    if (!visitanteNome.trim()) {
      toast({ title: "Erro", description: "Informe o nome completo.", variant: "destructive" });
      return;
    }
    if (visitanteNome.trim().split(" ").length < 2) {
      toast({ title: "Erro", description: "Informe nome e sobrenome.", variant: "destructive" });
      return;
    }
    if (!validarCPF(visitanteCPF)) {
      setCpfValido(false);
      toast({ title: "Erro", description: "CPF inválido.", variant: "destructive" });
      return;
    }
    if (!aceitouLGPD) {
      toast({ title: "Erro", description: "É necessário aceitar os termos de uso de dados.", variant: "destructive" });
      return;
    }
    
    // Se está fora de horário, abre modal para selecionar o tipo
    if (tipoRefeicaoAtual === "fora_horario") {
      const cpfHash = await hashCPF(visitanteCPF);
      setVisitantePendente({ nome: visitanteNome.trim(), cpfHash });
      setTipoRefeicaoVisitanteSelecionado(null);
      setShowVisitanteModal(false);
      setShowSelecionarRefeicaoVisitanteModal(true);
      return;
    }
    
    await finalizarRegistroVisitante(tipoRefeicaoAtual);
  };

  // Finalizar registro de visitante com tipo de refeição
  const finalizarRegistroVisitante = async (tipoRefeicao: TipoRefeicao) => {
    setIsRegistrando(true);
    try {
      let cpfHash: string;
      let nomeVisitante: string;
      
      if (visitantePendente) {
        cpfHash = visitantePendente.cpfHash;
        nomeVisitante = visitantePendente.nome;
      } else {
        cpfHash = await hashCPF(visitanteCPF);
        nomeVisitante = visitanteNome.trim();
      }
      
      // Obter data e hora no fuso de Brasília
      const now = new Date();
      const brasiliaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const dataRegistro = `${brasiliaTime.getFullYear()}-${String(brasiliaTime.getMonth() + 1).padStart(2, "0")}-${String(brasiliaTime.getDate()).padStart(2, "0")}`;
      const horaRegistro = `${String(brasiliaTime.getHours()).padStart(2, "0")}:${String(brasiliaTime.getMinutes()).padStart(2, "0")}:${String(brasiliaTime.getSeconds()).padStart(2, "0")}`;
      
      const { error } = await supabase.from("refeicoes_registros").insert({
        tipo_pessoa: "visitante",
        colaborador_nome: nomeVisitante,
        visitante_cpf_hash: cpfHash,
        tipo_refeicao: tipoRefeicao,
        data_registro: dataRegistro,
        hora_registro: horaRegistro,
      });
      
      if (error) throw error;
      
      setUltimoRegistro({ nome: nomeVisitante, tipo: tipoRefeicao });
      setShowSucesso(true);
      setShowVisitanteModal(false);
      setShowSelecionarRefeicaoVisitanteModal(false);
      setVisitantePendente(null);
      resetVisitanteForm();
      
      setTimeout(() => {
        setShowSucesso(false);
        setUltimoRegistro(null);
      }, 3000);
    } catch (error) {
      console.error("Erro ao registrar visitante:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a refeição.",
        variant: "destructive",
      });
    } finally {
      setIsRegistrando(false);
    }
  };

  // Confirmar seleção de refeição para visitante
  const confirmarSelecaoRefeicaoVisitante = () => {
    if (!tipoRefeicaoVisitanteSelecionado) {
      toast({
        title: "Atenção",
        description: "Selecione o tipo de refeição.",
        variant: "destructive",
      });
      return;
    }
    finalizarRegistroVisitante(tipoRefeicaoVisitanteSelecionado);
  };

  const resetVisitanteForm = () => {
    setVisitanteNome("");
    setVisitanteCPF("");
    setCpfValido(true);
    setAceitouLGPD(false);
  };

  // Prevenir navegação no modo quiosque
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquear F5, Ctrl+R, Ctrl+W, Alt+F4, etc.
      if (
        e.key === "F5" ||
        (e.ctrlKey && (e.key === "r" || e.key === "w" || e.key === "t" || e.key === "n")) ||
        (e.altKey && e.key === "F4")
      ) {
        e.preventDefault();
      }
    };
    
    // Bloquear menu de contexto
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // Foco automático no campo de busca
  useEffect(() => {
    if (!showVisitanteModal && !showSucesso && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showVisitanteModal, showSucesso]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col select-none">
      {/* Header fixo */}
      <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Totem Refeições</h1>
              <p className="text-primary-foreground/80 text-sm">Toque no seu nome para registrar</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${tipoRefeicaoInfo[tipoRefeicaoAtual].cor}`}>
            {tipoRefeicaoInfo[tipoRefeicaoAtual].icon}
            <span className="font-medium">{tipoRefeicaoInfo[tipoRefeicaoAtual].label}</span>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 flex flex-col">
        {/* Mensagem de sucesso */}
        {showSucesso && ultimoRegistro && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[90%] max-w-md p-8 text-center animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-700">Refeição Registrada!</h2>
                <p className="text-lg text-muted-foreground">{ultimoRegistro.nome}</p>
                <Badge className={tipoRefeicaoInfo[ultimoRegistro.tipo].cor}>
                  {tipoRefeicaoInfo[ultimoRegistro.tipo].label}
                </Badge>
              </div>
            </Card>
          </div>
        )}

        {/* Cardápio do dia - Refeição atual */}
        {cardapioDoDia && tipoRefeicaoAtual !== "fora_horario" && (
          <Card className="mb-4 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${tipoRefeicaoInfo[tipoRefeicaoAtual].cor}`}>
                  {tipoRefeicaoInfo[tipoRefeicaoAtual].icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">
                      Cardápio de Hoje - {tipoRefeicaoInfo[tipoRefeicaoAtual].label}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                    </Badge>
                  </div>
                  <p className="text-foreground text-base leading-relaxed">{cardapioDoDia.descricao}</p>
                  {cardapioDoDia.observacoes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      {cardapioDoDia.observacoes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cardápios do dia - Fora de horário (mostra todos) */}
        {tipoRefeicaoAtual === "fora_horario" && cardapiosDoDia.length > 0 && (
          <Card className="mb-4 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-lg">Cardápios de Hoje</h3>
                <Badge variant="outline" className="text-xs">
                  {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                </Badge>
              </div>
              <div className="grid gap-3">
                {cardapiosDoDia.map((cardapio) => {
                  const tipo = cardapio.tipo_refeicao as TipoRefeicao;
                  const info = tipoRefeicaoInfo[tipo] || tipoRefeicaoInfo.cafe;
                  return (
                    <div key={cardapio.id} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                      <div className={`p-2 rounded-lg ${info.cor}`}>
                        {info.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                          {info.label}
                        </h4>
                        <p className="text-foreground text-base leading-relaxed">{cardapio.descricao}</p>
                        {cardapio.observacoes && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            {cardapio.observacoes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campo de busca */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                inputMode="text"
                enterKeyHint="search"
                placeholder="Digite seu nome para buscar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onClick={() => searchInputRef.current?.focus()}
                onTouchStart={() => searchInputRef.current?.focus()}
                className="pl-12 h-14 text-lg"
                autoComplete="off"
                autoFocus
                readOnly={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de colaboradores */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Colaboradores
              {busca && (
                <Badge variant="secondary" className="ml-2">
                  {colaboradoresFiltrados.length} encontrado(s)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-380px)]">
                <div className="divide-y">
                  {colaboradoresFiltrados.map((colaborador) => (
                    <button
                      key={colaborador.user_id}
                      onClick={() => handleClickColaborador(colaborador)}
                      disabled={isRegistrando}
                      className="w-full p-4 text-left hover:bg-primary/5 active:bg-primary/10 transition-colors flex items-center gap-4 disabled:opacity-50"
                    >
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-lg">{colaborador.full_name}</p>
                        {(colaborador.setor || colaborador.cargo) && (
                          <p className="text-sm text-muted-foreground">
                            {[colaborador.cargo, colaborador.setor].filter(Boolean).join(" • ")}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                  {colaboradoresFiltrados.length === 0 && !isLoading && (
                    <div className="text-center py-12 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum colaborador encontrado.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Botão Visitante */}
        <div className="mt-4">
          <Button
            size="lg"
            variant="outline"
            className="w-full h-16 text-lg border-2"
            onClick={() => setShowVisitanteModal(true)}
            disabled={isRegistrando}
          >
            <Users className="h-6 w-6 mr-3" />
            Sou Visitante
          </Button>
        </div>
      </main>

      {/* Modal Visitante */}
      <Dialog open={showVisitanteModal} onOpenChange={(open) => {
        setShowVisitanteModal(open);
        if (!open) resetVisitanteForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registro de Visitante
            </DialogTitle>
            <DialogDescription>
              Preencha seus dados para registrar a refeição.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="visitante-nome">Nome Completo *</Label>
              <Input
                ref={visitanteNomeRef}
                id="visitante-nome"
                value={visitanteNome}
                onChange={(e) => setVisitanteNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    visitanteCPFRef.current?.focus();
                  }
                }}
                placeholder="Digite seu nome completo"
                className="h-12"
                autoComplete="off"
                inputMode="text"
                enterKeyHint="next"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="visitante-cpf">CPF *</Label>
              <Input
                ref={visitanteCPFRef}
                id="visitante-cpf"
                value={visitanteCPF}
                onChange={(e) => {
                  setVisitanteCPF(mascaraCPF(e.target.value));
                  setCpfValido(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    registrarRefeicaoVisitante();
                  }
                }}
                placeholder="000.000.000-00"
                className={`h-12 ${!cpfValido ? "border-red-500" : ""}`}
                maxLength={14}
                autoComplete="off"
                inputMode="numeric"
                enterKeyHint="done"
              />
              {!cpfValido && (
                <p className="text-sm text-red-500">CPF inválido</p>
              )}
            </div>
            
            {/* Aviso LGPD */}
            <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>Aviso de Privacidade (LGPD):</strong> Seus dados pessoais serão utilizados 
                exclusivamente para controle interno de refeições. O CPF é armazenado de forma 
                criptografada e não será exibido em relatórios.
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="aceita-lgpd"
                  checked={aceitouLGPD}
                  onChange={(e) => setAceitouLGPD(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="aceita-lgpd" className="text-sm font-normal">
                  Li e aceito os termos de uso de dados
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowVisitanteModal(false);
              resetVisitanteForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={registrarRefeicaoVisitante} disabled={isRegistrando}>
              {isRegistrando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Seleção de Refeição (Colaborador - Fora de Horário) */}
      <Dialog open={showSelecionarRefeicaoModal} onOpenChange={(open) => {
        setShowSelecionarRefeicaoModal(open);
        if (!open) {
          setColaboradorPendente(null);
          setTipoRefeicaoSelecionado(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registro Fora de Horário
            </DialogTitle>
            <DialogDescription>
              {colaboradorPendente && (
                <span className="font-medium text-foreground">{colaboradorPendente.full_name}</span>
              )}, selecione o tipo de refeição:
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-3 py-4">
            {tiposRefeicaoDisponiveis.map((tipo) => (
              <button
                key={tipo}
                onClick={() => setTipoRefeicaoSelecionado(tipo)}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  tipoRefeicaoSelecionado === tipo
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                <div className={`p-3 rounded-full ${tipoRefeicaoInfo[tipo].cor}`}>
                  {tipoRefeicaoInfo[tipo].icon}
                </div>
                <span className="font-medium text-sm">{tipoRefeicaoInfo[tipo].label}</span>
              </button>
            ))}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowSelecionarRefeicaoModal(false);
              setColaboradorPendente(null);
              setTipoRefeicaoSelecionado(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={confirmarSelecaoRefeicao} disabled={isRegistrando || !tipoRefeicaoSelecionado}>
              {isRegistrando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Seleção de Refeição (Visitante - Fora de Horário) */}
      <Dialog open={showSelecionarRefeicaoVisitanteModal} onOpenChange={(open) => {
        setShowSelecionarRefeicaoVisitanteModal(open);
        if (!open) {
          setVisitantePendente(null);
          setTipoRefeicaoVisitanteSelecionado(null);
          resetVisitanteForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registro Fora de Horário
            </DialogTitle>
            <DialogDescription>
              {visitantePendente && (
                <span className="font-medium text-foreground">{visitantePendente.nome}</span>
              )}, selecione o tipo de refeição:
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-3 py-4">
            {tiposRefeicaoDisponiveis.map((tipo) => (
              <button
                key={tipo}
                onClick={() => setTipoRefeicaoVisitanteSelecionado(tipo)}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  tipoRefeicaoVisitanteSelecionado === tipo
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                <div className={`p-3 rounded-full ${tipoRefeicaoInfo[tipo].cor}`}>
                  {tipoRefeicaoInfo[tipo].icon}
                </div>
                <span className="font-medium text-sm">{tipoRefeicaoInfo[tipo].label}</span>
              </button>
            ))}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowSelecionarRefeicaoVisitanteModal(false);
              setVisitantePendente(null);
              setTipoRefeicaoVisitanteSelecionado(null);
              resetVisitanteForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={confirmarSelecaoRefeicaoVisitante} disabled={isRegistrando || !tipoRefeicaoVisitanteSelecionado}>
              {isRegistrando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rodapé com horários */}
      <footer className="bg-muted/50 border-t py-3 px-4">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Coffee className="h-3 w-3" /> Café: 06:30-08:30
          </span>
          <span className="flex items-center gap-1">
            <Sun className="h-3 w-3" /> Almoço: 11:30-13:00
          </span>
          <span className="flex items-center gap-1">
            <Cookie className="h-3 w-3" /> Lanche: 15:30-16:30
          </span>
          <span className="flex items-center gap-1">
            <Moon className="h-3 w-3" /> Jantar: 19:30-22:00
          </span>
        </div>
      </footer>
    </div>
  );
};

export default TotemRefeicoes;
