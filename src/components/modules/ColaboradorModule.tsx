import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRound } from "lucide-react";
import { useLogAccess } from "@/hooks/useLogAccess";
import { JustificativaPontoSection } from "@/components/rhdp/JustificativaPontoSection";

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
            Área do colaborador — justificativas de ponto e formulários pessoais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JustificativaPontoSection />
        </CardContent>
      </Card>
    </div>
  );
};

export default ColaboradorModule;
