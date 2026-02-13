import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, FileText, Video, PlayCircle, CheckCircle2, Clock, Award, Eye, ChevronRight, Users, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Treinamento, Material, Inscricao } from "./types";
import QuizComponent from "./QuizComponent";

export default function PortalAluno() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [userSetor, setUserSetor] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [selectedMateriais, setSelectedMateriais] = useState<string | null>(null);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from("profiles").select("setor").eq("user_id", user.id).single();
        if (profile) setUserSetor(profile.setor);
      }
    };
    load();
  }, []);

  const { data: treinamentos = [] } = useQuery({
    queryKey: ["lms-treinamentos-aluno"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lms_treinamentos").select("*").in("status", ["planejado", "em_andamento", "realizado"]).order("data_limite");
      if (error) throw error;
      return data as Treinamento[];
    },
  });

  const { data: inscricoes = [] } = useQuery({
    queryKey: ["lms-inscricoes-aluno", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("lms_inscricoes").select("*").eq("usuario_id", userId);
      if (error) throw error;
      return data as Inscricao[];
    },
    enabled: !!userId,
  });

  const { data: materiais = [] } = useQuery({
    queryKey: ["lms-materiais-aluno", selectedMateriais],
    queryFn: async () => {
      if (!selectedMateriais) return [];
      const { data, error } = await supabase.from("lms_materiais").select("*").eq("treinamento_id", selectedMateriais).order("ordem");
      if (error) throw error;
      return data as Material[];
    },
    enabled: !!selectedMateriais,
  });

  // Filter trainings by user's sector - now uses exact match against official setores
  const filteredTreinamentos = treinamentos.filter(t => {
    if (!t.setores_alvo || t.setores_alvo.length === 0) return true;
    if (!userSetor) return true;
    return t.setores_alvo.some(s => s.toLowerCase() === userSetor.toLowerCase());
  });

  const enrollMutation = useMutation({
    mutationFn: async (treinamentoId: string) => {
      if (!userId) throw new Error("Not logged in");
      const { data: profile } = await supabase.from("profiles").select("full_name, setor").eq("user_id", userId).single();
      const { error } = await supabase.from("lms_inscricoes").insert({
        treinamento_id: treinamentoId,
        usuario_id: userId,
        usuario_nome: profile?.full_name || "Colaborador",
        setor: profile?.setor || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-inscricoes-aluno"] });
      toast({ title: "Inscrito com sucesso!" });
    },
    onError: (err: any) => {
      if (err?.message?.includes("duplicate")) toast({ title: "Você já está inscrito neste treinamento." });
      else toast({ title: "Erro ao se inscrever", variant: "destructive" });
    },
  });

  const markMaterialAccessedMutation = useMutation({
    mutationFn: async (treinamentoId: string) => {
      if (!userId) return;
      const inscricao = inscricoes.find(i => i.treinamento_id === treinamentoId);
      if (!inscricao || inscricao.material_acessado_em) return;
      const { error } = await supabase.from("lms_inscricoes").update({
        material_acessado_em: new Date().toISOString(),
        status: "material_acessado",
      }).eq("id", inscricao.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lms-inscricoes-aluno"] }),
  });

  const handleViewMaterial = async (material: Material) => {
    if (!material.url) return;
    try {
      const { data, error } = await supabase.storage
        .from("lms-materiais")
        .createSignedUrl(material.url, 3600);
      if (error) throw error;
      setViewingTitle(material.titulo);
      setViewingUrl(data.signedUrl);
    } catch {
      toast({ title: "Erro ao abrir material", variant: "destructive" });
    }
  };

  const getInscricao = (treinamentoId: string) => inscricoes.find(i => i.treinamento_id === treinamentoId);

  if (selectedQuiz) {
    const treinamento = treinamentos.find(t => t.id === selectedQuiz);
    const inscricao = getInscricao(selectedQuiz);
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedQuiz(null)}>← Voltar ao Portal</Button>
        {treinamento && inscricao && (
          <QuizComponent
            treinamento={treinamento}
            inscricaoId={inscricao.id}
            userId={userId!}
            onComplete={() => {
              setSelectedQuiz(null);
              queryClient.invalidateQueries({ queryKey: ["lms-inscricoes-aluno"] });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> Meus Treinamentos</h2>
        {userSetor && <Badge variant="outline" className="text-sm">Setor: {userSetor}</Badge>}
      </div>

      {filteredTreinamentos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum treinamento disponível para o seu setor.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTreinamentos.map(t => {
            const inscricao = getInscricao(t.id);
            const isInscrito = !!inscricao;
            const isCapacitado = inscricao?.status === "capacitado";
            const materialAcessado = !!inscricao?.material_acessado_em;
            const isSelected = selectedMateriais === t.id;

            return (
              <Card
                key={t.id}
                className={`transition-all hover:shadow-md cursor-pointer group ${isCapacitado ? "border-green-300 bg-green-50/30" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => {
                  if (isInscrito) {
                    setSelectedMateriais(isSelected ? null : t.id);
                    if (!isSelected) markMaterialAccessedMutation.mutate(t.id);
                  }
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-xs">{t.tipo_treinamento}</Badge>
                    <div className="flex items-center gap-1">
                      {isCapacitado && <Award className="h-5 w-5 text-green-500" />}
                      {isInscrito && !isCapacitado && <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : "group-hover:translate-x-0.5"}`} />}
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2 group-hover:text-primary transition-colors">{t.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {t.objetivo && <p className="text-xs text-muted-foreground line-clamp-2">{t.objetivo}</p>}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {t.instrutor && (
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {t.instrutor}</span>
                    )}
                    {t.setor_responsavel && (
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {t.setor_responsavel}</span>
                    )}
                    {t.data_limite && (
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {new Date(t.data_limite).toLocaleDateString("pt-BR")}</span>
                    )}
                    {t.carga_horaria && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.carga_horaria}</span>
                    )}
                  </div>

                  {isCapacitado && (
                    <div className="flex items-center gap-2 text-green-600 font-medium text-sm justify-center py-1 bg-green-50 rounded-md">
                      <CheckCircle2 className="h-4 w-4" /> Capacitado — Nota: {inscricao.nota}%
                    </div>
                  )}

                  {isInscrito && !isCapacitado && (
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant={materialAcessado ? "secondary" : "default"} className="text-xs">
                        {materialAcessado ? "✓ Material acessado" : "Clique para ver materiais"}
                      </Badge>
                      {materialAcessado && (
                        <Button
                          variant="default"
                          size="sm"
                          className="ml-auto text-xs h-7"
                          onClick={(e) => { e.stopPropagation(); setSelectedQuiz(t.id); }}
                        >
                          <Award className="h-3 w-3 mr-1" /> Avaliação
                        </Button>
                      )}
                    </div>
                  )}

                  {!isInscrito && (
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); enrollMutation.mutate(t.id); }}
                      disabled={enrollMutation.isPending}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" /> Iniciar Treinamento
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Materiais do treinamento selecionado */}
      {selectedMateriais && (() => {
        const treinamento = treinamentos.find(t => t.id === selectedMateriais);
        return (
          <Card className="mt-4 animate-in slide-in-from-top-2 duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">📚 Materiais — {treinamento?.titulo}</CardTitle>
                  <CardDescription className="text-xs mt-1">Visualize os materiais abaixo. Após acessar, a avaliação será liberada.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMateriais(null)}>Fechar</Button>
              </div>
            </CardHeader>
            <CardContent>
              {materiais.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum material disponível para este treinamento.</p>
              ) : (
                <div className="space-y-2">
                  {materiais.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      {m.tipo === "video" ? <Video className="h-5 w-5 text-destructive" /> : <FileText className="h-5 w-5 text-primary" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{m.titulo}</p>
                        {m.descricao && <p className="text-xs text-muted-foreground truncate">{m.descricao}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleViewMaterial(m)}>
                        <Eye className="h-4 w-4 mr-1" /> Abrir
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Internal viewer dialog */}
      <Dialog open={!!viewingUrl} onOpenChange={() => setViewingUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader><DialogTitle>{viewingTitle}</DialogTitle></DialogHeader>
          <div className="flex-1 h-full min-h-0">
            {viewingUrl && (
              <iframe
                src={viewingUrl}
                className="w-full h-[calc(80vh-80px)] rounded-lg border"
                title={viewingTitle}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
