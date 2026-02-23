import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Construction, Plus, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPOS_DANO = ["Vidro quebrado", "Porta com defeito", "Equipamento danificado", "Parede danificada", "Infiltração/Vazamento", "Iluminação", "Mobiliário", "Outro"];
const URGENCIAS = [
  { value: "baixa", label: "Baixa", color: "bg-blue-100 text-blue-800" },
  { value: "media", label: "Média", color: "bg-yellow-100 text-yellow-800" },
  { value: "alta", label: "Alta", color: "bg-red-100 text-red-800" },
];

export function MapaDanos() {
  const { toast } = useToast();
  const [danos, setDanos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tipo_dano: "", local_dano: "", descricao: "", urgencia: "media" });

  const fetchDanos = async () => {
    const { data } = await supabase.from("seg_patrimonial_danos").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setDanos(data);
  };

  useEffect(() => { fetchDanos(); }, []);

  const handleSubmit = async () => {
    if (!form.tipo_dano || !form.local_dano || !form.descricao) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" }); return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();

    const { error } = await supabase.from("seg_patrimonial_danos").insert({
      ...form,
      registrado_por: user.id,
      registrado_por_nome: profile?.full_name || user.email || "Usuário",
      encaminhado_manutencao: true,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dano registrado!", description: "Alerta enviado para Manutenção/Administrativo." });
      setForm({ tipo_dano: "", local_dano: "", descricao: "", urgencia: "media" });
      setOpen(false);
      fetchDanos();
    }
    setLoading(false);
  };

  const handleMarcarResolvido = async (id: string) => {
    await supabase.from("seg_patrimonial_danos").update({ status: "resolvido", updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Dano marcado como resolvido" });
    fetchDanos();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Construction className="h-5 w-5" /> Mapa de Danos ao Patrimônio</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Registrar Dano</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Dano ao Patrimônio</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Dano *</Label>
                <Select value={form.tipo_dano} onValueChange={v => setForm(f => ({ ...f, tipo_dano: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{TIPOS_DANO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Local *</Label><Input value={form.local_dano} onChange={e => setForm(f => ({ ...f, local_dano: e.target.value }))} placeholder="Ex: Recepção - porta principal" /></div>
              <div><Label>Descrição *</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
              <div>
                <Label>Urgência</Label>
                <Select value={form.urgencia} onValueChange={v => setForm(f => ({ ...f, urgencia: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{URGENCIAS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full">Registrar e Alertar Manutenção</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {danos.length === 0 && <p className="text-muted-foreground text-sm col-span-2">Nenhum dano registrado.</p>}
        {danos.map(d => {
          const urg = URGENCIAS.find(u => u.value === d.urgencia);
          return (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{d.tipo_dano}</span>
                  <div className="flex gap-1">
                    <Badge className={urg?.color || ""}>{urg?.label}</Badge>
                    <Badge variant={d.status === "resolvido" ? "default" : "secondary"}>{d.status}</Badge>
                  </div>
                </div>
                <p className="text-sm">{d.local_dano}</p>
                <p className="text-xs text-muted-foreground">{d.descricao}</p>
                <p className="text-xs text-muted-foreground">{d.registrado_por_nome} — {format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                {d.encaminhado_manutencao && <Badge variant="outline" className="text-xs"><Wrench className="h-3 w-3 mr-1" />Encaminhado à Manutenção</Badge>}
                {d.status !== "resolvido" && (
                  <Button size="sm" variant="outline" onClick={() => handleMarcarResolvido(d.id)} className="w-full mt-2">Marcar Resolvido</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
