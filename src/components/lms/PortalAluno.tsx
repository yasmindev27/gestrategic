import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Video, PlayCircle, CheckCircle2, Clock, Award, ExternalLink } from "lucide-react";
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

  // Filter trainings by user's sector
  const filteredTreinamentos = treinamentos.filter(t => {
    if (!t.setores_alvo || t.setores_alvo.length === 0) return true;
    const alvoLower = t.setores_alvo.map(s => s.toLowerCase());
    if (alvoLower.includes("todos") || alvoLower.includes("todos os colaboradores")) return true;
    if (!userSetor) return true;
    const setorLower = userSetor.toLowerCase();
    return alvoLower.some(a => setorLower.includes(a) || a.includes(setorLower) ||
      a.includes("assistencial") || a.includes("administrativo") || a.includes("institucional"));
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

            return (
              <Card key={t.id} className={`transition-all hover:shadow-md ${isCapacitado ? "border-green-300 bg-green-50/30" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-xs">{t.tipo_treinamento}</Badge>
                    {isCapacitado && <Award className="h-5 w-5 text-green-500" />}
                  </div>
                  <CardTitle className="text-base mt-2">{t.titulo}</CardTitle>
                  <CardDescription className="text-xs line-clamp-3">{t.objetivo || "Sem descrição"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Instrutor:</strong> {t.instrutor || "—"}</p>
                    <p><strong>Setor:</strong> {t.setor_responsavel || "—"}</p>
                    {t.data_limite && <p><strong>Prazo:</strong> {new Date(t.data_limite).toLocaleDateString("pt-BR")}</p>}
                  </div>

                  {!isInscrito ? (
                    <Button className="w-full" onClick={() => enrollMutation.mutate(t.id)} disabled={enrollMutation.isPending}>
                      <PlayCircle className="h-4 w-4 mr-2" /> Iniciar Treinamento
                    </Button>
                  ) : isCapacitado ? (
                    <div className="flex items-center gap-2 text-green-600 font-medium text-sm justify-center py-2">
                      <CheckCircle2 className="h-5 w-5" /> Capacitado — Nota: {inscricao.nota}%
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Step 1: Access Material */}
                      <Button
                        variant={materialAcessado ? "outline" : "default"}
                        className="w-full"
                        size="sm"
                        onClick={() => {
                          setSelectedMateriais(t.id);
                          markMaterialAccessedMutation.mutate(t.id);
                        }}
                      >
                        {materialAcessado ? <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> : <FileText className="h-4 w-4 mr-2" />}
                        {materialAcessado ? "Material Acessado" : "Acessar Material"}
                      </Button>

                      {/* Step 2: Quiz */}
                      <Button
                        variant="default"
                        className="w-full"
                        size="sm"
                        disabled={!materialAcessado}
                        onClick={() => setSelectedQuiz(t.id)}
                      >
                        <Award className="h-4 w-4 mr-2" /> Fazer Avaliação
                      </Button>

                      {!materialAcessado && (
                        <p className="text-xs text-muted-foreground text-center flex items-center gap-1 justify-center">
                          <Clock className="h-3 w-3" /> Acesse o material para liberar a avaliação
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Material Viewer Dialog */}
      {selectedMateriais && (
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Materiais do Treinamento</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMateriais(null)}>Fechar</Button>
            </div>
          </CardHeader>
          <CardContent>
            {materiais.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum material disponível. O material foi marcado como acessado.</p>
            ) : (
              <div className="space-y-3">
                {materiais.map(m => (
                  <a key={m.id} href={m.url || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                    {m.tipo === "video" ? <Video className="h-5 w-5 text-red-500" /> : <FileText className="h-5 w-5 text-blue-500" />}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{m.titulo}</p>
                      {m.descricao && <p className="text-xs text-muted-foreground">{m.descricao}</p>}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
