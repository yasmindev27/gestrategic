import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useColaboradores } from "@/hooks/useProfissionais";
import { useToast } from "@/hooks/use-toast";
import { getBrasiliaDateString } from "@/lib/brasilia-time";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";

interface SaidaItem {
  id: string;
  paciente_nome: string | null;
  numero_prontuario: string | null;
  data_atendimento: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EntregaProntuariosDialog({ open, onOpenChange, onSuccess }: Props) {
  const { isRecepcao, isClassificacao, isNir, isAdmin, userId } = useUserRole();
  const { data: colaboradores } = useColaboradores();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");

  const [responsavelId, setResponsavelId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [prontuariosDia, setProntuariosDia] = useState<SaidaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchColab, setSearchColab] = useState("");

  // Determinar setor destino com base no perfil do usuário
  const getSetorInfo = () => {
    if (isRecepcao) return { origem: "Recepção", destino: "Classificação" };
    if (isClassificacao) return { origem: "Classificação", destino: "NIR" };
    if (isNir) return { origem: "NIR", destino: "Faturamento" };
    if (isAdmin) return { origem: "Admin", destino: "Todos" };
    return null;
  };

  const setorInfo = getSetorInfo();

  useEffect(() => {
    if (open) {
      fetchProntuariosDia();
      fetchUserName();
      setSelectedIds(new Set());
      setResponsavelId("");
    }
  }, [open]);

  const fetchUserName = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();
    if (data) setFullName(data.full_name || "Usuário");
  };

  const fetchProntuariosDia = async () => {
    setIsLoading(true);
    try {
      const hoje = getBrasiliaDateString();
      const inicioHoje = `${hoje}T00:00:00-03:00`;
      const fimHoje = `${hoje}T23:59:59-03:00`;

      const { data, error } = await supabase
        .from("saida_prontuarios")
        .select("id, paciente_nome, numero_prontuario, data_atendimento")
        .eq("is_folha_avulsa", false)
        .gte("created_at", inicioHoje)
        .lte("created_at", fimHoje)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProntuariosDia(data || []);
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar prontuários do dia.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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

  const responsavelNome = colaboradores?.find(c => c.user_id === responsavelId)?.full_name || "";

  const filteredColaboradores = colaboradores?.filter(c =>
    !searchColab || c.full_name?.toLowerCase().includes(searchColab.toLowerCase())
  ) || [];

  const handleSubmit = async () => {
    if (!setorInfo || selectedIds.size === 0 || !responsavelId) return;
    setIsSubmitting(true);
    try {
      const { data: entrega, error: entregaError } = await supabase
        .from("entregas_prontuarios")
        .insert({
          entregador_id: userId,
          entregador_nome: fullName || "Usuário",
          setor_origem: setorInfo.origem,
          setor_destino: setorInfo.destino,
          responsavel_recebimento_id: responsavelId,
          responsavel_recebimento_nome: responsavelNome,
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
          {/* Info do entregador */}
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

          {/* Responsável pelo recebimento */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Responsável pelo Recebimento <span className="text-destructive">*</span></label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Buscar funcionário..."
                    value={searchColab}
                    onChange={e => setSearchColab(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                {filteredColaboradores.slice(0, 50).map(c => (
                  <SelectItem key={c.user_id} value={c.user_id}>
                    {c.full_name} {c.cargo ? `(${c.cargo})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prontuários do dia */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">
                Prontuários do dia ({prontuariosDia.length})
              </label>
              {prontuariosDia.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={toggleAll}>
                  {selectedIds.size === prontuariosDia.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : prontuariosDia.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum prontuário registrado hoje.</p>
            ) : (
              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-2 space-y-1">
                  {prontuariosDia.map(p => (
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
            disabled={selectedIds.size === 0 || !responsavelId || isSubmitting}
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
