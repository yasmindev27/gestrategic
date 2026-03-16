import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Search, X } from "lucide-react";

interface SaidaItem {
  id: string;
  paciente_nome: string | null;
  numero_prontuario: string | null;
  data_atendimento: string | null;
}

interface ColabResult {
  user_id: string;
  full_name: string;
  cargo: string | null;
  setor: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EntregaProntuariosDialog({ open, onOpenChange, onSuccess }: Props) {
  const { isRecepcao, isClassificacao, isNir, isAdmin, isFaturamento, userId } = useUserRole();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");

  const [responsavel, setResponsavel] = useState<ColabResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [prontuariosDia, setProntuariosDia] = useState<SaidaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search colaboradores
  const [searchColab, setSearchColab] = useState("");
  const [colabResults, setColabResults] = useState<ColabResult[]>([]);
  const [searchPaciente, setSearchPaciente] = useState("");
  const [showColabResults, setShowColabResults] = useState(false);

  const getSetorInfo = () => {
    if (isAdmin) {
      // Admin segue o fluxo baseado no setor que ele está operando
      if (isNir) return { origem: "NIR", destino: "Faturamento" };
      if (isClassificacao) return { origem: "Classificação", destino: "NIR" };
      if (isRecepcao) return { origem: "Recepção", destino: "Classificação" };
      // Admin puro: padrão NIR → Faturamento
      return { origem: "NIR", destino: "Faturamento" };
    }
    if (isRecepcao) return { origem: "Recepção", destino: "Classificação" };
    if (isClassificacao) return { origem: "Classificação", destino: "NIR" };
    if (isNir) return { origem: "NIR", destino: "Faturamento" };
    return null;
  };

  const setorInfo = getSetorInfo();

  useEffect(() => {
    if (open && userId) {
      fetchProntuariosDia("");
      fetchUserName();
      setSelectedIds(new Set());
      setResponsavel(null);
      setSearchColab("");
      setSearchPaciente("");
      setColabResults([]);
    }
  }, [open, userId, isClassificacao, isNir, isRecepcao, isAdmin]);

  useEffect(() => {
    if (!open || !userId) return;

    const term = searchPaciente.trim();
    const timer = setTimeout(() => {
      if (term.length === 0 || term.length >= 2) {
        fetchProntuariosDia(term);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchPaciente, open, userId, isClassificacao, isNir, isRecepcao, isAdmin]);

  const fetchUserName = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setFullName(data.full_name || "Usuário");
  };

  const fetchProntuariosDia = async (searchTerm = "") => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("saida_prontuarios")
        .select("id, paciente_nome, numero_prontuario, data_atendimento")
        .eq("is_folha_avulsa", false)
        .neq("status", "concluido");

      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch.length >= 2) {
        query = query.ilike("paciente_nome", `%${trimmedSearch}%`);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(trimmedSearch.length >= 2 ? 300 : 2000);

      if (error) throw error;

      setProntuariosDia(data || []);
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar prontuários do dia.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Search colaboradores by name
  useEffect(() => {
    if (searchColab.length < 2) {
      setColabResults([]);
      setShowColabResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        console.log("[EntregaProntuarios] Buscando colaborador:", searchColab);
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, cargo, setor")
          .ilike("full_name", `%${searchColab}%`)
          .order("full_name")
          .limit(10);
        console.log("[EntregaProntuarios] Resultado busca:", { data, error });
        if (error) {
          console.error("Erro ao buscar funcionários:", error);
          setColabResults([]);
        } else {
          setColabResults((data as ColabResult[]) || []);
        }
        setShowColabResults(true);
      } catch (err) {
        console.error("Erro na busca:", err);
        setColabResults([]);
        setShowColabResults(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchColab]);

  const selectResponsavel = (colab: ColabResult) => {
    setResponsavel(colab);
    setSearchColab(colab.full_name);
    setShowColabResults(false);
  };

  const clearResponsavel = () => {
    setResponsavel(null);
    setSearchColab("");
    setColabResults([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === prontuariosDia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prontuariosDia.map(p => p.id)));
    }
  };

  const handleSubmit = async () => {
    if (!setorInfo || selectedIds.size === 0 || !responsavel) return;
    setIsSubmitting(true);
    try {
      const { data: entrega, error: entregaError } = await supabase
        .from("entregas_prontuarios")
        .insert({
          entregador_id: userId,
          entregador_nome: fullName || "Usuário",
          setor_origem: setorInfo.origem,
          setor_destino: setorInfo.destino,
          responsavel_recebimento_id: responsavel.user_id,
          responsavel_recebimento_nome: responsavel.full_name,
        })
        .select("id")
        .single();

      if (entregaError) throw entregaError;

      const itens = Array.from(selectedIds).map(saida_prontuario_id => ({
        entrega_id: entrega.id,
        saida_prontuario_id,
      }));

      const { error: itensError } = await supabase
        .from("entregas_prontuarios_itens")
        .insert(itens);

      if (itensError) throw itensError;

      toast({
        title: "Entrega registrada",
        description: `${selectedIds.size} prontuário(s) entregue(s) para ${setorInfo.destino}.`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao registrar entrega.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!setorInfo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Entrega de Prontuários</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Entregador</label>
              <Input value={fullName || ""} disabled className="bg-muted" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Data/Hora</label>
              <Input value={new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} disabled className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Origem</label>
              <Input value={setorInfo.origem} disabled className="bg-muted" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Destino</label>
              <Input value={setorInfo.destino} disabled className="bg-muted" />
            </div>
          </div>

          {/* Responsável - search */}
          <div className="relative">
            <label className="text-xs font-medium text-muted-foreground">
              Responsável pelo Recebimento <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o nome do funcionário..."
                value={searchColab}
                onChange={e => {
                  setSearchColab(e.target.value);
                  if (responsavel) setResponsavel(null);
                }}
                onFocus={() => colabResults.length > 0 && setShowColabResults(true)}
                className="pl-10 pr-8"
              />
              {responsavel && (
                <button
                  onClick={clearResponsavel}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {responsavel && (
              <p className="text-xs text-primary mt-1">
                Selecionado: {responsavel.full_name} {responsavel.cargo ? `(${responsavel.cargo})` : ""}
              </p>
            )}
            {showColabResults && !responsavel && colabResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {colabResults.map(c => (
                  <button
                    key={c.user_id}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between"
                    onClick={() => selectResponsavel(c)}
                  >
                    <span className="font-medium">{c.full_name}</span>
                    {c.cargo && <span className="text-muted-foreground text-xs">{c.cargo}</span>}
                  </button>
                ))}
              </div>
            )}
            {searchColab.length >= 2 && colabResults.length === 0 && !responsavel && (
              <p className="text-xs text-muted-foreground mt-1">Nenhum funcionário encontrado.</p>
            )}
          </div>

          {/* Filtro por nome do paciente */}
          <div className="relative">
            <label className="text-xs font-medium text-muted-foreground">
              Buscar por nome do paciente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o nome do paciente..."
                value={searchPaciente}
                onChange={e => setSearchPaciente(e.target.value)}
                className="pl-10"
              />
              {searchPaciente && (
                <button
                  onClick={() => setSearchPaciente("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Prontuários do dia */}
          <div>
            {(() => {
              const filtrados = searchPaciente.trim()
                ? prontuariosDia.filter(p =>
                    (p.paciente_nome || "").toLowerCase().includes(searchPaciente.toLowerCase())
                  )
                : prontuariosDia;

              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Prontuários disponíveis ({filtrados.length})
                    </label>
                    {filtrados.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={toggleAll}>
                        {selectedIds.size === prontuariosDia.length ? "Desmarcar todos" : "Selecionar todos"}
                      </Button>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filtrados.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchPaciente.trim() ? "Nenhum prontuário encontrado com esse nome." : "Nenhum prontuário disponível para entrega."}
                    </p>
                  ) : (
              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-2 space-y-1">
                  {filtrados.map(p => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggleSelect(p.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.paciente_nome || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.numero_prontuario || "S/N"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
                </>
              );
            })()}
          </div>

          {selectedIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} prontuário(s) selecionado(s)
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || !responsavel || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Registrar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
