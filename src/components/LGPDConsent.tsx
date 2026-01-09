import { useState, useEffect } from "react";
import { Shield, Cookie, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LGPDConsentProps {
  onAccept: () => void;
  onReject: () => void;
}

const LGPDConsent = ({ onAccept, onReject }: LGPDConsentProps) => {
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptCookies, setAcceptCookies] = useState(false);

  const canAccept = acceptTerms && acceptCookies;

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-lg [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Termo de Consentimento - LGPD</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), 
            solicitamos seu consentimento para continuar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Política de Privacidade */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-1">Política de Privacidade</h4>
                <p className="text-sm text-muted-foreground">
                  Coletamos e tratamos seus dados pessoais (nome, e-mail, informações de acesso) 
                  exclusivamente para fins operacionais do sistema UPA, em conformidade com a LGPD. 
                  Seus dados são protegidos e não serão compartilhados com terceiros sem seu consentimento.
                </p>
              </div>
            </div>
          </div>

          {/* Política de Cookies */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Cookie className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-1">Política de Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Utilizamos cookies essenciais para o funcionamento do sistema, 
                  incluindo autenticação e preferências de sessão. Esses cookies são 
                  necessários para garantir a segurança e funcionalidade da plataforma.
                </p>
              </div>
            </div>
          </div>

          {/* Checkboxes de aceite */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              />
              <label
                htmlFor="terms"
                className="text-sm text-foreground cursor-pointer leading-relaxed"
              >
                Li e aceito os <span className="text-primary font-medium">Termos de Uso</span> e a{" "}
                <span className="text-primary font-medium">Política de Privacidade</span> do UPA Sistema.
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="cookies"
                checked={acceptCookies}
                onCheckedChange={(checked) => setAcceptCookies(checked as boolean)}
              />
              <label
                htmlFor="cookies"
                className="text-sm text-foreground cursor-pointer leading-relaxed"
              >
                Aceito o uso de <span className="text-primary font-medium">cookies essenciais</span> para 
                o funcionamento adequado do sistema.
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onReject}
          >
            Recusar
          </Button>
          <Button
            className="flex-1"
            disabled={!canAccept}
            onClick={onAccept}
          >
            Aceitar e Continuar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Você pode revogar seu consentimento a qualquer momento através das configurações do sistema.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default LGPDConsent;
