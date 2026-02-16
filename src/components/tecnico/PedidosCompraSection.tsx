import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PedidosCompraSectionProps {
  setor: string;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pendente: { label: "Pendente", icon: Clock, className: "bg-amber-500/15 text-amber-700 border-amber-300" },
  aprovado: { label: "Aprovado", icon: CheckCircle, className: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
  rejeitado: { label: "Rejeitado", icon: XCircle, className: "bg-destructive/15 text-destructive border-destructive/30" },
  entregue: { label: "Entregue", icon: Package, className: "bg-primary/15 text-primary border-primary/30" },
};

const urgenciaConfig: Record<string, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  media: { label: "Média", className: "bg-amber-500/15 text-amber-700" },
  alta: { label: "Alta", className: "bg-orange-500/15 text-orange-700" },
  critica: { label: "Crítica", className: "bg-destructive/15 text-destructive" },
};

export function PedidosCompraSection({ setor }: PedidosCompraSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    item_nome: "", item_descricao: "", quantidade_solicitada: "1",
    unidade_medida: "UN", justificativa: "", urgencia: "media",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        supabase.from("profiles").select("full_name").eq("user_id", data.user.id).single()
          .then(({ data: p }) => { if (p) setUserName(p.full_name); });
      }
    });
  }, []);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos_compra_tecnico", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_compra")
        .select("*")
        .eq("setor_solicitante", setor)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const criarMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { error } = await supabase.from("pedidos_compra").insert({
        setor_solicitante: setor,
        solicitante_id: userId,
        solicitante_nome: userName,
        item_nome: data.item_nome,
        item_descricao: data.item_descricao || null,
        quantidade_solicitada: parseInt(data.quantidade_solicitada),
        unidade_medida: data.unidade_medida,
        justificativa: data.justificativa,
        urgencia: data.urgencia,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos_compra_tecnico", setor] });
      queryClient.invalidateQueries({ queryKey: ["pedidos_compra", setor] });
      toast({ title: "Pedido de compra enviado para a Gerência!" });
      setDialogOpen(false);
      setForm({ item_nome: "", item_descricao: "", quantidade_solicitada: "1", unidade_medida: "UN", justificativa: "", urgencia: "media" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingState message="Carregando pedidos..." />;

  const pendentes = pedidos.filter((p: any) => p.status === "pendente").length;
  const aprovados = pedidos.filter((p: any) => p.status === "aprovado").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pedidos de Compra</h3>
          <p className="text-sm text-muted-foreground">Solicite peças, suprimentos e materiais para a Gerência</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Pedido
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{pedidos.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-amber-600">Pendentes</p>
          <p className="text-2xl font-bold text-amber-600">{pendentes}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-emerald-600">Aprovados</p>
          <p className="text-2xl font-bold text-emerald-600">{aprovados}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-primary">Entregues</p>
          <p className="text-2xl font-bold text-primary">{pedidos.filter((p: any) => p.status === "entregue").length}</p>
        </Card>
      </div>

      {/* Lista */}
      {pedidos.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Nenhum pedido" description="Clique em 'Novo Pedido' para solicitar materiais." />
      ) : (
        <div className="space-y-2">
          {pedidos.map((p: any) => {
            const sc = statusConfig[p.status] || statusConfig.pendente;
            const uc = urgenciaConfig[p.urgencia] || urgenciaConfig.media;
            const StatusIcon = sc.icon;
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{p.item_nome}</p>
                      <Badge variant="outline" className={`text-xs ${sc.className}`}>
                        <StatusIcon className="h-3 w-3 mr-1" /> {sc.label}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${uc.className}`}>{uc.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{p.justificativa}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Qtd: {p.quantidade_solicitada} {p.unidade_medida}</span>
                      <span>•</span>
                      <span>{format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      {p.observacoes_gerencia && (
                        <>
                          <span>•</span>
                          <span className="text-primary">Obs Gerência: {p.observacoes_gerencia}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Solicitar Peça / Suprimento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Item *</Label>
              <Input value={form.item_nome} onChange={e => setForm(f => ({ ...f, item_nome: e.target.value }))}
                placeholder="Ex: Toner HP, Filtro HEPA, Disjuntor 20A" />
            </div>
            <div>
              <Label>Quantidade *</Label>
              <Input type="number" min="1" value={form.quantidade_solicitada} onChange={e => setForm(f => ({ ...f, quantidade_solicitada: e.target.value }))} />
            </div>
            <div>
              <Label>Urgência</Label>
              <Select value={form.urgencia} onValueChange={v => setForm(f => ({ ...f, urgencia: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica - Parada operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Justificativa *</Label>
              <Textarea value={form.justificativa} onChange={e => setForm(f => ({ ...f, justificativa: e.target.value }))}
                placeholder="Descreva por que precisa deste item e o impacto da falta..." />
            </div>
            <div className="col-span-2">
              <Label>Descrição adicional</Label>
              <Input value={form.item_descricao} onChange={e => setForm(f => ({ ...f, item_descricao: e.target.value }))}
                placeholder="Especificações, marca, modelo..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!form.item_nome || !form.justificativa) {
                toast({ title: "Erro", description: "Preencha item e justificativa", variant: "destructive" }); return;
              }
              criarMutation.mutate(form);
            }} disabled={criarMutation.isPending}>
              Enviar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
