import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Send, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MOTIVOS = [
  "Demanda assistencial elevada",
  "Cobertura de plantão descoberto",
  "Finalização de procedimento em andamento",
  "Intercorrência com paciente",
  "Atraso na passagem de plantão",
  "Solicitação da coordenação",
  "Outro",
];

export function ExtensaoJornadaForm() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [userCargo, setUserCargo] = useState("");
  const [userSetor, setUserSetor] = useState("");
  const [dataExtensao, setDataExtensao] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, cargo, setor")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        setUserName(profile.full_name || "");
        setUserCargo(profile.cargo || "");
        setUserSetor(profile.setor || "");
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadHistorico();
  }, [userId]);

  const loadHistorico = async () => {
    setLoadingHistorico(true);
    const { data } = await supabase
      .from("justificativas_extensao_jornada")
      .select("*")
      .eq("colaborador_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistorico(data || []);
    setLoadingHistorico(false);
  };

  const calcMinutos = () => {
    if (!horaInicio || !horaFim) return 0;
    const [h1, m1] = horaInicio.split(":").map(Number);
    const [h2, m2] = horaFim.split(":").map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  const minutosExtras = calcMinutos();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataExtensao || !horaInicio || !horaFim || !motivo || !justificativa) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (minutosExtras <= 0) {
      toast({ title: "Hora fim deve ser posterior à hora início", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("justificativas_extensao_jornada").insert({
      colaborador_user_id: userId,
      colaborador_nome: userName,
      colaborador_cargo: userCargo,
      colaborador_setor: userSetor,
      data_extensao: dataExtensao,
      hora_inicio_extra: horaInicio,
      hora_fim_extra: horaFim,
      minutos_extras: minutosExtras,
      motivo,
      justificativa,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitação enviada!", description: "Aguarde a aprovação da coordenação de enfermagem." });
      setDataExtensao("");
      setHoraInicio("");
      setHoraFim("");
      setMotivo("");
      setJustificativa("");
      loadHistorico();
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  const formatMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") + "min" : ""}` : `${m}min`;
  };

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Solicitar Autorização de Extensão de Jornada
          </CardTitle>
          <CardDescription>
            Preencha os dados da extensão de jornada para aprovação da coordenação de enfermagem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Info do colaborador */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50">
              <div>
                <Label className="text-xs text-muted-foreground">Colaborador</Label>
                <p className="font-medium text-sm">{userName || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cargo</Label>
                <p className="font-medium text-sm">{userCargo || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Setor</Label>
                <p className="font-medium text-sm">{userSetor || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_extensao">Data da Extensão *</Label>
                <Input
                  id="data_extensao"
                  type="date"
                  value={dataExtensao}
                  onChange={e => setDataExtensao(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_inicio">Hora Início Extra *</Label>
                <Input
                  id="hora_inicio"
                  type="time"
                  value={horaInicio}
                  onChange={e => setHoraInicio(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_fim">Hora Fim Extra *</Label>
                <Input
                  id="hora_fim"
                  type="time"
                  value={horaFim}
                  onChange={e => setHoraFim(e.target.value)}
                  required
                />
              </div>
            </div>

            {minutosExtras > 0 && (
              <div className="flex items-center gap-2 p-2 rounded bg-primary/10 text-primary text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Tempo extra solicitado: <strong>{formatMin(minutosExtras)}</strong>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo *</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa Detalhada *</Label>
              <Textarea
                id="justificativa"
                placeholder="Descreva detalhadamente o motivo da extensão de jornada..."
                value={justificativa}
                onChange={e => setJustificativa(e.target.value)}
                rows={4}
                required
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">{justificativa.length}/1000</p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Solicitação
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Minhas Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistorico ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : historico.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhuma solicitação registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário Extra</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(item.data_extensao + "T12:00:00"), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {item.hora_inicio_extra} — {item.hora_fim_extra}
                      </TableCell>
                      <TableCell>{formatMin(item.minutos_extras)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.motivo}</TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {item.observacao_aprovador || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
