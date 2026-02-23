import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TURNOS = ["Diurno (07h-19h)", "Noturno (19h-07h)"];

export function PassagemPlantao() {
  const { toast } = useToast();
  const [passagens, setPassagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [turnoSaida, setTurnoSaida] = useState("");
  const [turnoEntrada, setTurnoEntrada] = useState("");
  const [relato, setRelato] = useState("");
  const [pontosAtencao, setPontosAtencao] = useState("");

  const fetchPassagens = async () => {
    const { data } = await supabase.from("seg_patrimonial_passagem_plantao").select("*").order("created_at", { ascending: false }).limit(30);
    if (data) setPassagens(data);
  };

  useEffect(() => { fetchPassagens(); }, []);

  const handleSubmit = async () => {
    if (!turnoSaida || !turnoEntrada || !relato) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();

    const { error } = await supabase.from("seg_patrimonial_passagem_plantao").insert({
      turno_saida: turnoSaida,
      turno_entrada: turnoEntrada,
      relato,
      pontos_atencao: pontosAtencao || null,
      usuario_saida_id: user.id,
      usuario_saida_nome: profile?.full_name || user.email || "Usuário",
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Passagem de plantão registrada!" });
      setTurnoSaida(""); setTurnoEntrada(""); setRelato(""); setPontosAtencao("");
      fetchPassagens();
    }
    setLoading(false);
  };

  const handleMarcarLido = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
    await supabase.from("seg_patrimonial_passagem_plantao").update({
      lido_por: user.id,
      lido_por_nome: profile?.full_name || user.email || "Usuário",
      lido_em: new Date().toISOString(),
    }).eq("id", id);
    toast({ title: "Marcado como lido" });
    fetchPassagens();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Registrar Passagem de Plantão</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Turno que sai *</Label>
              <Select value={turnoSaida} onValueChange={setTurnoSaida}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Turno que entra *</Label>
              <Select value={turnoEntrada} onValueChange={setTurnoEntrada}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Relato / Novidades *</Label>
            <Textarea value={relato} onChange={e => setRelato(e.target.value)} rows={5} placeholder="Ex: Paciente agitado no leito 4, ar-condicionado da recepção vazando, portão lateral com defeito..." />
          </div>
          <div>
            <Label>Pontos de Atenção</Label>
            <Textarea value={pontosAtencao} onChange={e => setPontosAtencao(e.target.value)} rows={3} placeholder="Itens que exigem atenção especial no próximo turno..." />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            <Send className="h-4 w-4 mr-2" /> Registrar Passagem
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Passagens</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {passagens.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma passagem registrada.</p>}
            {passagens.map(p => (
              <div key={p.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{p.usuario_saida_nome}</span>
                    <p className="text-xs text-muted-foreground">{p.turno_saida} → {p.turno_entrada}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    {p.lido_por ? (
                      <Badge variant="default"><Eye className="h-3 w-3 mr-1" />Lido por {p.lido_por_nome}</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleMarcarLido(p.id)}>
                        <Eye className="h-4 w-4 mr-1" /> Marcar Lido
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{p.relato}</p>
                {p.pontos_atencao && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">⚠ Pontos de Atenção:</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">{p.pontos_atencao}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
