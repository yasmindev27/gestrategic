import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, LogOut, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ControleVisitantes() {
  const { toast } = useToast();
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome_visitante: "", documento: "", paciente_nome: "", numero_prontuario: "", setor_leito: "", parentesco: "" });

  const fetchVisitantes = async () => {
    const { data } = await supabase.from("seg_patrimonial_visitantes").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) setVisitantes(data);
  };

  useEffect(() => { fetchVisitantes(); }, []);

  const handleRegistrar = async () => {
    if (!form.nome_visitante || !form.paciente_nome || !form.setor_leito) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();

    const { error } = await supabase.from("seg_patrimonial_visitantes").insert({
      ...form,
      numero_prontuario: form.numero_prontuario || null,
      documento: form.documento || null,
      parentesco: form.parentesco || null,
      registrado_por: user.id,
      registrado_por_nome: profile?.full_name || user.email || "Usuário",
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Visitante registrado!" });
      setForm({ nome_visitante: "", documento: "", paciente_nome: "", numero_prontuario: "", setor_leito: "", parentesco: "" });
      setOpen(false);
      fetchVisitantes();
    }
    setLoading(false);
  };

  const handleSaida = async (id: string) => {
    await supabase.from("seg_patrimonial_visitantes").update({ hora_saida: new Date().toISOString() }).eq("id", id);
    toast({ title: "Saída registrada" });
    fetchVisitantes();
  };

  const presentes = visitantes.filter(v => !v.hora_saida);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Controle de Visitantes</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" /> Registrar Entrada</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastro de Visitante</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome do Visitante *</Label><Input value={form.nome_visitante} onChange={e => setForm(f => ({ ...f, nome_visitante: e.target.value }))} /></div>
              <div><Label>Documento (RG/CPF)</Label><Input value={form.documento} onChange={e => setForm(f => ({ ...f, documento: e.target.value }))} /></div>
              <div><Label>Paciente Vinculado *</Label><Input value={form.paciente_nome} onChange={e => setForm(f => ({ ...f, paciente_nome: e.target.value }))} /></div>
              <div><Label>Nº Prontuário</Label><Input value={form.numero_prontuario} onChange={e => setForm(f => ({ ...f, numero_prontuario: e.target.value }))} /></div>
              <div><Label>Setor / Leito *</Label><Input value={form.setor_leito} onChange={e => setForm(f => ({ ...f, setor_leito: e.target.value }))} placeholder="Ex: Obs. Adulto - Leito 3" /></div>
              <div><Label>Parentesco</Label><Input value={form.parentesco} onChange={e => setForm(f => ({ ...f, parentesco: e.target.value }))} /></div>
              <Button onClick={handleRegistrar} disabled={loading} className="w-full">Registrar Entrada</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {presentes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Visitantes Presentes ({presentes.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {presentes.map(v => (
                <div key={v.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm">{v.nome_visitante}</p>
                    <p className="text-xs text-muted-foreground">Paciente: {v.paciente_nome} — {v.setor_leito}</p>
                    <p className="text-xs text-muted-foreground">Entrada: {format(new Date(v.hora_entrada), "HH:mm", { locale: ptBR })}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleSaida(v.id)}>
                    <LogOut className="h-4 w-4 mr-1" /> Saída
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {visitantes.filter(v => v.hora_saida).slice(0, 30).map(v => (
              <div key={v.id} className="border rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{v.nome_visitante}</span>
                  <Badge variant="secondary">Saiu</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Paciente: {v.paciente_nome} — {v.setor_leito}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(v.hora_entrada), "dd/MM HH:mm")} → {format(new Date(v.hora_saida), "HH:mm")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
