import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, ClipboardX, FileText, UserCheck } from "lucide-react";
import { ControleFichasModule } from "./ControleFichasModule";

type RecepcaoView = "menu" | "controle-fichas";

export const RecepcaoModule = () => {
  const [currentView, setCurrentView] = useState<RecepcaoView>("menu");

  if (currentView === "controle-fichas") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setCurrentView("menu")} className="mb-2">
          ← Voltar à Recepção
        </Button>
        <ControleFichasModule />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Recepção
        </h2>
        <p className="text-muted-foreground">Gestão de atendimento e controle de fichas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => setCurrentView("controle-fichas")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
              <ClipboardX className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Controle de Fichas</CardTitle>
            <CardDescription>
              Cadastros inconsistentes e fichas com dados incompletos
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">
              Acessar Controle
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-60 cursor-not-allowed">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-muted rounded-full w-fit">
              <UserCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4 text-muted-foreground">Check-in Pacientes</CardTitle>
            <CardDescription>
              Registro de entrada de pacientes (em breve)
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full" disabled>
              Em Breve
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-60 cursor-not-allowed">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-muted rounded-full w-fit">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4 text-muted-foreground">Documentação</CardTitle>
            <CardDescription>
              Gestão de documentos e formulários (em breve)
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full" disabled>
              Em Breve
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
