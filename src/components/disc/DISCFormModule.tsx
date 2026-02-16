import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IdentificationData, LeadershipAnswer, DISCScores } from "@/types/disc";
import { DISC_QUESTIONS, BLOCK_TITLES, DISC_PROFILES } from "@/data/discQuestions";
import { IdentificationForm } from "@/components/disc/IdentificationForm";
import { DISCQuestionCard } from "@/components/disc/DISCQuestionCard";
import { LeadershipAssessment } from "@/components/disc/LeadershipAssessment";
import { ProgressBar } from "@/components/disc/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, CheckCircle, ClipboardList, BarChart3, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Step = "identification" | "disc" | "leadership" | "thankyou";

const PROFILE_COLORS: Record<string, string> = {
  D: "bg-red-500/15 text-red-700 border-red-300",
  I: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  S: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  C: "bg-blue-500/15 text-blue-700 border-blue-300",
};

const PROFILE_NAMES: Record<string, string> = {
  D: "Dominância",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

export function DISCFormModule() {
  const { toast } = useToast();
  const { userId } = useUserRole();
  const [activeTab, setActiveTab] = useState("formulario");
  const [step, setStep] = useState<Step>("identification");
  const [identification, setIdentification] = useState<IdentificationData | null>(null);
  const [discAnswers, setDiscAnswers] = useState<Record<number, 'a' | 'b' | 'c' | 'd'>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const clearAutoAdvance = () => {
    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  };

  // Query results
  const { data: results = [], refetch: refetchResults } = useQuery({
    queryKey: ['disc_results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disc_results')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleIdentificationSubmit = (data: IdentificationData) => {
    setIdentification(data);
    setStep("disc");
  };

  const handleDISCAnswer = (answer: 'a' | 'b' | 'c' | 'd') => {
    const questionId = DISC_QUESTIONS[currentQuestion].id;
    setDiscAnswers((prev) => ({ ...prev, [questionId]: answer }));
    clearAutoAdvance();
    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      setCurrentQuestion((prevIdx) => {
        if (prevIdx >= DISC_QUESTIONS.length - 1) {
          setStep("leadership");
          return prevIdx;
        }
        return prevIdx + 1;
      });
    }, 0);
  };

  const handleNextQuestion = () => {
    clearAutoAdvance();
    if (currentQuestion < DISC_QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setStep("leadership");
    }
  };

  const handlePrevQuestion = () => {
    clearAutoAdvance();
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    } else {
      setStep("identification");
    }
  };

  const calculateDISCScores = (): DISCScores => {
    const scores: DISCScores = { D: 0, I: 0, S: 0, C: 0 };
    Object.values(discAnswers).forEach((answer) => {
      if (answer === 'a') scores.D++;
      else if (answer === 'b') scores.I++;
      else if (answer === 'c') scores.C++;
      else if (answer === 'd') scores.S++;
    });
    return scores;
  };

  const handleLeadershipSubmit = async (answers: LeadershipAnswer[]) => {
    if (!identification) return;
    setIsSubmitting(true);
    try {
      const scores = calculateDISCScores();
      const leadershipScore = answers.reduce((sum, a) => sum + a.score, 0);
      const sortedProfiles = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .map(([letter]) => letter);

      const { error } = await supabase.from('disc_results').insert({
        nome_completo: identification.nomeCompleto,
        cargo_atual: identification.cargoAtual,
        setor: identification.setor === "Outro" ? identification.setorOutro : identification.setor,
        tempo_atuacao: identification.tempoAtuacao,
        formacao: identification.formacao,
        experiencia_lideranca: identification.experienciaLideranca,
        score_d: scores.D,
        score_i: scores.I,
        score_s: scores.S,
        score_c: scores.C,
        perfil_predominante: sortedProfiles[0],
        perfil_secundario: sortedProfiles[1],
        leadership_score: leadershipScore,
        created_by: userId,
      });

      if (error) throw error;
      setStep("thankyou");
      refetchResults();
    } catch (err: any) {
      toast({ title: "Erro", description: "Erro ao salvar resultados. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    clearAutoAdvance();
    setStep("identification");
    setIdentification(null);
    setDiscAnswers({});
    setCurrentQuestion(0);
  };

  const currentBlock = DISC_QUESTIONS[currentQuestion]?.block;

  // Stats
  const profileCounts = results.reduce((acc, r) => {
    acc[r.perfil_predominante] = (acc[r.perfil_predominante] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="formulario" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Formulário DISC
          </TabsTrigger>
          <TabsTrigger value="resultados" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Resultados ({results.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formulario" className="mt-4">
          {step === "disc" && (
            <div className="mb-6">
              <ProgressBar currentStep={currentQuestion + 1} totalSteps={DISC_QUESTIONS.length} blockTitles={BLOCK_TITLES} currentBlock={currentBlock} />
            </div>
          )}

          {step === "identification" && <IdentificationForm onSubmit={handleIdentificationSubmit} />}

          {step === "disc" && (
            <div className="space-y-6">
              <DISCQuestionCard
                question={DISC_QUESTIONS[currentQuestion]}
                selectedAnswer={discAnswers[DISC_QUESTIONS[currentQuestion].id]}
                onAnswer={handleDISCAnswer}
                questionNumber={currentQuestion + 1}
                totalQuestions={DISC_QUESTIONS.length}
              />
              <div className="flex justify-between gap-4 max-w-3xl mx-auto">
                <Button variant="outline" onClick={handlePrevQuestion}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
                </Button>
                <Button onClick={handleNextQuestion} disabled={!discAnswers[DISC_QUESTIONS[currentQuestion].id]}>
                  {currentQuestion < DISC_QUESTIONS.length - 1 ? "Próxima" : "Continuar"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === "leadership" && (
            <LeadershipAssessment onSubmit={handleLeadershipSubmit} onBack={() => setStep("disc")} isSubmitting={isSubmitting} />
          )}

          {step === "thankyou" && (
            <Card className="w-full max-w-2xl mx-auto text-center">
              <CardHeader className="pb-4">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-semibold">Obrigado por participar!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground text-lg">Sua avaliação DISC Liderança foi enviada com sucesso.</p>
                <p className="text-muted-foreground">Os resultados serão analisados pela coordenação para apoiar o desenvolvimento de lideranças na UPA.</p>
                <Button onClick={handleRestart} variant="outline" className="mt-6">Nova Avaliação</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resultados" className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(['D', 'I', 'S', 'C'] as const).map((letter) => {
              const profile = DISC_PROFILES.find(p => p.letter === letter);
              return (
                <Card key={letter}>
                  <CardContent className="p-4 text-center">
                    <Badge className={`${PROFILE_COLORS[letter]} text-lg px-3 py-1 mb-2`} variant="outline">{letter}</Badge>
                    <p className="text-2xl font-bold">{profileCounts[letter] || 0}</p>
                    <p className="text-xs text-muted-foreground">{profile?.name}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Results Table */}
          {results.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma avaliação registrada ainda.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead className="font-semibold">Nome</TableHead>
                      <TableHead className="font-semibold">Cargo</TableHead>
                      <TableHead className="font-semibold">Setor</TableHead>
                      <TableHead className="font-semibold">Perfil</TableHead>
                      <TableHead className="font-semibold">D</TableHead>
                      <TableHead className="font-semibold">I</TableHead>
                      <TableHead className="font-semibold">S</TableHead>
                      <TableHead className="font-semibold">C</TableHead>
                      <TableHead className="font-semibold">Liderança</TableHead>
                      <TableHead className="font-semibold">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.nome_completo}</TableCell>
                        <TableCell>{r.cargo_atual}</TableCell>
                        <TableCell>{r.setor}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge className={PROFILE_COLORS[r.perfil_predominante]} variant="outline">
                              {r.perfil_predominante}
                            </Badge>
                            <Badge className="bg-muted text-muted-foreground" variant="outline">
                              {r.perfil_secundario}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{r.score_d}</TableCell>
                        <TableCell>{r.score_i}</TableCell>
                        <TableCell>{r.score_s}</TableCell>
                        <TableCell>{r.score_c}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.leadership_score}/50</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
