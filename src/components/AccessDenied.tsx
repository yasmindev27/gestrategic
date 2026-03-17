import { ShieldX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessDeniedProps {
  onTryAgain?: () => void;
}

const AccessDenied = ({ onTryAgain }: AccessDeniedProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não possui permissão para acessar este módulo.
            Entre em contato com o administrador caso necessite de acesso.
          </p>
        </div>

        <div className="bg-secondary/50 rounded-lg p-4 text-left">
          <h3 className="font-medium text-foreground mb-2">Por que isso é necessário?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Garantir a proteção dos seus dados pessoais</li>
            <li>• Cumprir as exigências legais da LGPD</li>
            <li>• Assegurar a segurança das informações do sistema</li>
          </ul>
        </div>

        <Button onClick={onTryAgain} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar e Aceitar os Termos
        </Button>
      </div>
    </div>
  );
};

export default AccessDenied;
