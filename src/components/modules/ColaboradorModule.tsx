import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRound, FileText, Clock } from "lucide-react";
import { useLogAccess } from "@/hooks/useLogAccess";
import { JustificativaPontoSection } from "@/components/rhdp/JustificativaPontoSection";
import { ExtensaoJornadaForm } from "@/components/colaborador/ExtensaoJornadaForm";

const ColaboradorModule = () => {
  const { logAction } = useLogAccess();

  useEffect(() => {
    logAction("acesso_modulo", "colaborador");
  }, [logAction]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-6 w-6 text-primary" />
            Colaborador
          </CardTitle>
          <CardDescription>
            Área do colaborador — justificativas de ponto, extensão de jornada e formulários pessoais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="justificativa-ponto">
            <TabsList className="h-auto p-1 flex flex-wrap gap-1">
              <TabsTrigger value="justificativa-ponto" className="gap-2">
                <FileText className="h-4 w-4" />
                Justificativa de Ponto
              </TabsTrigger>
              <TabsTrigger value="extensao-jornada" className="gap-2">
                <Clock className="h-4 w-4" />
                Extensão de Jornada
              </TabsTrigger>
            </TabsList>
            <TabsContent value="justificativa-ponto" className="mt-4">
              <JustificativaPontoSection />
            </TabsContent>
            <TabsContent value="extensao-jornada" className="mt-4">
              <ExtensaoJornadaForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColaboradorModule;
