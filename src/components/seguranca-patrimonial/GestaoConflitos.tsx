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
import { ShieldAlert, Plus, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const GRAUS = [
  { value: "baixo", label: "Baixo", color: "bg-yellow-100 text-yellow-800" },
  { value: "medio", label: "Médio", color: "bg-orange-100 text-orange-800" },
  { value: "alto", label: "Alto", color: "bg-red-100 text-red-800" },
];

export function GestaoConflitos() {
  const { toast } = useToast();
  const [conflitos, setConflitos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome_envolvido: "", setor: "", grau_agressividade: "baixo", descricao: "", desfecho: "" });

  const fetchConflitos = async () => {
    const { data } = await supabase.from("seg_patrimonial_conflitos").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setConflitos(data);
  };

  useEffect(() => { fetchConflitos(); }, []);

  const handleSubmit = async () => {
    if (!form.nome_envolvido || !form.setor || !form.descricao) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();

    const { error } = await supabase.from("seg_patrimonial_conflitos").insert({
      ...form,
      registrado_por: user.id,
      registrado_por_nome: profile?.full_name || user.email || "Usuário",
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ocorrência registrada!" });
      setForm({ nome_envolvido: "", setor: "", grau_agressividade: "baixo", descricao: "", desfecho: "" });
      setOpen(false);
      fetchConflitos();
    }
    setLoading(false);
  };

  const handleResolver = async (id: string) => {
    const desfecho = prompt("Descreva o desfecho da mediação:");
    if (!desfecho) return;
    await supabase.from("seg_patrimonial_conflitos").update({ status: "resolvido", desfecho, updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Conflito marcado como resolvido" });
    fetchConflitos();
  };

  const grauBadge = (grau: string) => {
    const g = GRAUS.find(g => g.value === grau);
    return <Badge className={g?.color || ""}>{g?.label || grau}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Mediação de Conflitos</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nova Ocorrência</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Conflito</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome do Envolvido *</Label><Input value={form.nome_envolvido} onChange={e => setForm(f => ({ ...f, nome_envolvido: e.target.value }))} /></div>
              <div><Label>Setor *</Label><Input value={form.setor} onChange={e => setForm(f => ({ ...f, setor: e.target.value }))} /></div>
              <div>
                <Label>Grau de Agressividade *</Label>
                <Select value={form.grau_agressividade} onValueChange={v => setForm(f => ({ ...f, grau_agressividade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRAUS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Descrição *</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
              <div><Label>Desfecho (se já resolvido)</Label><Textarea value={form.desfecho} onChange={e => setForm(f => ({ ...f, desfecho: e.target.value }))} /></div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full">Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {conflitos.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma ocorrência registrada.</p>}
        {conflitos.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.nome_envolvido}</span>
                    {grauBadge(c.grau_agressividade)}
                    <Badge variant={c.status === "resolvido" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.setor} — {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  <p className="text-sm">{c.descricao}</p>
                  {c.desfecho && <p className="text-sm text-green-700 dark:text-green-400">Desfecho: {c.desfecho}</p>}
                  <p className="text-xs text-muted-foreground">Registrado por: {c.registrado_por_nome}</p>
                </div>
                {c.status !== "resolvido" && (
                  <Button size="sm" variant="outline" onClick={() => handleResolver(c.id)}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Resolver
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
