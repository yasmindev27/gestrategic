import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ReportarIncidenteRapido } from "./ReportarIncidenteRapido";

interface ReportarIncidenteDialogProps {
  onSectionChange?: (section: string) => void;
}

export function ReportarIncidenteDialog({ onSectionChange }: ReportarIncidenteDialogProps) {
  const [reporteEnviado, setReporteEnviado] = useState(false);

  const handleIncidenteRegistrado = () => {
    setReporteEnviado(true);
  };

  if (reporteEnviado) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Obrigado pelo seu reporte!</h2>
                <p className="text-muted-foreground mt-2">
                  Sua notificação foi registrada com sucesso. A equipe de Qualidade/NSP analisará o caso.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setReporteEnviado(false)}
                >
                  Reportar outro incidente
                </Button>
                <Button onClick={() => onSectionChange?.("dashboard")}>
                  Voltar ao Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => onSectionChange?.("dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Reportar Incidente
          </h1>
          <p className="text-muted-foreground">
            Notifique quase-erros, incidentes ou eventos adversos de forma rápida e confidencial
          </p>
        </div>
      </div>

      {/* Form and Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReportarIncidenteRapido onIncidenteRegistrado={handleIncidenteRegistrado} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Por que reportar?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                <strong>Quase-erros</strong> são eventos que poderiam ter causado dano, 
                mas foram interceptados a tempo. Reportá-los ajuda a prevenir incidentes reais.
              </p>
              <p>
                <strong>Cultura justa:</strong> O objetivo não é punir, mas aprender. 
                Sua notificação é fundamental para a segurança de todos.
              </p>
              <p>
                <strong>Confidencialidade:</strong> Você pode reportar de forma anônima 
                se preferir.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-primary">Exemplos de Reportes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="p-2 bg-background rounded border">
                <p className="font-medium text-destructive">Equipamento</p>
                <p className="text-muted-foreground">Monitor cardíaco com falha intermitente</p>
              </div>
              <div className="p-2 bg-background rounded border">
                <p className="font-medium text-warning">Laudo</p>
                <p className="text-muted-foreground">Resultado de exame crítico atrasado</p>
              </div>
              <div className="p-2 bg-background rounded border">
                <p className="font-medium text-primary">Medicamento</p>
                <p className="text-muted-foreground">Dose quase administrada errada</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
