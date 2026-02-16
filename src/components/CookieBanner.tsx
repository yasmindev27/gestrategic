import { useLGPDConsent } from "@/hooks/useLGPDConsent";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const CookieBanner = () => {
  const { consentStatus, isLoading, acceptConsent } = useLGPDConsent();

  if (isLoading || consentStatus !== "pending") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3">
        <Shield className="h-5 w-5 text-primary flex-shrink-0 hidden sm:block" />
        <p className="text-xs text-muted-foreground text-center sm:text-left flex-1">
          A Gstrategic utiliza cookies essenciais para garantir segurança, autenticação e a melhor experiência de uso. 
          Ao continuar, você concorda com nossa Política de Privacidade.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.open("https://gestrategic.lovable.app/politica-privacidade", "_blank")}>
            Saiba mais
          </Button>
          <Button size="sm" className="text-xs" onClick={acceptConsent}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
