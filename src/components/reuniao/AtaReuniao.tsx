import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Download, Loader2, Sparkles, CheckCircle, ListTodo,
  ClipboardList, Users, Clock, Pencil, Save, X,
} from "lucide-react";
import { createStandardPdf, savePdfWithFooter } from "@/lib/export-utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AtaReuniaoProps {
  reuniaoId: string;
  transcricao: string;
  titulo?: string;
  isHost?: boolean;
  onBack: () => void;
}

interface AtaData {
  resumo_executivo: string;
  decisoes_tomadas: string[];
  plano_acao: { tarefa: string; responsavel: string; prazo: string }[];
}

interface ReuniaoMeta {
  participantesNomes: string[];
  horaInicio: string | null;
  horaEncerramento: string | null;
  criadorNome: string;
}

const AtaReuniao = ({ reuniaoId, transcricao, titulo = "Reunião", isHost = false, onBack }: AtaReuniaoProps) => {
  const { toast } = useToast();
  const [ata, setAta] = useState<AtaData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editAta, setEditAta] = useState<AtaData | null>(null);
  const [meta, setMeta] = useState<ReuniaoMeta>({
    participantesNomes: [],
    horaInicio: null,
    horaEncerramento: null,
    criadorNome: "",
  });

  // Load meeting metadata (participants names, times)
  useEffect(() => {
    const loadMeta = async () => {
      const { data: reuniao } = await supabase
        .from("reunioes")
        .select("participantes, criado_por, ata_gerada, hora_inicio, hora_encerramento" as any)
        .eq("id", reuniaoId)
        .single();

      if (!reuniao) return;

      const r = reuniao as any;

      // Load saved ata if exists
      if (r.ata_gerada && !ata) {
        setAta(r.ata_gerada as AtaData);
      }

      // Resolve participant names
      const participantIds: string[] = r.participantes || [];
      const allIds = [...new Set([r.criado_por, ...participantIds])];

      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", allIds);

        const nameMap = new Map(profiles?.map((p) => [p.user_id, p.full_name || "Sem nome"]) || []);

        setMeta({
          participantesNomes: allIds.map((id) => nameMap.get(id) || "Desconhecido"),
          horaInicio: r.hora_inicio || r.created_at || null,
          horaEncerramento: r.hora_encerramento || null,
          criadorNome: nameMap.get(r.criado_por) || "Desconhecido",
        });
      }
    };
    loadMeta();
  }, [reuniaoId]);

  const generateAta = async () => {
    if (!transcricao.trim()) {
      toast({ title: "Aviso", description: "Nenhuma transcrição disponível para gerar a ata.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-ata-reuniao", {
        body: { transcricao, titulo, reuniaoId },
      });

      if (error) throw error;

      const ataResult: AtaData = data.ata;
      setAta(ataResult);

      await supabase.from("reunioes").update({ ata_gerada: ataResult as any }).eq("id", reuniaoId);
      toast({ title: "Ata gerada", description: "A ata da reunião foi gerada com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao gerar ata.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = () => {
    if (ata) {
      setEditAta(JSON.parse(JSON.stringify(ata)));
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setEditAta(null);
    setIsEditing(false);
  };

  const saveEditing = async () => {
    if (!editAta) return;
    try {
      await supabase.from("reunioes").update({ ata_gerada: editAta as any }).eq("id", reuniaoId);
      setAta(editAta);
      setIsEditing(false);
      setEditAta(null);
      toast({ title: "Ata atualizada", description: "As alterações foram salvas." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const currentAta = isEditing ? editAta! : ata;

  const exportPdf = async () => {
    if (!ata) return;

    const { doc, logoImg } = await createStandardPdf(`Ata - ${titulo}`);
    let y = 35;

    // Meeting info
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Início: ${formatTime(meta.horaInicio)}`, 14, y);
    y += 5;
    doc.text(`Encerramento: ${formatTime(meta.horaEncerramento)}`, 14, y);
    y += 5;
    doc.text(`Organizador: ${meta.criadorNome}`, 14, y);
    y += 5;
    doc.text(`Participantes: ${meta.participantesNomes.join(", ")}`, 14, y);
    y += 10;

    // Resumo Executivo
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Executivo", 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const resumoLines = doc.splitTextToSize(ata.resumo_executivo, 180);
    doc.text(resumoLines, 14, y);
    y += resumoLines.length * 4.5 + 8;

    // Decisões Tomadas
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Decisões Tomadas", 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    ata.decisoes_tomadas.forEach((d, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${d}`, 175);
      doc.text(lines, 16, y);
      y += lines.length * 4.5 + 2;
    });
    y += 6;

    // Plano de Ação
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Plano de Ação", 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    ata.plano_acao.forEach((item, i) => {
      const text = `${i + 1}. ${item.tarefa} — Responsável: ${item.responsavel} | Prazo: ${item.prazo}`;
      const lines = doc.splitTextToSize(text, 175);
      doc.text(lines, 16, y);
      y += lines.length * 4.5 + 2;
    });

    savePdfWithFooter(doc, `Ata - ${titulo}`, `ata_reuniao_${reuniaoId.slice(0, 8)}`, logoImg);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Ata da Reunião</h2>
            <p className="text-sm text-muted-foreground">{titulo}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>

      {/* Meeting Metadata Card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">Início: </span>
                <span className="text-foreground font-medium">{formatTime(meta.horaInicio)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">Encerramento: </span>
                <span className="text-foreground font-medium">{formatTime(meta.horaEncerramento)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-muted-foreground">Participantes: </span>
              <span className="text-foreground">{meta.participantesNomes.length > 0 ? meta.participantesNomes.join(", ") : "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {!currentAta ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Gerar Ata com IA</h3>
              <p className="text-sm text-muted-foreground mt-1">
                A inteligência artificial processará a transcrição e gerará um relatório estruturado.
              </p>
            </div>
            <Button onClick={generateAta} disabled={isGenerating} size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando ata...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Gerar Ata
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Edit / Save controls for host */}
          {isHost && (
            <div className="flex justify-end gap-2">
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar Ata
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={cancelEditing}>
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveEditing}>
                    <Save className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                </>
              )}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Resumo Executivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editAta!.resumo_executivo}
                  onChange={(e) => setEditAta({ ...editAta!, resumo_executivo: e.target.value })}
                  rows={5}
                />
              ) : (
                <p className="text-sm text-foreground leading-relaxed">{currentAta.resumo_executivo}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Decisões Tomadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  {editAta!.decisoes_tomadas.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <Input
                        value={d}
                        onChange={(e) => {
                          const updated = [...editAta!.decisoes_tomadas];
                          updated[i] = e.target.value;
                          setEditAta({ ...editAta!, decisoes_tomadas: updated });
                        }}
                      />
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"
                        onClick={() => {
                          const updated = editAta!.decisoes_tomadas.filter((_, idx) => idx !== i);
                          setEditAta({ ...editAta!, decisoes_tomadas: updated });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setEditAta({ ...editAta!, decisoes_tomadas: [...editAta!.decisoes_tomadas, ""] })}>
                    + Adicionar decisão
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {currentAta.decisoes_tomadas.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="bg-primary/10 text-primary rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-foreground">{d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ListTodo className="h-4 w-4" /> Plano de Ação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  {editAta!.plano_acao.map((item, i) => (
                    <div key={i} className="bg-muted/50 p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Ação {i + 1}</span>
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => {
                            const updated = editAta!.plano_acao.filter((_, idx) => idx !== i);
                            setEditAta({ ...editAta!, plano_acao: updated });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Tarefa"
                        value={item.tarefa}
                        onChange={(e) => {
                          const updated = [...editAta!.plano_acao];
                          updated[i] = { ...updated[i], tarefa: e.target.value };
                          setEditAta({ ...editAta!, plano_acao: updated });
                        }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Responsável"
                          value={item.responsavel}
                          onChange={(e) => {
                            const updated = [...editAta!.plano_acao];
                            updated[i] = { ...updated[i], responsavel: e.target.value };
                            setEditAta({ ...editAta!, plano_acao: updated });
                          }}
                        />
                        <Input
                          placeholder="Prazo"
                          value={item.prazo}
                          onChange={(e) => {
                            const updated = [...editAta!.plano_acao];
                            updated[i] = { ...updated[i], prazo: e.target.value };
                            setEditAta({ ...editAta!, plano_acao: updated });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setEditAta({ ...editAta!, plano_acao: [...editAta!.plano_acao, { tarefa: "", responsavel: "", prazo: "" }] })}>
                    + Adicionar ação
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentAta.plano_acao.map((item, i) => (
                    <div key={i} className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-foreground">{item.tarefa}</p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Responsável: {item.responsavel}</span>
                        <span>Prazo: {item.prazo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={exportPdf} className="w-full" variant="outline">
            <Download className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
        </>
      )}
    </div>
  );
};

export default AtaReuniao;
