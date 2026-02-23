import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SETORES_CRITICOS = [
  "Recepção", "Sala de Medicação", "Sala de Emergência", "Observação Adulto",
  "Observação Pediátrica", "Consultórios", "Farmácia", "Laboratório",
  "Raio-X", "Expurgo", "Estacionamento", "Perímetro Externo", "Almoxarifado"
];

export function RondasPatrimoniais() {
  const { toast } = useToast();
  const [rondas, setRondas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [setor, setSetor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [infraOk, setInfraOk] = useState(true);
  const [detalhesInfra, setDetalhesInfra] = useState("");

  const fetchRondas = async () => {
    const { data } = await supabase
      .from("seg_patrimonial_rondas")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setRondas(data);
  };

  useEffect(() => { fetchRondas(); }, []);

  const handleCheckin = async () => {
    if (!setor) { toast({ title: "Selecione o setor", variant: "destructive" }); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();

    const { error } = await supabase.from("seg_patrimonial_rondas").insert({
      setor,
      observacoes: observacoes || null,
      infraestrutura_ok: infraOk,
      detalhes_infraestrutura: !infraOk ? detalhesInfra : null,
      usuario_id: user.id,
      usuario_nome: profile?.full_name || user.email || "Usuário",
    });

    if (error) {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check-in registrado!", description: `Ronda em ${setor} registrada.` });
      setSetor(""); setObservacoes(""); setInfraOk(true); setDetalhesInfra("");
      fetchRondas();
    }
    setLoading(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Check-in de Ronda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Setor *</Label>
            <Select value={setor} onValueChange={setSetor}>
              <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
              <SelectContent>
                {SETORES_CRITICOS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={infraOk} onCheckedChange={setInfraOk} />
            <Label>Infraestrutura OK?</Label>
          </div>
          {!infraOk && (
            <div>
              <Label>Detalhes do problema</Label>
              <Textarea value={detalhesInfra} onChange={e => setDetalhesInfra(e.target.value)} placeholder="Descreva o problema encontrado..." />
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações da ronda..." />
          </div>
          <Button onClick={handleCheckin} disabled={loading} className="w-full">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Registrar Check-in
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Histórico de Rondas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {rondas.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma ronda registrada.</p>}
            {rondas.map(r => (
              <div key={r.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.setor}</span>
                  <Badge variant={r.infraestrutura_ok ? "default" : "destructive"}>
                    {r.infraestrutura_ok ? "OK" : <><AlertTriangle className="h-3 w-3 mr-1" />Problema</>}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.usuario_nome} — {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                {r.observacoes && <p className="text-xs">{r.observacoes}</p>}
                {r.detalhes_infraestrutura && <p className="text-xs text-destructive">{r.detalhes_infraestrutura}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
